import { Elysia, t } from 'elysia';
import {
  SignupSchema,
  LoginSchema,
  ChangePasswordSchema,
  RefreshTokenSchema,
  EmailParamSchema,
} from '@/schemas/auth.schema';
import { authGuard, authPlugin } from '@/plugins/auth.plugin';
import {
  signup,
  login,
  refreshToken,
  logout,
  changePassword,
  resendVerificationEmail,
} from '@/services/auth.service';
import { stripe } from '@/utils/stripe';
import { resend } from '@/utils/resend';
import { loggerPlugin, neo4jPlugin } from '@/plugins';

export const authRoutes = () => {
  return new Elysia({ name: 'routes.auth' }).group('/', app =>
    
    app
    .use(authPlugin())
    .use(neo4jPlugin())
    .use(loggerPlugin())
    .post(
        '/signup',
        async ({ body, auth, neo4j, set, log }) => {
          try {
            const result = await signup(body, { auth, neo4j, log, stripe, resend });

            set.headers['Set-Cookie'] = auth.createCookie(result.tokenData);
            set.status = 201;

            return result;
          } catch (error) {
            throw error;
          }
        },
        {
          body: t.Object({
            data: t.Union([t.Object({
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
            }), t.Object({
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
            })]),
          }),
          detail: {
            tags: ['Authentication'],
            summary: 'User Registration',
            description: 'Register a new user account (Buyer or Seller) with email verification',
          },
        },
      )

      .post(
        '/login',
        async ({ body, auth, neo4j, set, log }) => {
          try {
            const result = await login(body, { auth, neo4j, log });

            // Set authorization cookie
            set.headers['Set-Cookie'] = auth.createCookie(result.tokenData);
            set.status = 200;

            return result;
          } catch (error) {
            throw error;
          }
        },
        {
          body: LoginSchema,
          detail: {
            tags: ['Authentication'],
            summary: 'User Login',
            description: 'Authenticate user and generate access token',
          },
        },
      )


      .post(
        '/refresh',
        async ({ body, auth, log }) => {
          try {
            const result = await refreshToken(body.id, { auth, log });
            return result;
          } catch (error) {
            throw error;
          }
        },
        {
          body: RefreshTokenSchema,
          detail: {
            tags: ['Authentication'],
            summary: 'Refresh Token',
            description: 'Generate a new refresh token',
          },
        },
      )

      .use(authGuard())
      .post(
        '/logout',
        async ({ user, set, log, auth, neo4j }) => {
          try {
            const result = await logout(user, { auth, neo4j, log });

            set.headers['Set-Cookie'] = 'Authorization=; HttpOnly; Max-Age=0; Path=/; SameSite=Strict';
            set.status = 200;

            return {
              data: result,
              message: 'logout',
            };
          } catch (error) {
            throw error;
          }
        },
        {
          detail: {
            tags: ['Authentication'],
            summary: 'User Logout',
            description: 'Logout authenticated user and clear session cookie',
          },
        },
      )

      .post(
        '/changePassword/:email',
        async ({ params, body, neo4j, log, auth }) => {
          try {
            const result = await changePassword(params.email, body, { auth, neo4j, log });
            return result;
          } catch (error) {
            throw error;
          }
        },
        {
          params: EmailParamSchema,
          body: ChangePasswordSchema,
          detail: {
            tags: ['Authentication'],
            summary: 'Change Password',
            description: 'Change authenticated user password',
          },
        },
      )

      .post(
        '/resendVerificationEmail/:email',
        async ({ params, auth, neo4j, log }) => {
          try {
            await resendVerificationEmail(params.email, { auth, neo4j, log, resend });

            return {
              message: 'Verification email sent',
            };
          } catch (error) {
            throw error;
          }
        },
        {
          params: EmailParamSchema,
          detail: {
            tags: ['Authentication'],
            summary: 'Resend Verification Email',
            description: 'Resend email verification link to user',
          },
        },
      ),
  );
};

export default authRoutes;
