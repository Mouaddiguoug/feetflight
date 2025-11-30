import { Elysia, t } from 'elysia';
import {
  UpdateUserSchema,
  GenerateOtpParamSchema,
  VerifyOtpSchema,
  ContactFormSchema,
  DeviceTokenSchema,
  GenerateAiPicturesSchema,
  BuyPostSchema,
  SubscriptionSchema,
  UnlockSentPictureSchema,
  CancelSubscriptionParamSchema,
  GetFollowedSellersParamSchema,
  CheckSubscriptionSchema,
  CheckSubscriptionParamSchema,
  ChangePasswordSchema,
  EmailParamSchema,
  CheckForSaleParamSchema,
  AvatarUploadSchema,
  IdParamSchema,
  TokenParamSchema,
  EmailConfirmationResponseSchema,
  GenerateAiPicturesResponseSchema,
  GetUserResponseSchema,
  GenerateOtpResponseSchema,
  VerifyOtpResponseSchema,
  ContactResponseSchema,
  SignOutResponseSchema,
  SubscribeResponseSchema,
  BuyPostsResponseSchema,
  UnlockSentPictureResponseSchema,
  CancelSubscriptionResponseSchema,
  CheckForSaleResponseSchema,
  GetSellerPlansResponseSchema,
  GetFollowedSellersResponseSchema,
  CheckSubscriptionByUserIdResponseSchema,
  UpdateUserResponseSchema,
  UploadAvatarResponseSchema,
  UploadDeviceTokenResponseSchema,
  DesactivateUserResponseSchema,
  ChangePasswordResponseSchema,
} from '@feetflight/shared-types';
import { authGuard, authPlugin, ForbiddenError, loggerPlugin, neo4jPlugin } from '@/plugins';
import {
  findUserById,
  generateAiPictures,
  changePassword,
  emailConfirming,
  updateUser,
  buyPosts,
  subscribe,
  unlockSentPicture,
  cancelSubscription,
  generateOtp,
  verifyOtp,
  contact,
  signOut,
  checkForSale,
  checkForSubscriptionbyUserId,
  getSellerPlans,
  getFollowedSellers,
  uploadAvatar,
  uploadDeviceToken,
  desactivateUser,
  getAllSubscriptionsForUser,
} from '@/services/users.service';
import { stripe } from '@/utils/stripe';
import { resend } from '@/utils/resend';

