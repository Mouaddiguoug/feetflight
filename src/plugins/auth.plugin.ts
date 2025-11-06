import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { bearer } from '@elysiajs/bearer';
import { UnauthorizedError } from './error.plugin';
import { appLogger, loggerPlugin } from './logger.plugin';
import { Session } from 'neo4j-driver';
import moment from 'moment';
import { neo4jPlugin } from './neo4j.plugin';

/**
 * JWT Payload Interface
 * Defines the structure of the JWT token payload
 */
export interface JWTPayload {
  id: string;
  refresh?: boolean;
}

/**
 * Auth User Interface
 * Defines the structure of the authenticated user object attached to context
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  userName: string;
  avatar: string;
  role: string;
  verified: boolean;
  confirmed: boolean;
}

/**
 * Token Data Interface
 * Defines the structure returned by token signing methods
 */
export interface TokenData {
  token: string;
  expiresIn: string;
  maxAgeSeconds: number;
}

/**
 * Validate Environment Configuration
 * Ensures required secrets are present on plugin initialization
 */
function validateSecrets() {
  if (!process.env.SECRET_KEY) {
    throw new Error('SECRET_KEY environment variable is required for authentication');
  }

  if (!process.env.REFRESH_SECRET) {
    appLogger.warn('REFRESH_SECRET not set, falling back to SECRET_KEY. Consider setting a separate refresh secret for enhanced security.');
  }
}

/**
 * Authentication Plugin for Elysia
 *
 * Provides JWT-based authentication using @elysiajs/jwt and @elysiajs/bearer plugins.
 * Creates separate JWT instances for access tokens (15m expiry) and refresh tokens (30d expiry).
 *
 * Features:
 * - Bearer token extraction from Authorization headers
 * - Dual token support (access and refresh)
 * - Helper methods for token signing and cookie creation
 * - Integration with Neo4j for user verification
 * - Type-safe context extension
 */
