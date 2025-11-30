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
import { UserRepository } from '@/domain/repositories/user.repository';
import { SellerRepository } from '@/domain/repositories/seller.repository';
import type { Tneo4j } from '@/plugins/neo4j.plugin';
import type {
  SignupResponse,
  LoginResponse,
  ChangePasswordResponse,
  RefreshTokenResponse,
  LogoutResponse,
  ResendVerificationEmailResponse,
} from '@feetflight/shared-types';

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
  neo4j?: Tneo4j;
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
 * Helper function to convert Neo4j Integer to string or number
 */
function convertInteger(value: unknown): string | number {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as any).toNumber();
  }
  return String(value);
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

  // Create repository instances
  const userRepo = new UserRepository({ neo4j, log });

  try {
    // Check if user already exists using repository
    const existingUser = await userRepo.findByEmail(email);

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

  if (!neo4j) {
    throw new InternalServerError('Neo4j client is not available');
  }

  // Create repository instances
  const userRepo = new UserRepository({ neo4j, log });
  const sellerRepo = new SellerRepository({ neo4j, log });

  try {
    // Create Stripe customer
    const sellerCustomer = await stripe!.customers.create({
      name: userData.data.name,
      email: email,
      balance: 0,
    });

    // Create user using repository
    const user = await userRepo.create({
      id: sellerCustomer.id,
      email: email,
      password: hashedPassword,
      name: userData.data.name,
      userName: userData.data.userName,
      avatar: '',
      phone: userData.data.phone,
      confirmed: false,
      verified: false,
      desactivated: false,
    });

    // Add device token
    await userRepo.addDeviceToken(user.id, userData.data.deviceToken);

    // Create seller node using repository
    const seller = await sellerRepo.create(user.id);

    // Create wallet for seller (still needs direct query for now - will be refactored later)
    await neo4j.withSession(async (session: Session) => {
      await session.executeWrite((tx) =>
        tx.run(
          'MATCH (s:seller {id: $sellerId}) CREATE (s)-[:HAS_A]->(:wallet {id: $walletId, amount: 0.0})',
          {
            sellerId: seller.id,
            walletId: uid(40),
          }
        )
      );
    });

    // Create Stripe products and plans in parallel
    const plans = await Promise.all(
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

          return {
            id: stripePrice.id,
            name: plan.name,
            price: plan.price,
          };
        } catch (error) {
          log?.error({ error, planName: plan.name }, 'Failed to create plan');
          throw new InternalServerError(`Failed to create plan: ${plan.name}`);
        }
      })
    );

    // Create plans in Neo4j using repository
    await sellerRepo.createPlans(user.id, plans);

    // Generate email verification token (48 hour expiry)
    const tokenData = await auth.signEmailToken(user.id);

    // Send verification email
    await sendVerificationEmail(email, userData.data.userName, tokenData.token, 'selling', resend!);

    log?.info({ userId: user.id, role: 'Seller' }, 'Seller signup successful');

    return {
      tokenData,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        userName: user.userName,
        avatar: user.avatar,
        confirmed: user.confirmed,
        verified: user.verified,
        desactivated: user.desactivated,
        createdAt: String(convertInteger(user.createdAt)),
        followers: user.followers,
        followings: user.followings,
        phone: user.phone,
      },
      role: 'Seller',
    };
  } catch (error) {
    log?.error({ error, email }, 'Seller signup failed');
    throw error;
  }
}

/**
 * Waitlist Service Function
 *
 * Adds a new user's email to the waitlist by creating a minimal Neo4j user node
 * and linking it as either a buyer or seller.
 *
 * @param userData - Waitlist data containing email and role
 * @param deps - Injected dependencies (neo4j, log)
 * @returns Promise resolving to a success message
 * @throws {BadRequestError} - Missing email or invalid role
 * @throws {ConflictError} - Email already exists
 * @throws {InternalServerError} - Database failures
 */
