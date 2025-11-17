import { hash, compare } from 'bcrypt';
import { RolesEnum } from '../enums/RolesEnums';
import { uid } from 'uid';
import moment from 'moment';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/plugins/error.plugin';
import { VerifyEmailTemplate } from '@/emails/verify-email';
import { render } from '@react-email/render';
import type { Resend } from 'resend';
import type Stripe from 'stripe';
import type { Session } from 'neo4j-driver';

/**
 * Authentication Service Dependencies
 *
 * This interface defines all external dependencies required by auth service functions.
 * Dependencies are injected to make the service context-free and testable.
 */
export interface AuthServiceDeps {
  /** Auth plugin instance for JWT operations */
  auth: {
    signAccessToken: (
      userId: string
    ) => Promise<{ token: string; expiresIn: string; maxAgeSeconds: number }>;
    signRefreshToken: (
      userId: string
    ) => Promise<{ token: string; expiresIn: string; maxAgeSeconds: number }>;
    signEmailToken: (
      userId: string
    ) => Promise<{ token: string; expiresIn: string; maxAgeSeconds: number }>;
    createCookie: (tokenData: {
      token: string;
      expiresIn: string;
      maxAgeSeconds: number;
    }) => string;
  };
  /** Neo4j plugin instance for database operations (optional for refreshToken) */
  neo4j?: {
    withSession: <T>(fn: (session: Session) => Promise<T>) => Promise<T>;
  };
  /** Optional structured logger instance */
  log?: any;
  /** Stripe client instance (required for signup) */
  stripe?: Stripe;
  /** Resend client instance (required for email sending) */
  resend?: Resend;
}

/**
 * Token Data Interface
 * Response structure for token-related operations
 */
export interface TokenData {
  token: string;
  expiresIn: string;
  maxAgeSeconds: number;
}

/**
 * Signup Response Interface
 * Response structure for successful signup operation
 */
export interface SignupResponse {
  tokenData: TokenData;
  data: {
    id: string;
    name: string;
    email: string;
    userName: string;
    avatar: string;
    confirmed: boolean;
    verified: boolean;
    desactivated: boolean;
    createdAt: string;
    followers: number;
    followings: number;
    phone?: string;
  };
  role: string;
}

/**
 * Login Response Interface
 * Response structure for successful login operation
 */
export interface LoginResponse {
  tokenData: TokenData;
  data: {
    id: string;
    name: string;
    email: string;
    userName: string;
    avatar: string;
    confirmed: boolean;
    verified: boolean;
    desactivated: boolean;
    createdAt: string;
    followers: number;
    followings: number;
    phone?: string;
  };
  role: string;
}

/**
 * Signup Service Function
 *
 * Handles user registration for both Buyer and Seller roles.
 * Creates Stripe customer, Neo4j user node, wallet, and subscription plans.
 * Sends verification email via Resend + React Email.
 *
 * @param userData - User registration data validated by SignupSchema
 * @param deps - Injected dependencies (auth, neo4j, stripe, resend, log)
 * @returns Promise resolving to signup response with tokenData, user data, and role
 * @throws {BadRequestError} - Missing required fields
 * @throws {ConflictError} - Email already exists
 * @throws {InternalServerError} - Database, Stripe, or email sending failures
 *
 * @migration
 * - Replaced multiple sessions with withSession helper (proper session management)
 * - Replaced nodemailer with Resend + React Email
 * - Replaced manual JWT signing with auth plugin helpers
 * - Replaced return { message } pattern with throwing errors
 * - Added proper error handling with custom error classes
 * - Consolidated Stripe and database operations within try-catch
 */