export const authPlugin = () => {
  // Validate secrets on initialization
  validateSecrets();

  const secretKey = process.env.SECRET_KEY!;
  const refreshSecret = process.env.REFRESH_SECRET || secretKey;
  const emailSecret = process.env.EMAIL_SECRET || secretKey;

  return (
    new Elysia({ name: 'plugin.auth', seed: 'plugin.auth' })
      .use(bearer())

      .use(
        jwt({
          name: 'accessJwt',
          secret: secretKey,
          exp: '15m',
          schema: t.Object({
            id: t.String(),
          }),
        }),
      )

      .use(
        jwt({
          name: 'refreshJwt',
          secret: refreshSecret,
          exp: '30d',
          schema: t.Object({
            id: t.String(),
            refresh: t.Optional(t.Boolean()),
          }),
        }),
      )

      .use(
        jwt({
          name: 'emailJwt',
          secret: emailSecret,
          exp: '48h',
          schema: t.Object({
            id: t.String(),
            email: t.Optional(t.Boolean()),
          }),
        }),
      )

      .derive(({ accessJwt, refreshJwt, emailJwt }) => ({
        auth: {
          /**
           * Sign Access Token
           *
           * Creates an access token with 15 minute expiry for the given user ID.
           *
           * @param userId - The user's unique identifier
           * @returns Promise resolving to token data object with token string, formatted expiration timestamp, and maxAgeSeconds
           *
           * @example
           * ```typescript
           * const tokenData = await auth.signAccessToken(userId);
           * // Returns: { token: "eyJ...", expiresIn: "2025-11-04 14:30:00.000", maxAgeSeconds: 900 }
           * ```
           */
          signAccessToken: async (userId: string): Promise<TokenData> => {
            const payload: JWTPayload = { id: userId };
            const token = await accessJwt.sign(payload);

            // Calculate expiration timestamp (current time + 15 minutes)
            const maxAgeSeconds = 15 * 60; // 15 minutes in seconds
            const expiresIn = new Date();
            expiresIn.setTime(expiresIn.getTime() + maxAgeSeconds * 1000);

            return {
              token,
              expiresIn: moment(expiresIn).format('YYYY-MM-DD HH:mm:ss.SSS'),
              maxAgeSeconds,
            };
          },

          /**
           * Sign Refresh Token
           *
           * Creates a refresh token with 30 day expiry for the given user ID.
           * Includes a 'refresh: true' flag in payload to distinguish from access tokens.
           *
           * @param userId - The user's unique identifier
           * @returns Promise resolving to token data object with token string, formatted expiration timestamp, and maxAgeSeconds
           *
           * @example
           * ```typescript
           * const refreshTokenData = await auth.signRefreshToken(userId);
           * // Returns: { token: "eyJ...", expiresIn: "2025-12-04 14:00:00.000", maxAgeSeconds: 2592000 }
           * ```
           */
          signRefreshToken: async (userId: string): Promise<TokenData> => {
            const payload: JWTPayload = { id: userId, refresh: true };
            const token = await refreshJwt.sign(payload);

            // Calculate expiration timestamp (current time + 30 days)
            const maxAgeSeconds = 30 * 24 * 60 * 60; // 30 days in seconds
            const expiresIn = new Date();
            expiresIn.setTime(expiresIn.getTime() + maxAgeSeconds * 1000);

            return {
              token,
              expiresIn: moment(expiresIn).format('YYYY-MM-DD HH:mm:ss.SSS'),
              maxAgeSeconds,
            };
          },

          /**
           * Sign Email Verification Token
           *
           * Creates an email verification token with 48 hour expiry for the given user ID.
           * Uses EMAIL_SECRET for signing to separate concerns from access tokens.
           * Longer TTL prevents expiration during email delivery delays.
           *
           * @param userId - The user's unique identifier
           * @returns Promise resolving to token data object with token string, formatted expiration timestamp, and maxAgeSeconds
           *
           * @example
           * ```typescript
           * const emailTokenData = await auth.signEmailToken(userId);
           * // Returns: { token: "eyJ...", expiresIn: "2025-11-06 14:00:00.000", maxAgeSeconds: 172800 }
           * ```
           *
           * @note
           * - 48 hour expiry allows users time to check email and verify
           * - Uses dedicated EMAIL_SECRET environment variable
           * - Should only be used for email verification flows
           * - Verification endpoints must validate against emailJwt instance
           */
          signEmailToken: async (userId: string): Promise<TokenData> => {
            const payload: JWTPayload = { id: userId, email: true } as any;
            const token = await emailJwt.sign(payload);

            // Calculate expiration timestamp (current time + 48 hours)
            const maxAgeSeconds = 48 * 60 * 60; // 48 hours in seconds
            const expiresIn = new Date();
            expiresIn.setTime(expiresIn.getTime() + maxAgeSeconds * 1000);

            return {
              token,
              expiresIn: moment(expiresIn).format('YYYY-MM-DD HH:mm:ss.SSS'),
              maxAgeSeconds,
            };
          },

          /**
           * Create Cookie String
           *
           * Generates a properly formatted cookie string for setting the Authorization cookie.
           * Includes security flags: HttpOnly, SameSite=Strict, and Secure (in production).
           *
           * @param tokenData - Token data object containing token and maxAgeSeconds
           * @returns Cookie string ready to be set in Set-Cookie header
           *
           * Security enhancements over current implementation:
           * - HttpOnly: Prevents JavaScript access to cookie
           * - SameSite=Strict: Provides CSRF protection
           * - Secure (production only): Requires HTTPS
           * - Path=/: Makes cookie available across all routes
           */
          createCookie: (tokenData: TokenData): string => {
            const isProduction = process.env.NODE_ENV === 'production';

            // Build cookie string with security flags using maxAgeSeconds directly
            const cookieParts = [`Authorization=${tokenData.token}`, 'HttpOnly', `Max-Age=${tokenData.maxAgeSeconds}`, 'Path=/', 'SameSite=Strict'];

            // Add Secure flag in production to require HTTPS
            if (isProduction) {
              cookieParts.push('Secure');
            }

            return cookieParts.join('; ');
          },

          /**
           * Email JWT Verification Helper
           *
           * Provides a convenient wrapper around emailJwt.verify() for email verification flows.
           * This is exposed in auth context to simplify email token verification in routes.
           */
          emailJwt: {
            verify: async (token: string): Promise<JWTPayload | null> => {
              try {
                const payload = await emailJwt.verify(token);

                if (!payload) {
                  appLogger.warn('Email token verification failed: Invalid payload');
                  return null;
                }

                // Ensure token is actually an email token (has email flag)
                if (!(payload as any).email) {
                  appLogger.warn('Email token verification failed: Not an email token');
                  return null;
                }

                return payload as JWTPayload;
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                appLogger.warn({ error: errorMessage }, 'Email token verification failed');
                return null;
              }
            },
          },
        },
      }))
      
      .as("scoped")
  );
};