export async function waitlist(
  userData: { data: { email: string; role: typeof RolesEnum.SELLER | typeof RolesEnum.BUYER } },
  deps: AuthServiceDeps
): Promise<{ message: string }> {
  const { neo4j, log } = deps;

  if (!userData?.data || !userData.data.email || !userData.data.role) {
    throw new BadRequestError('Missing required fields: email and role');
  }

  if (!neo4j) {
    throw new InternalServerError('Neo4j database client not available');
  }

  const email = userData.data.email;
  const role = userData.data.role;
  const userId = uid(40); // Generate a unique ID for the minimal user node
  const createdAt = moment().format('MMMM DD, YYYY');

  if (role !== RolesEnum.SELLER && role !== RolesEnum.BUYER) {
    throw new BadRequestError('Invalid role specified. Must be SELLER or BUYER');
  }

  try {
    const result = await neo4j.withSession(async (session: Session) => {
      // Check if user already exists
      const existingUser = await session.executeRead((tx) =>
        tx.run('MATCH (u:user {email: $email}) RETURN u', { email })
      );

      if (existingUser.records.length > 0) {
        throw new ConflictError(`This email ${email} is already on the waitlist or registered`);
      }

      let query;
      const params = {
        userId,
        email,
        createdAt,
        roleId: uid(40), // Unique ID for the specific role node (buyer/seller)
        roleLabel: role === RolesEnum.SELLER ? 'Seller' : 'Buyer',
      };

      // Create a minimal user node and link it to the appropriate role node
      // Note: Minimal user node has confirmed=false, verified=false, desactivated=true
      // because they are just on the waitlist and inactive.
      if (role === RolesEnum.SELLER) {
        query = `
          CREATE (u:user {
            id: $userId,
            email: $email,
            createdAt: $createdAt
          })
          CREATE (u)-[:IS_A]->(:seller {id: $roleId, verified: false})
          RETURN u
        `;
      } else {
        // RolesEnum.BUYER
        query = `
          CREATE (u:user {
            id: $userId,
            email: $email,
            createdAt: $createdAt
          })
          CREATE (u)-[:IS_A]->(:buyer {id: $roleId})
          RETURN u
        `;
      }

      const createResult = await session.executeWrite((tx) => tx.run(query, params));
      return createResult.records.length > 0;
    });

    if (result) {
      log?.info({ email, role }, 'User successfully added to waitlist');
      return { message: `Email ${email} successfully added to the ${role} waitlist` };
    } else {
      throw new InternalServerError('Failed to create waitlist user in Neo4j');
    }
  } catch (error) {
    log?.error({ error, email, role }, 'Waitlist failed');

    // Re-throw custom errors
    if (error instanceof BadRequestError || error instanceof ConflictError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new InternalServerError(
      `Waitlist failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
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

  if (!neo4j) {
    throw new InternalServerError('Neo4j instance is undefined');
  }

  // Create repository instances
  const userRepo = new UserRepository({ neo4j, log });

  try {
    // Create Stripe customer
    const buyer = await stripe!.customers.create({
      name: userData.data.name,
      email: email,
      balance: 0,
    });

    // Create user using repository
    const user = await userRepo.create({
      id: buyer.id,
      email: email,
      password: hashedPassword,
      name: userData.data.name,
      userName: userData.data.userName,
      avatar: '',
      confirmed: false,
      verified: false,
      desactivated: false,
    });

    // Create buyer node (still needs direct query for now - will be refactored later)
    await neo4j.withSession(async (session: Session) => {
      await session.executeWrite((tx) =>
        tx.run('MATCH (u:user {id: $userId}) CREATE (u)-[:IS_A]->(b:buyer {id: $buyerId})', {
          userId: user.id,
          buyerId: uid(40),
        })
      );
    });

    // Add device token
    await userRepo.addDeviceToken(user.id, userData.data.deviceToken);

    // Generate email verification token (48 hour expiry)
    const tokenData = await auth.signEmailToken(user.id);

    // Send verification email
    await sendVerificationEmail(email, userData.data.userName, tokenData.token, 'finding', resend!);

    log?.info({ userId: user.id, role: 'Buyer' }, 'Buyer signup successful');

    return {
      tokenData,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        userName: user.userName,
        avatar: user.avatar,
        confirmed: user.confirmed,
        verified: user.verified,
        desactivated: user.desactivated,
        createdAt: String(convertInteger(user.createdAt)),
        followers: user.followers,
        followings: user.followings,
        phone: user.phone,
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

  // Create repository instances
  const userRepo = new UserRepository({ neo4j, log });

  try {
    // Find user by email using repository
    const user = await userRepo.findByEmail(email);

    if (!user) {
      throw new ForbiddenError('Invalid email or password');
    }

    // Verify password
    const isPasswordMatching = await compare(password, user.password);

    if (!isPasswordMatching) {
      throw new ForbiddenError('Invalid email or password');
    }

    // Get user role using repository
    const role = await userRepo.getUserRole(user.id);
    const userRole = role === 'Seller' ? 'Seller' : 'Buyer';

    // Update device token using repository
    await userRepo.addDeviceToken(user.id, deviceToken);

    // Generate access token
    const tokenData = await auth.signAccessToken(user.id);

    log?.info({ userId: user.id, role: userRole }, 'User logged in successfully');

    return {
      tokenData,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        userName: user.userName,
        avatar: user.avatar,
        confirmed: user.confirmed,
        verified: user.verified,
        desactivated: user.desactivated,
        createdAt: String(convertInteger(user.createdAt)),
        followers: user.followers,
        followings: user.followings,
        phone: user.phone,
      },
      role: userRole,
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
): Promise<ChangePasswordResponse> {
  const { neo4j, log } = deps;

  if (!neo4j) {
    throw new InternalServerError('Neo4j database client not available');
  }

  // Create repository instances
  const userRepo = new UserRepository({ neo4j, log });

  try {
    // Find user by email using repository
    const user = await userRepo.findByEmail(email);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify old password
    const isPasswordMatching = await compare(userData.data.oldPassword, user.password);

    if (!isPasswordMatching) {
      throw new ForbiddenError('Old password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hash(userData.data.newPassword, 10);

    // Update password using repository
    await userRepo.update(user.id, { password: hashedPassword });

    log?.info({ email }, 'Password changed successfully');

    return {
      message: 'Password changed successfully',
    };
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
export async function resendVerificationEmail(
  email: string,
  deps: AuthServiceDeps
): Promise<ResendVerificationEmailResponse> {
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

  // Create repository instances
  const userRepo = new UserRepository({ neo4j, log });

  try {
    // Find user by email using repository
    const user = await userRepo.findByEmail(email);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get user role using repository
    const role = await userRepo.getUserRole(user.id);
    const userRole = role === 'Seller' ? 'selling' : 'finding';

    // Generate new verification token (48 hour expiry)
    const tokenData = await auth.signEmailToken(user.id);

    // Send verification email
    await sendVerificationEmail(email, user.userName, tokenData.token, userRole, resend);

    log?.info({ email }, 'Verification email resent successfully');

    return {
      message: 'Verification email sent successfully',
    };
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
): Promise<RefreshTokenResponse> {
  const { auth, log } = deps;

  if (!id) {
    throw new BadRequestError('User ID is required');
  }

  try {
    const tokenData = await auth.signRefreshToken(id);

    log?.info({ userId: id }, 'Refresh token generated');

    return {
      token: tokenData.token,
      expiresIn: tokenData.expiresIn,
      maxAgeSeconds: tokenData.maxAgeSeconds,
    };
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
export async function logout(user: any, deps: AuthServiceDeps): Promise<LogoutResponse> {
  const { neo4j, log } = deps;

  if (!neo4j) {
    throw new InternalServerError('Neo4j database client not available');
  }

  // Create repository instances
  const userRepo = new UserRepository({ neo4j, log });

  try {
    // Remove all device tokens (logout from all devices)
    await userRepo.removeAllDeviceTokens(user.id);

    log?.info({ userId: user.id }, 'User logged out');

    return {
      message: 'Logged out successfully',
    };
  } catch (error) {
    log?.error({ error, userId: user.id }, 'Logout failed');
    throw new InternalServerError(
      `Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
// export default class AuthService {
//   /**
//    * @deprecated Use the exported signup() function instead
//    */
//   public async signup(userData: any): Promise<any> {
//     throw new Error(
//       'AuthService class is deprecated. This method is non-functional. ' +
//         'Use the Elysia routes in src/routes/auth.route.ts instead.'
//     );
//   }

//   /**
//    * @deprecated Use the exported login() function instead
//    */
//   public async login(userData: any): Promise<any> {
//     throw new Error(
//       'AuthService class is deprecated. This method is non-functional. ' +
//         'Use the Elysia routes in src/routes/auth.route.ts instead.'
//     );
//   }

//   /**
//    * @deprecated Use the exported changePassword() function instead
//    */
//   public async changePassword(email: string, userData: any): Promise<any> {
//     throw new Error(
//       'AuthService class is deprecated. This method is non-functional. ' +
//         'Use the Elysia routes in src/routes/auth.route.ts instead.'
//     );
//   }

//   /**
//    * @deprecated Use the exported resendVerificationEmail() function instead
//    */
//   public async resendVerificationEmail(email: string): Promise<void> {
//     throw new Error(
//       'AuthService class is deprecated. This method is non-functional. ' +
//         'Use the Elysia routes in src/routes/auth.route.ts instead.'
//     );
//   }

//   /**
//    * @deprecated Use the exported refreshToken() function instead
//    */
//   public async refreshToken(id: string): Promise<any> {
//     throw new Error(
//       'AuthService class is deprecated. This method is non-functional. ' +
//         'Use the Elysia routes in src/routes/auth.route.ts instead.'
//     );
//   }

//   /**
//    * @deprecated Use the exported logout() function instead
//    */
//   public async logout(userData: any): Promise<any> {
//     throw new Error(
//       'AuthService class is deprecated. This method is non-functional. ' +
//         'Use the Elysia routes in src/routes/auth.route.ts instead.'
//     );
//   }
// }
