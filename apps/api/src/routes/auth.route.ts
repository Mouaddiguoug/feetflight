/* eslint-disable no-useless-catch */
import { Elysia } from 'elysia';
import {
  SignupSchema,
  LoginSchema,
  ChangePasswordSchema,
  RefreshTokenSchema,
  EmailParamSchema,
  SignupResponseSchema,
  LoginResponseSchema,
  RefreshTokenResponseSchema,
  LogoutResponseSchema,
  ChangePasswordResponseSchema,
  ResendVerificationEmailResponseSchema,
} from '@feetflight/shared-types';
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
  return new Elysia({ name: 'routes.auth' }).group('/', (app) =>
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
          body: SignupSchema,
          response: {
            201: SignupResponseSchema,
          },
          detail: {
            tags: ['Authentication'],
            summary: 'User Registration',
            description: 'Register a new user account (Buyer or Seller) with email verification',
          },
        }
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
          response: {
            200: LoginResponseSchema,
          },
          detail: {
            tags: ['Authentication'],
            summary: 'User Login',
            description: 'Authenticate user and generate access token',
          },
        }
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
          response: {
            200: RefreshTokenResponseSchema,
          },
          detail: {
            tags: ['Authentication'],
            summary: 'Refresh Token',
            description: 'Generate a new refresh token',
          },
        }
      )

      .use(authGuard())
      .post(
        '/logout',
        async ({ user, set, log, auth, neo4j }) => {
          try {
            const result = await logout(user, { auth, neo4j, log });

            set.headers['Set-Cookie'] =
              'Authorization=; HttpOnly; Max-Age=0; Path=/; SameSite=Strict';
            set.status = 200;

            return result;
          } catch (error) {
            throw error;
          }
        },
        {
          response: {
            200: LogoutResponseSchema,
          },
          detail: {
            tags: ['Authentication'],
            summary: 'User Logout',
            description: 'Logout authenticated user and clear session cookie',
          },
        }
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
          response: {
            200: ChangePasswordResponseSchema,
          },
          detail: {
            tags: ['Authentication'],
            summary: 'Change Password',
            description: 'Change authenticated user password',
          },
        }
      )

      .post(
        '/resendVerificationEmail/:email',
        async ({ params, auth, neo4j, log }) => {
          try {
            const result = await resendVerificationEmail(params.email, {
              auth,
              neo4j,
              log,
              resend,
            });
            return result;
          } catch (error) {
            throw error;
          }
        },
        {
          params: EmailParamSchema,
          response: {
            200: ResendVerificationEmailResponseSchema,
          },
          detail: {
            tags: ['Authentication'],
            summary: 'Resend Verification Email',
            description: 'Resend email verification link to user',
          },
        }
      )
  );
};

export default authRoutes;
