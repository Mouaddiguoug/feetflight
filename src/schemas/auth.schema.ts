import { t } from 'elysia';
import { Static } from '@sinclair/typebox';

/**
 * SignupSchema
 * Use for POST /signup route validation
 * Validates user registration with role-based conditional validation
 * Enforces role-specific requirements: Buyer excludes phone/plans, Seller requires them
 */
const BuyerSignupSchema = t.Object({
  email: t.String({
    format: 'email',
    error: 'Invalid email format',
  }),
  password: t.String({
    minLength: 8,
    error: 'Password must be at least 8 characters',
  }),
  name: t.String({
    minLength: 2,
    error: 'Name must be at least 2 characters',
  }),
  userName: t.String({
    minLength: 3,
    error: 'Username must be at least 3 characters',
  }),
  role: t.Literal('Buyer'),
  deviceToken: t.String({
    error: 'Device token is required',
  }),
});

const SellerSignupSchema = t.Object({
  email: t.String({
    format: 'email',
    error: 'Invalid email format',
  }),
  password: t.String({
    minLength: 8,
    error: 'Password must be at least 8 characters',
  }),
  name: t.String({
    minLength: 2,
    error: 'Name must be at least 2 characters',
  }),
  userName: t.String({
    minLength: 3,
    error: 'Username must be at least 3 characters',
  }),
  role: t.Literal('Seller'),
  deviceToken: t.String({
    error: 'Device token is required',
  }),
  phone: t.String({
    pattern: '^\\+?[1-9]\\d{1,14}$',
    error: 'Invalid phone number format',
  }),
  plans: t.Array(
    t.Object({
      name: t.String(),
      price: t.Numeric({
        minimum: 0,
      }),
    }),
    {
      minItems: 1,
      error: 'Plans must be an array of objects with name and price',
    },
  ),
});

export const SignupSchema = t.Object({
  data: t.Union([BuyerSignupSchema, SellerSignupSchema]),
});

export type SignupDTO = Static<typeof SignupSchema>;

/**
 * LoginSchema
 * Use for POST /login route validation
 * Validates user login credentials
 */
export const LoginSchema = t.Object({
  data: t.Object({
    email: t.String({
      format: 'email',
      error: 'Invalid email format',
    }),
    password: t.String({
      minLength: 1,
      error: 'Password is required',
    }),
    deviceToken: t.String({
      error: 'Device token is required',
    }),
  }),
});

export type LoginDTO = Static<typeof LoginSchema>;

/**
 * ChangePasswordSchema
 * Use for POST /change-password route validation
 * Validates password change request
 */
export const ChangePasswordSchema = t.Object({
  data: t.Object({
    oldPassword: t.String({
      minLength: 1,
      error: 'Old password is required',
    }),
    newPassword: t.String({
      minLength: 8,
      error: 'New password must be at least 8 characters',
    }),
  }),
});

export type ChangePasswordDTO = Static<typeof ChangePasswordSchema>;

/**
 * RefreshTokenSchema
 * Use for POST /refresh-token route validation
 * Validates refresh token request
 */
export const RefreshTokenSchema = t.Object({
  id: t.String({
    error: 'User ID is required',
  }),
});

export type RefreshTokenDTO = Static<typeof RefreshTokenSchema>;

/**
 * EmailParamSchema
 * Use for validating email parameter in route params
 * Example: GET /users/:email
 */
export const EmailParamSchema = t.Object({
  email: t.String({
    format: 'email',
    error: 'Invalid email format',
  }),
});

export type EmailParamDTO = Static<typeof EmailParamSchema>;