export async function signup(userData: any, deps: AuthServiceDeps): Promise<SignupResponse> {
  const { auth, neo4j, log, stripe, resend } = deps;

  // Validate input
  if (!userData?.data) {
    throw new BadRequestError('userData is empty');
  }

  if (!stripe) {
    throw new InternalServerError('Stripe client not available');
  }

  if (!resend) {
    throw new InternalServerError('Resend client not available');
  }

  // Validate Stripe configuration
  if (!process.env.STRIPE_TEST_KEY) {
    throw new InternalServerError(
      'STRIPE_TEST_KEY environment variable is not set. ' +
        'Please add it to your .env file. ' +
        'Get your API key from: https://dashboard.stripe.com/apikeys'
    );
  }

  // Validate Resend configuration
  if (!process.env.RESEND_API_KEY) {
    throw new InternalServerError(
      'RESEND_API_KEY environment variable is not set. ' +
        'Please add it to your .env file. ' +
        'Get your API key from: https://resend.com/api-keys'
    );
  }

  const email = userData.data.email;
  const role = userData.data.role;

  if (!neo4j) {
    throw new InternalServerError('Neo4j database client not available');
  }

  try {
    // Check if user already exists
    const existingUser = await neo4j.withSession(async (session: Session) => {
      const result = await session.executeRead((tx) =>
        tx.run('MATCH (u:user {email: $email}) RETURN u', { email })
      );
      return result.records.length > 0;
    });

    if (existingUser) {
      throw new ConflictError(`This email ${email} already exists`);
    }

    // Validate required fields
    if (!userData.data.name || !userData.data.userName || !userData.data.password) {
      throw new BadRequestError('Missing required fields: name, userName, or password');
    }

    // Hash password
    const hashedPassword = await hash(userData.data.password, 10);

    // Role-specific signup logic
    if (role === RolesEnum.SELLER) {
      return await signupSeller(userData, hashedPassword, email, {
        auth,
        neo4j,
        log,
        stripe,
        resend,
      });
    } else if (role === RolesEnum.BUYER) {
      return await signupBuyer(userData, hashedPassword, email, {
        auth,
        neo4j,
        log,
        stripe,
        resend,
      });
    } else {
      throw new BadRequestError('Invalid role specified');
    }
  } catch (error) {
    log?.error({ error, email }, 'Signup failed');

    // Re-throw custom errors
    if (
      error instanceof BadRequestError ||
      error instanceof ConflictError ||
      error instanceof InternalServerError
    ) {
      throw error;
    }

    // Wrap unexpected errors
    throw new InternalServerError(
      `Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Signup Seller Helper Function
 *
 * Handles seller-specific signup logic including plan creation
 */
async function signupSeller(
  userData: any,
  hashedPassword: string,
  email: string,
  deps: AuthServiceDeps
): Promise<SignupResponse> {
  const { auth, neo4j, log, stripe, resend } = deps;

  // Validate seller-specific fields
  if (!userData.data.phone || !userData.data.plans || userData.data.plans.length === 0) {
    throw new BadRequestError('Seller signup requires phone and at least one plan');
  }

  try {
    // Create Stripe customer
    const sellerCustomer = await stripe!.customers.create({
      name: userData.data.name,
      email: email,
      balance: 0,
    });

    // Create seller user in Neo4j with wallet
    if (!neo4j) {
      throw new InternalServerError('Neo4j client is not available');
    }
    const userRecord = await neo4j.withSession(async (session: Session) => {
      // Create user, seller, device token, and wallet in single transaction
      const createUserResult = await session.executeWrite((tx) =>
        tx.run(
          `CREATE (u:user {
            id: $userId,
            name: $name,
            email: $email,
            userName: $userName,
            avatar: "",
            password: $password,
            createdAt: $createdAt,
            confirmed: false,
            verified: false,
            desactivated: false,
            phone: $phone,
            followers: $followers,
            followings: $followings
          })-[:IS_A]->(s:seller {id: $sellerId, verified: $verified})
          CREATE (d:deviceToken {token: $token})<-[:logged_in_with]-(u)
          CREATE (s)-[:HAS_A]->(:wallet {id: $walletId, amount: 0.0})
          RETURN u, s`,
          {
            userId: sellerCustomer.id,
            followers: 0,
            followings: 0,
            token: userData.data.deviceToken,
            createdAt: moment().format('MMMM DD, YYYY'),
            email: email,
            userName: userData.data.userName,
            name: userData.data.name,
            password: hashedPassword,
            sellerId: uid(40),
            verified: false,
            phone: userData.data.phone,
            walletId: uid(40),
          }
        )
      );

      return createUserResult.records[0];
    });

    if (!userRecord) {
      throw new InternalServerError('Failed to create user and seller in Neo4j');
    }

    const sellerId = userRecord.get('s')?.properties?.id;
    const userProperties = userRecord.get('u')?.properties;

    if (!sellerId || !userProperties) {
      throw new InternalServerError('Incomplete user or seller record returned from Neo4j');
    }

    // Create Stripe products and plans in parallel
    await Promise.all(
      userData.data.plans.map(async (plan: any) => {
        try {
          const stripeProduct = await stripe!.products.create({
            name: plan.name,
          });

          // Calculate unit amount as integer (Stripe requires cents as integer)
          const unitAmount = Math.round(plan.price * 100);

          const stripePrice = await stripe!.prices.create({
            currency: 'EUR',
            product: stripeProduct.id,
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
            unit_amount: unitAmount,
          });

          // Create plan in Neo4j
          await neo4j.withSession(async (session: Session) => {
            await session.executeWrite((tx) =>
              tx.run(
                'MATCH (s:seller {id: $sellerId}) CREATE (s)-[:HAS_A]->(:plan {id: $planId, name: $name, price: $price})',
                {
                  sellerId: sellerId,
                  planId: stripePrice.id,
                  name: plan.name,
                  price: plan.price,
                }
              )
            );
          });
        } catch (error) {
          log?.error({ error, planName: plan.name }, 'Failed to create plan');
          throw new InternalServerError(`Failed to create plan: ${plan.name}`);
        }
      })
    );

    // Generate email verification token (48 hour expiry)
    const tokenData = await auth.signEmailToken(userProperties.id);

    // Send verification email
    await sendVerificationEmail(email, userData.data.userName, tokenData.token, 'selling', resend!);

    log?.info({ userId: userProperties.id, role: 'Seller' }, 'Seller signup successful');

    return {
      tokenData,
      data: {
        avatar: userProperties.avatar,
        confirmed: userProperties.confirmed,
        createdAt: userProperties.createdAt,
        verified: userProperties.verified,
        desactivated: userProperties.desactivated,
        email: userProperties.email,
        followers: userProperties.followers,
        followings: userProperties.followings,
        id: userProperties.id,
        name: userProperties.name,
        phone: userProperties.phone,
        userName: userProperties.userName,
      },
      role: 'Seller',
    };
  } catch (error) {
    log?.error({ error, email }, 'Seller signup failed');
    throw error;
  }
}

/**
 * Signup Buyer Helper Function
 *
 * Handles buyer-specific signup logic
 */
async function signupBuyer(
  userData: any,
  hashedPassword: string,
  email: string,
  deps: AuthServiceDeps
): Promise<SignupResponse> {
  const { auth, neo4j, log, stripe, resend } = deps;

  try {
    // Create Stripe customer
    const buyer = await stripe!.customers.create({
      name: userData.data.name,
      email: email,
      balance: 0,
    });

    if (!neo4j) {
      throw new Error('Neo4j instance is undefined');
    }

    // Create buyer user in Neo4j
    const userRecord = await neo4j.withSession(async (session: Session) => {
      const result = await session.executeWrite((tx) =>
        tx.run(
          `CREATE (u:user {
            id: $userId,
            avatar: "",
            name: $name,
            email: $email,
            userName: $userName,
            password: $password,
            createdAt: $createdAt,
            confirmed: false,
            verified: false,
            desactivated: false,
            followers: 0,
            followings: 0
          })-[:IS_A]->(b:buyer {id: $buyerId})
          CREATE (d:deviceToken {token: $token})<-[:logged_in_with]-(u)
          RETURN u`,
          {
            userId: buyer.id,
            buyerId: uid(40),
            token: userData.data.deviceToken,
            createdAt: moment().format('MMMM DD, YYYY'),
            email: email,
            userName: userData.data.userName,
            name: userData.data.name,
            password: hashedPassword,
          }
        )
      );

      return result.records[0];
    });

    if (!userRecord) {
      throw new Error('User record not found');
    }
    const userNode = userRecord.get('u');
    if (!userNode || !userNode.properties) {
      throw new Error('User node or its properties are undefined');
    }
    const userProperties = userNode.properties;

    // Generate email verification token (48 hour expiry)
    const tokenData = await auth.signEmailToken(userProperties.id);

    // Send verification email
    await sendVerificationEmail(email, userData.data.userName, tokenData.token, 'finding', resend!);

    log?.info({ userId: userProperties.id, role: 'Buyer' }, 'Buyer signup successful');

    return {
      tokenData,
      data: {
        avatar: userProperties.avatar,
        confirmed: userProperties.confirmed,
        createdAt: userProperties.createdAt,
        verified: userProperties.verified,
        desactivated: userProperties.desactivated,
        email: userProperties.email,
        followers: userProperties.followers,
        followings: userProperties.followings,
        id: userProperties.id,
        name: userProperties.name,
        phone: userProperties.phone,
        userName: userProperties.userName,
      },
      role: 'Buyer',
    };
  } catch (error) {
    log?.error({ error, email }, 'Buyer signup failed');
    throw error;
  }
}

/**
 * Send Verification Email
 *
 * Sends an email verification link using Resend + React Email.
 * Replaces nodemailer + handlebars implementation.
 *
 * @param email - Recipient email address
 * @param userName - User's display name
 * @param token - Email verification token
 * @param role - User's role context (e.g., "selling", "finding")
 * @param resend - Resend client instance
 * @throws {InternalServerError} - Email sending failures
 *
 * @migration
 * - Replaced nodemailer transporter with Resend SDK
 * - Replaced handlebars template with React Email component
 * - Uses render() from @react-email/render to convert React to HTML
 * - Improved error handling with structured logging
 * - Requires RESEND_FROM_EMAIL environment variable
 */
export async function sendVerificationEmail(
  email: string,
  userName: string,
  token: string,
  role: string,
  resend: Resend
): Promise<void> {
  // Validate Resend configuration
  if (!process.env.RESEND_API_KEY) {
    throw new InternalServerError(
      'RESEND_API_KEY environment variable is not set. ' +
        'Please add it to your .env file. ' +
        'Get your API key from: https://resend.com/api-keys'
    );
  }

  try {
    // Render React Email template to HTML
    const html = await render(
      VerifyEmailTemplate({
        userName,
        token,
        domain: process.env.DOMAIN || 'http://localhost:3000',
        role,
      })
    );

    // Send email via Resend
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Feetflight <onboarding@resend.dev>',
      to: email,
      subject: 'Verifying Email',
      html,
    });

    if (result.error) {
      throw new Error(`Resend API error: ${result.error.message}`);
    }

    console.log('Verification email sent successfully:', result.data?.id);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new InternalServerError(
      `Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Login Service Function
 *
 * Authenticates user with email and password.
 * Updates device token and generates access token.
 *
 * @param userData - Login credentials validated by LoginSchema
 * @param deps - Injected dependencies (auth, neo4j, log)
 * @returns Promise resolving to login response with tokenData, user data, and role
 * @throws {BadRequestError} - Missing credentials
 * @throws {ForbiddenError} - Invalid email or password
 * @throws {InternalServerError} - Database failures
 *
 * @migration
 * - Consolidated multiple sessions into single withSession call
 * - Replaced manual JWT signing with auth.signAccessToken()
 * - Replaced return { message } with throwing ForbiddenError
 * - Added proper error handling and logging
 */
export async function login(userData: any, deps: AuthServiceDeps): Promise<LoginResponse> {
  const { auth, neo4j, log } = deps;

  if (!userData?.data) {
    throw new BadRequestError('userData is empty');
  }

  if (!neo4j) {
    throw new InternalServerError('Neo4j database client not available');
  }

  const email = userData.data.email;
  const password = userData.data.password;
  const deviceToken = userData.data.deviceToken;

  try {
    // Perform all database operations in single session
    const result = await neo4j.withSession(async (session: Session) => {
      // Find user and verify password
      const findUserResult = await session.executeRead((tx) =>
        tx.run('MATCH (u:user {email: $email}) RETURN u', { email })
      );

      if (findUserResult.records.length === 0) {
        throw new ForbiddenError('Invalid email or password');
      }

      const userRecord = findUserResult?.records[0]?.get('u').properties;
      const isPasswordMatching = await compare(password, userRecord.password);

      if (!isPasswordMatching) {
        throw new ForbiddenError('Invalid email or password');
      }

      const userId = userRecord.id;

      // Check if user is a seller
      const roleResult = await session.executeRead((tx) =>
        tx.run('MATCH (u:user {id: $id})-[:IS_A]-(r:seller) RETURN r', { id: userId })
      );

      const role = roleResult.records.length === 0 ? 'Buyer' : 'Seller';

      // Update device token (merge to ensure node exists)
      await session.executeWrite((tx) =>
        tx.run(
          'MATCH (u:user {id: $id}) MERGE (u)-[:logged_in_with]->(d:deviceToken) SET d.token = $token',
          {
            id: userId,
            token: deviceToken,
          }
        )
      );

      return { userRecord, role };
    });

    // Generate access token
    const tokenData = await auth.signAccessToken(result.userRecord.id);

    log?.info({ userId: result.userRecord.id, role: result.role }, 'User logged in successfully');

    return {
      tokenData,
      data: {
        avatar: result.userRecord.avatar,
        confirmed: result.userRecord.confirmed,
        createdAt: result.userRecord.createdAt,
        verified: result.userRecord.verified,
        desactivated: result.userRecord.desactivated,
        email: result.userRecord.email,
        followers: result.userRecord.followers,
        followings: result.userRecord.followings,
        id: result.userRecord.id,
        name: result.userRecord.name,
        phone: result.userRecord.phone,
        userName: result.userRecord.userName,
      },
      role: result.role,
    };
  } catch (error) {
    log?.error({ error, email }, 'Login failed');

    if (error instanceof ForbiddenError || error instanceof BadRequestError) {
      throw error;
    }

    throw new InternalServerError(
      `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Change Password Service Function
 *
 * Updates user's password after verifying old password.
 *
 * @param email - User's email address
 * @param userData - Password change data validated by ChangePasswordSchema
 * @param deps - Injected dependencies (neo4j, log)
 * @returns Promise resolving to updated user properties
 * @throws {ForbiddenError} - Old password is incorrect
 * @throws {NotFoundError} - User not found
 * @throws {InternalServerError} - Database failures
 *
 * @migration
 * - Consolidated multiple sessions into single withSession call
 * - Replaced return { message } with throwing ForbiddenError
 * - Added proper error handling
 */
export async function changePassword(
  email: string,
  userData: any,
  deps: AuthServiceDeps
): Promise<any> {
  const { neo4j, log } = deps;

  if (!neo4j) {
    throw new InternalServerError('Neo4j database client not available');
  }

  try {
    const result = await neo4j.withSession(async (session: Session) => {
      // Find user
      const findUserResult = await session.executeRead((tx) =>
        tx.run('MATCH (u:user {email: $email}) RETURN u', { email })
      );

      if (findUserResult.records.length === 0) {
        throw new NotFoundError('User not found');
      }

      const userPassword = findUserResult?.records[0]?.get('u').properties.password;

      // Verify old password
      const isPasswordMatching = await compare(userData.data.oldPassword, userPassword);

      if (!isPasswordMatching) {
        throw new ForbiddenError('Old password is incorrect');
      }

      // Hash new password
      const hashedPassword = await hash(userData.data.newPassword, 10);

      // Update password
      const updateResult = await session.executeWrite((tx) =>
        tx.run('MATCH (u:user {email: $email}) SET u.password = $newPassword RETURN u', {
          email: email,
          newPassword: hashedPassword,
        })
      );

      return updateResult?.records[0]?.get('u').properties;
    });

    log?.info({ email }, 'Password changed successfully');

    return result;
  } catch (error) {
    log?.error({ error, email }, 'Change password failed');

    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      throw error;
    }

    throw new InternalServerError(
      `Change password failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Resend Verification Email Service Function
 *
 * Generates a new verification token and resends the verification email.
 *
 * @param email - User's email address
 * @param deps - Injected dependencies (auth, neo4j, log, resend)
 * @returns Promise resolving to void (email sent)
 * @throws {NotFoundError} - User not found
 * @throws {InternalServerError} - Database or email sending failures
 *
 * @migration
 * - Consolidated multiple sessions into single withSession call
 * - Replaced nodemailer with Resend + React Email
 * - Replaced manual JWT signing with auth.signAccessToken()
 * - Added proper error handling
 */
export async function resendVerificationEmail(email: string, deps: AuthServiceDeps): Promise<void> {
  const { auth, neo4j, log, resend } = deps;

  if (!resend) {
    throw new InternalServerError('Resend client not available');
  }

  if (!neo4j) {
    throw new InternalServerError('Neo4j database client not available');
  }

  // Validate Resend configuration
  if (!process.env.RESEND_API_KEY) {
    throw new InternalServerError(
      'RESEND_API_KEY environment variable is not set. ' +
        'Please add it to your .env file. ' +
        'Get your API key from: https://resend.com/api-keys'
    );
  }

  try {
    const result = await neo4j.withSession(async (session: Session) => {
      // Find user
      const userResult = await session.executeRead((tx) =>
        tx.run('MATCH (u:user {email: $email}) RETURN u', { email })
      );

      if (userResult.records.length === 0) {
        throw new NotFoundError('User not found');
      }

      const userProperties = userResult?.records[0]?.get('u').properties;

      // Check if user is a seller (simplified, matching login approach)
      const roleResult = await session.executeRead((tx) =>
        tx.run('MATCH (u:user {email: $email})-[:IS_A]->(s:seller) RETURN s LIMIT 1', {
          email,
        })
      );

      const role = roleResult.records.length > 0 ? 'Seller' : 'Buyer';

      return { userProperties, role };
    });

    // Generate new verification token (48 hour expiry)
    const tokenData = await auth.signEmailToken(result.userProperties.id);

    // Send verification email
    await sendVerificationEmail(
      email,
      result.userProperties.userName,
      tokenData.token,
      result.role,
      resend
    );

    log?.info({ email }, 'Verification email resent successfully');
  } catch (error) {
    log?.error({ error, email }, 'Resend verification email failed');

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new InternalServerError(
      `Resend verification email failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Refresh Token Service Function
 *
 * Generates a new refresh token for the given user ID.
 *
 * @param id - User ID
 * @param deps - Injected dependencies (auth, log)
 * @returns Promise resolving to token data
 * @throws {BadRequestError} - Missing user ID
 * @throws {InternalServerError} - Token generation failures
 *
 * @migration
 * - Replaced manual JWT signing with auth.signRefreshToken()
 * - Replaced return { message } with throwing BadRequestError
 * - Removed unnecessary session creation
 */
export async function refreshToken(
  id: string,
  deps: AuthServiceDeps
): Promise<{ tokenData: TokenData }> {
  const { auth, log } = deps;

  if (!id) {
    throw new BadRequestError('User ID is required');
  }

  try {
    const tokenData = await auth.signRefreshToken(id);

    log?.info({ userId: id }, 'Refresh token generated');

    return { tokenData };
  } catch (error) {
    log?.error({ error, userId: id }, 'Refresh token generation failed');
    throw new InternalServerError(
      `Refresh token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Logout Service Function
 *
 * Handles user logout (currently a no-op as cookie clearing happens in route).
 * Could be extended to invalidate device tokens in database.
 *
 * @param user - Authenticated user from context
 * @param deps - Injected dependencies (log)
 * @returns Promise resolving to user data
 *
 * @migration
 * - Removed userModel dependency (mock data)
 * - Implemented as no-op (cookie clearing happens in route handler)
 * - Could be extended to invalidate device token in Neo4j if needed
 */
export async function logout(user: any, deps: AuthServiceDeps): Promise<any> {
  const { log } = deps;

  log?.info({ userId: user.id }, 'User logged out');

  await deps.neo4j?.withSession(async (session) => {
    await session.executeWrite((tx) =>
      tx.run('MATCH (u:user {id: $id})-[:logged_in_with]->(d:deviceToken) SET d.token = ""', {
        id: user.id,
      })
    );
  });

  return user;
}

/**
 * @deprecated Legacy AuthService class for backward compatibility with Express controller
 *
 * This class exists solely to prevent build errors in the deprecated AuthController.
 * It wraps the new functional API but lacks proper dependency injection.
 *
 * DO NOT USE THIS CLASS IN NEW CODE. Use the exported functions directly.
 *
 * This class will be removed when src/controllers/auth.controller.ts is deleted.
 */
export default class AuthService {
  /**
   * @deprecated Use the exported signup() function instead
   */
  public async signup(userData: any): Promise<any> {
    throw new Error(
      'AuthService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/auth.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported login() function instead
   */
  public async login(userData: any): Promise<any> {
    throw new Error(
      'AuthService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/auth.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported changePassword() function instead
   */
  public async changePassword(email: string, userData: any): Promise<any> {
    throw new Error(
      'AuthService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/auth.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported resendVerificationEmail() function instead
   */
  public async resendVerificationEmail(email: string): Promise<void> {
    throw new Error(
      'AuthService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/auth.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported refreshToken() function instead
   */
  public async refreshToken(id: string): Promise<any> {
    throw new Error(
      'AuthService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/auth.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported logout() function instead
   */
  public async logout(userData: any): Promise<any> {
    throw new Error(
      'AuthService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/auth.route.ts instead.'
    );
  }
}