export function usersRoutes() {
  return new Elysia({ name: 'routes.users' }).group('/users', (app) =>
    app
      .use(neo4jPlugin())
      .use(loggerPlugin())
      .use(authPlugin())
      .derive((ctx) => {
        return {
          UserServiceDeps: {
            auth: ctx.auth,
            stripe,
            resend,
            neo4j: ctx.neo4j,
            log: ctx.log,
          },
        };
      })

      .get(
        '/confirmation/:token',
        async ({ params, set, UserServiceDeps }) => {
          await emailConfirming(params.token, UserServiceDeps);
          set.redirect = '/public/views/success_pages/verifyEmailSuccess.html';
          set.status = 200;
          return { message: 'Email confirmed successfully' };
        },
        {
          params: TokenParamSchema,
          response: {
            200: EmailConfirmationResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Email Confirmation',
            description:
              'Confirms user email using verification token and redirects to success page',
          },
        }
      )

      .get(
        '/ai/generatePictures',
        async ({ query, UserServiceDeps }) => {
          const { color, category } = query;
          return await generateAiPictures(color, category, UserServiceDeps);
        },
        {
          query: GenerateAiPicturesSchema,
          response: {
            200: GenerateAiPicturesResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Generate AI Pictures',
            description:
              'Generates AI pictures of feet using OpenAI based on color and category parameters',
          },
        }
      )

      .post(
        '/generateOtp/:email',
        async ({ params, UserServiceDeps, set }) => {
          const hash = await generateOtp(params.email, UserServiceDeps);
          set.status = 201;
          return hash;
        },
        {
          params: GenerateOtpParamSchema,
          response: {
            201: GenerateOtpResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Generate OTP',
            description:
              'Generates and sends a 4-digit OTP to user email for password reset (valid for 2 minutes). Returns raw hash string for backward compatibility.',
          },
        }
      )

      .post(
        '/verifyOtp/:email',
        async ({ params, body, set, UserServiceDeps }) => {
          const result = await verifyOtp(body, params.email, UserServiceDeps);
          if (result.message === 'success') {
            set.headers['Set-Cookie'] = UserServiceDeps.auth.createCookie(result.tokenData);
            set.status = 200;
          } else {
            set.status = 400;
          }
          return result;
        },
        {
          params: GenerateOtpParamSchema,
          body: VerifyOtpSchema,
          response: {
            200: VerifyOtpResponseSchema,
            400: VerifyOtpResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Verify OTP',
            description: 'Verifies OTP and returns access token with user data',
          },
        }
      )

      .post(
        '/contact',
        async ({ body, UserServiceDeps, set }) => {
          await contact(body, UserServiceDeps);
          set.status = 201;
          return { message: 'Contact form submitted successfully' };
        },
        {
          body: ContactFormSchema,
          response: {
            201: ContactResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Contact Form',
            description: 'Submits contact form and sends email to admin',
          },
        }
      )

      .get(
        '/verify/checkForSale/:userId/:postId/:plan',
        async ({ params, UserServiceDeps }) => {
          const checkedForSale = await checkForSale(params.userId, params.postId, UserServiceDeps);
          const checkForSubscription = await checkForSubscriptionbyUserId(
            params.userId,
            params.postId,
            params.plan,
            UserServiceDeps
          );
          return {
            postId: params.postId,
            hasPurchased: checkedForSale || checkForSubscription,
          };
        },
        {
          params: CheckForSaleParamSchema,
          response: {
            200: CheckForSaleResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Check For Sale',
            description: 'Checks if user has already bought the post or has active subscription',
          },
        }
      )

      .use(authGuard())
      .get(
        '/:id',
        async ({ params, UserServiceDeps }) => {
          const user = await findUserById(params.id, UserServiceDeps);
          return user;
        },
        {
          params: IdParamSchema,
          response: {
            200: GetUserResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Get User By ID',
            description: 'Returns user profile data for the given ID',
          },
        }
      )

      .post(
        '/buy/:id',
        async ({ params, body, UserServiceDeps }) => {
          await buyPosts(params.id, body, UserServiceDeps);
          return {
            message: 'Posts purchased successfully',
            purchasedPosts: body.data.posts.map((p: { id: string }) => p.id),
          };
        },
        {
          params: IdParamSchema,
          body: BuyPostSchema,
          response: {
            200: BuyPostsResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Buy Posts',
            description: 'Creates Stripe checkout session to purchase posts',
          },
        }
      )

      .post(
        '/subscribe/:id',
        async ({ params, body, UserServiceDeps }) => {
          const session = await subscribe(params.id, body, UserServiceDeps);
          return session;
        },
        {
          params: IdParamSchema,
          body: SubscriptionSchema,
          response: {
            200: SubscribeResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Subscribe to Seller',
            description: 'Creates Stripe subscription checkout session',
          },
        }
      )

      .post(
        '/buy/sent/:id',
        async ({ params, body, UserServiceDeps }) => {
          const pictureUrl = await unlockSentPicture(params.id, body, UserServiceDeps);
          return {
            message: 'Picture unlocked successfully',
            pictureUrl,
          };
        },
        {
          params: IdParamSchema,
          body: UnlockSentPictureSchema,
          response: {
            200: UnlockSentPictureResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Unlock Sent Picture',
            description:
              'Creates Stripe checkout session to unlock a sent picture. Returns { url } containing the checkout URL for consistency with buyPosts endpoint.',
          },
        }
      )

      .post(
        '/subscription/:id/cancel/:sellerUserId',
        async ({ params, neo4j, UserServiceDeps }) => {
          const sellerId = await neo4j.withSession(async (session) => {
            const result = await session.executeRead((tx) =>
              tx.run('match (user {id: $userId})-[:IS_A]-(s:seller) return s', {
                userId: params.sellerUserId,
              })
            );
            return result.records[0]?.get('s').properties.id;
          });

          const result = await cancelSubscription(params.id, sellerId, UserServiceDeps);
          return result;
        },
        {
          params: CancelSubscriptionParamSchema,
          response: {
            200: CancelSubscriptionResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Cancel Subscription',
            description: 'Cancels active subscription to a seller using path parameters',
          },
        }
      )

      .get(
        '/plans/:id',
        async ({ params, UserServiceDeps }) => {
          const plans = await getSellerPlans(params.id, UserServiceDeps);
          return { plans };
        },
        {
          params: IdParamSchema,
          response: {
            200: GetSellerPlansResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Get Seller Plans',
            description: 'Returns subscription plans for the given seller',
          },
        }
      )

      .put(
        '/:id',
        async ({ params, body, UserServiceDeps }) => {
          const updatedUser = await updateUser(params.id, body, UserServiceDeps);
          return { data: updatedUser, message: 'updated' };
        },
        {
          params: IdParamSchema,
          body: UpdateUserSchema,
          response: {
            200: UpdateUserResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Update User',
            description: 'Updates user profile data',
          },
        }
      )

      .post(
        '/signout/:id',
        async ({ params, UserServiceDeps, set }) => {
          const result = await signOut(params.id, UserServiceDeps);
          set.status = result ? 200 : 400;
          return {
            message: result ? 'You have logged out successfully' : 'Something went wrong',
          };
        },
        {
          params: IdParamSchema,
          response: {
            200: SignOutResponseSchema,
            400: SignOutResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Sign Out',
            description: 'Signs out user by clearing device token',
          },
        }
      )

      .get(
        '/verify/checkForSubscription/:id/:sellerUserId',
        async ({ params, UserServiceDeps }) => {
          const subscriptions = await getAllSubscriptionsForUser(params.id, UserServiceDeps);
          return { subscriptions };
        },
        {
          params: CheckSubscriptionParamSchema,
          response: {
            200: CheckSubscriptionByUserIdResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Check For Subscription (GET)',
            description:
              '[DEPRECATED] Use POST variant instead. Checks if user is subscribed to seller. Migrate to POST /verify/checkForSubscription/:id with body for cleaner semantics.',
          },
        }
      )

      .post(
        '/verify/checkForSubscription/:id',
        async ({ params, UserServiceDeps }) => {
          const subscriptions = await getAllSubscriptionsForUser(params.id, UserServiceDeps);
          return { subscriptions };
        },
        {
          params: IdParamSchema,
          body: CheckSubscriptionSchema,
          response: {
            200: CheckSubscriptionByUserIdResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Check For Subscription',
            description: 'Checks if user is subscribed to seller',
          },
        }
      )

      .post(
        '/devices/token/:id',
        async ({ params, body, UserServiceDeps }) => {
          await uploadDeviceToken(params.id, body.token, UserServiceDeps);
          return { message: 'token uploaded successfully' };
        },
        {
          params: IdParamSchema,
          body: DeviceTokenSchema,
          response: {
            200: UploadDeviceTokenResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Upload Device Token',
            description: 'Uploads FCM device token for push notifications',
          },
        }
      )

      .get(
        '/followed/:id/:role',
        async ({ params, UserServiceDeps }) => {
          const followedSellers = await getFollowedSellers(params.id, params.role, UserServiceDeps);
          return followedSellers;
        },
        {
          params: GetFollowedSellersParamSchema,
          response: {
            200: GetFollowedSellersResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Get Followed Sellers',
            description: 'Returns list of followed sellers (buyers) or subscribers (sellers)',
          },
        }
      )

      .post(
        '/upload/avatar/:id',
        async ({ params, body, UserServiceDeps }) => {
          const avatarFile = body.avatar;

          const buffer = Buffer.from(await avatarFile.arrayBuffer());
          const avatarData = {
            buffer,
            mimetype: avatarFile.type,
            fieldname: 'avatar',
          };

          await uploadAvatar(avatarData, params.id, UserServiceDeps);
          const fileExt = avatarFile.type.split('/')[1];
          const avatarUrl = `/public/files/avatars/avatar${params.id}.${fileExt}`;
          return {
            message: 'avatar has been uploaded successfully',
            avatarUrl,
          };
        },
        {
          params: IdParamSchema,
          body: t.Object({
            avatar: AvatarUploadSchema,
          }),
          response: {
            200: UploadAvatarResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Upload Avatar',
            description: 'Uploads user avatar image (max 5MB, JPEG/PNG/WebP)',
          },
        }
      )

      .patch(
        '/password/:email',
        async ({ params, body, UserServiceDeps, user, set }) => {
          await changePassword(params.email, body, UserServiceDeps, user.id);
          set.status = 200;
          return { message: 'Password changed successfully' };
        },
        {
          params: EmailParamSchema,
          body: ChangePasswordSchema,
          response: {
            200: ChangePasswordResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Change Password',
            description: 'Changes user password (requires authentication and ownership)',
          },
        }
      )

      .post(
        '/desactivate/:id',
        async ({ params, user, UserServiceDeps }) => {
          if (user.id !== params.id) {
            throw new ForbiddenError('You are not authorized to deactivate this account');
          }

          await desactivateUser(params.id, UserServiceDeps);
          return { message: 'User account has been deactivated' };
        },
        {
          params: IdParamSchema,
          response: {
            200: DesactivateUserResponseSchema,
          },
          detail: {
            tags: ['Users'],
            summary: 'Deactivate User',
            description: 'Deactivates user account (requires authentication and ownership)',
          },
        }
      )
  );
}

export default usersRoutes;
