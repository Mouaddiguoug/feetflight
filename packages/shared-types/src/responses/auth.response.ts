import { t } from 'elysia';
import { Static } from '@sinclair/typebox';

/**
 * TokenDataSchema
 * Represents JWT token information returned on authentication
 */
export const TokenDataSchema = t.Object({
  token: t.String({
    description: 'JWT access token',
  }),
  expiresIn: t.String({
    description: 'Token expiration time (e.g., "15m", "30d")',
  }),
  maxAgeSeconds: t.Number({
    description: 'Token expiration in seconds',
    minimum: 0,
  }),
});

export type TokenDataResponse = Static<typeof TokenDataSchema>;

/**
 * UserDataSchema
 * Represents user data returned on authentication
 */
export const UserDataSchema = t.Object({
  id: t.String({
    description: 'User unique identifier',
  }),
  name: t.String({
    description: 'User full name',
  }),
  email: t.String({
    format: 'email',
    description: 'User email address',
  }),
  userName: t.String({
    description: 'User username',
  }),
  avatar: t.String({
    description: 'User avatar URL or path',
  }),
  confirmed: t.Boolean({
    description: 'Whether user email is confirmed',
  }),
  verified: t.Boolean({
    description: 'Whether user account is verified',
  }),
  desactivated: t.Boolean({
    description: 'Whether user account is deactivated',
  }),
  createdAt: t.String({
    description: 'User account creation timestamp',
  }),
  followers: t.Number({
    description: 'Number of followers',
    minimum: 0,
  }),
  followings: t.Number({
    description: 'Number of followings',
    minimum: 0,
  }),
  phone: t.Optional(
    t.String({
      description: 'User phone number (sellers only)',
    }),
  ),
});

export type UserDataResponse = Static<typeof UserDataSchema>;

/**
 * SignupResponseSchema
 * Response for POST /signup
 */
export const SignupResponseSchema = t.Object({
  tokenData: TokenDataSchema,
  data: UserDataSchema,
  role: t.Union([t.Literal('Buyer'), t.Literal('Seller')], {
    description: 'User role',
  }),
});

export type SignupResponse = Static<typeof SignupResponseSchema>;

/**
 * LoginResponseSchema
 * Response for POST /login
 */
export const LoginResponseSchema = t.Object({
  tokenData: TokenDataSchema,
  data: UserDataSchema,
  role: t.Union([t.Literal('Buyer'), t.Literal('Seller')], {
    description: 'User role',
  }),
});

export type LoginResponse = Static<typeof LoginResponseSchema>;

/**
 * RefreshTokenResponseSchema
 * Response for POST /refresh
 */
export const RefreshTokenResponseSchema = t.Object({
  token: t.String({
    description: 'New access token',
  }),
  expiresIn: t.String({
    description: 'Token expiration time',
  }),
  maxAgeSeconds: t.Number({
    description: 'Token expiration in seconds',
    minimum: 0,
  }),
});

export type RefreshTokenResponse = Static<typeof RefreshTokenResponseSchema>;

/**
 * ChangePasswordResponseSchema
 * Response for POST /changePassword/:email
 */
export const ChangePasswordResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type ChangePasswordResponse = Static<typeof ChangePasswordResponseSchema>;

/**
 * LogoutResponseSchema
 * Response for POST /logout
 */
export const LogoutResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type LogoutResponse = Static<typeof LogoutResponseSchema>;

/**
 * ResendVerificationEmailResponseSchema
 * Response for POST /resendVerificationEmail/:email
 */
export const ResendVerificationEmailResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type ResendVerificationEmailResponse = Static<typeof ResendVerificationEmailResponseSchema>;