/**
 * Auth Guard Plugin
 *
 * Provides authentication guard functionality for protected routes.
 * Verifies tokens from both Authorization headers and cookies, validates against Neo4j,
 * and attaches user data to context.
 *
 * Prerequisites:
 * - Must use authPlugin() before using authGuard() to ensure bearer() and JWT instances are registered
 * - Requires neo4j plugin to be registered for database validation
 */
export const authGuard = () => {
  return (
    new Elysia({ name: 'plugin.auth.guard' })
      .use(bearer())
      .use(neo4jPlugin())
      .use(authPlugin())
      .use(loggerPlugin())
      .resolve(async ctx => {
        const { bearer: bearerToken, cookie, accessJwt, neo4j, log } = ctx;

        if (!accessJwt) {
          const errorMsg = 'authGuard requires authPlugin() to be registered first. Please use .use(authPlugin()) before .use(authGuard())';
          appLogger.error(errorMsg);
          throw new UnauthorizedError('Authentication system not properly configured');
        }

        try {
          const token = bearerToken || cookie.Authorization?.value as string

          if (!token) {
            log?.warn('Authentication failed: Token missing');
            throw new UnauthorizedError('Authentication token missing');
          }

          const payload = await accessJwt.verify(token);

          if (!payload) {
            log?.warn('Authentication failed: Invalid or expired token');
            throw new UnauthorizedError('Invalid or expired token');
          }

          if ((payload as any).refresh) {
            log?.warn('Authentication failed: Refresh token used as access token');
            throw new UnauthorizedError('Invalid token type');
          }

          const userId = payload.id;

          const userRecord = await neo4j.withSession(async (session: Session) => {
            const result = await session.executeRead(tx => tx.run('MATCH (u:user {id: $userId}) RETURN u', { userId }));

            if (result.records.length === 0) {
              return null;
            }

            return result?.records[0]?.get('u').properties;
          });

          if (!userRecord) {
            log?.warn({ userId }, 'Authentication failed: User not found in database');
            throw new UnauthorizedError('User not found');
          }

          const user: AuthUser = {
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.name,
            userName: userRecord.userName,
            avatar: userRecord.avatar || '',
            role: userRecord.role || '',
            verified: userRecord.verified || false,
            confirmed: userRecord.confirmed || false,
          };

          log?.info({ userId: user.id }, 'User authenticated successfully');

          return { user };
        } catch (error) {
          if (error instanceof UnauthorizedError) {
            throw error;
          }

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (log) {
            log.error({ error: errorMessage }, 'Authentication failed with unexpected error');
          } else {
            appLogger.error({ error: errorMessage }, 'Authentication failed with unexpected error');
          }

          throw new UnauthorizedError('Authentication failed');
        }
      }).as("scoped")
  );
};
