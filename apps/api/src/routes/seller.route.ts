import { Elysia, t } from 'elysia';
import {
  CreateSubscriptionPlansSchema,
  UpdatePlansSchema,
  AddPayoutAccountSchema,
  RequestWithdrawParamSchema,
  UploadSentPictureParamSchema,
  IdentityCardUploadSchema,
  SentPictureUploadSchema,
  IdParamSchema,
  CreateSubscriptionPlansResponseSchema,
  UpdatePlansResponseSchema,
  GetSellerPlansResponseSchema,
  GetPayoutAccountsResponseSchema,
  AddPayoutAccountResponseSchema,
  DeletePayoutAccountResponseSchema,
  RequestWithdrawResponseSchema,
  GetAllSellersResponseSchema,
  GetFollowersCountResponseSchema,
  UploadIdentityCardResponseSchema,
  UploadSentPictureResponseSchema,
} from '@feetflight/shared-types';
import { authGuard } from '@/plugins/auth.plugin';
import { sellerGuard } from '@/plugins/seller.plugin';
import {
  createSubscribePlans,
  getSubscriptionPlans,
  getPayoutAccounts,
  deletePayoutAccount,
  requestWithdraw,
  changePlans,
  addPayoutAccount,
  getAllSellers,
  getFollowersCount,
  uploadIdentityCard,
  uploadSentPicture,
} from '@/services/seller.service';
import { stripe } from '@/utils/stripe';
import { loggerPlugin, neo4jPlugin } from '@/plugins';

export const sellerRoutes = () => {
  return new Elysia({ name: 'routes.seller' })
    .group('/sellers', (app) =>
      app
        .use(neo4jPlugin())
        .use(loggerPlugin())
        .use(authGuard())

        .post(
          '/plans/:id',
          async ({ params, body, neo4j, log, set }) => {
            const result = await createSubscribePlans(params.id, body, {
              neo4j,
              log,
              stripe,
            });

            set.status = 201;
            return result;
          },
          {
            params: IdParamSchema,
            body: CreateSubscriptionPlansSchema,
            response: {
              201: CreateSubscriptionPlansResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Create Subscription Plans',
              description:
                'Create multiple subscription plans for a seller with Stripe integration',
            },
          }
        )

        .get(
          '/plans/:id',
          async ({ params, neo4j, log, set }) => {
            const result = await getSubscriptionPlans(params.id, { neo4j, log });

            set.status = 200;
            return result;
          },
          {
            params: IdParamSchema,
            response: {
              200: GetSellerPlansResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Get Subscription Plans',
              description: 'Retrieve all subscription plans for a specific seller',
            },
          }
        )

        .put(
          '/plans',
          async ({ body, neo4j, log, set }) => {
            const result = await changePlans(body.data.plans, { neo4j, log, stripe });

            set.status = 200;
            return result;
          },
          {
            body: UpdatePlansSchema,
            response: {
              200: UpdatePlansResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Update Subscription Plans',
              description: 'Update existing subscription plans with new prices and names',
            },
          }
        )

        .get(
          '/',
          async ({ neo4j, log, set }) => {
            const result = await getAllSellers({ neo4j, log });

            set.status = 200;
            return result;
          },
          {
            response: {
              200: GetAllSellersResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Get All Sellers',
              description: 'Retrieve all users who have seller accounts',
            },
          }
        )

        .get(
          '/followers/:id',
          async ({ params, neo4j, log, set }) => {
            const followersCount = await getFollowersCount(params.id, { neo4j, log });

            set.status = 200;
            return { followers: followersCount };
          },
          {
            params: IdParamSchema,
            response: {
              200: GetFollowersCountResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Get Followers Count',
              description: 'Get the number of followers/subscribers for a specific seller',
            },
          }
        )
        // ELLER GUARD (SELLER-ONLY OPERATIONS)
        .use(sellerGuard())
        .get(
          '/payout/:id',
          async ({ params, neo4j, log, set }) => {
            const payoutAccount = await getPayoutAccounts(params.id, { neo4j, log });

            set.status = 200;
            return payoutAccount;
          },
          {
            params: IdParamSchema,
            response: {
              200: GetPayoutAccountsResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Get Payout Accounts',
              description: 'Retrieve all payout accounts for a verified seller',
            },
          }
        )

        /**
         * @Mouaddiguoug NOTE: Should be DELETE method, but kept POST for backward compatibility
         */
        .post(
          '/payout/:id/:payoutAccountId',
          async ({ params, neo4j, log, set }) => {
            await deletePayoutAccount(params.payoutAccountId, { neo4j, log });

            set.status = 200;
            return { message: 'Your payout account has been deleted successfully!' };
          },
          {
            params: RequestWithdrawParamSchema,
            response: {
              200: DeletePayoutAccountResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Delete Payout Account',
              description: 'Delete a payout account for a verified seller',
            },
          }
        )

        .post(
          '/withdrawal/:id/:payoutAccountId',
          async ({ params, neo4j, log, set }) => {
            await requestWithdraw(params.id, params.payoutAccountId, { neo4j, log });

            set.status = 200;
            return { message: 'Your withdraw request is being processed!' };
          },
          {
            params: RequestWithdrawParamSchema,
            response: {
              200: RequestWithdrawResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Request Withdrawal',
              description: 'Create a withdrawal request for a verified seller',
            },
          }
        )

        .post(
          '/payout/:id',
          async ({ params, body, neo4j, log, set }) => {
            await addPayoutAccount(params.id, body, { neo4j, log });

            set.status = 201;
            return { message: 'Your payout account has been added successfully!' };
          },
          {
            params: IdParamSchema,
            body: AddPayoutAccountSchema,
            response: {
              201: AddPayoutAccountResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Add Payout Account',
              description: 'Add a new payout account for a verified seller',
            },
          }
        )
    )

    .group('/sellers', (app) =>
      app
        .use(neo4jPlugin())
        .use(loggerPlugin())
        /**
         * @Mouaddiguoug SECURITY ISSUE: No authentication required (matches original implementation)
         * This route should probably require authGuard, but i'm just following original routes
         */
        .post(
          '/upload/identitycard/:id',
          async ({ params, body, neo4j, log, set }) => {
            const frontSideFiles = await Promise.all(
              body.frontSide.map(async (file: File) => ({
                buffer: Buffer.from(await file.arrayBuffer()),
                mimetype: file.type,
                originalname: file.name,
                fieldname: 'frontSide',
              }))
            );

            const backSideFiles = await Promise.all(
              body.backSide.map(async (file: File) => ({
                buffer: Buffer.from(await file.arrayBuffer()),
                mimetype: file.type,
                originalname: file.name,
                fieldname: 'backSide',
              }))
            );

            await uploadIdentityCard(
              {
                frontSide: frontSideFiles,
                backSide: backSideFiles,
              },
              params.id,
              { neo4j, log }
            );

            set.status = 201;
            return { message: 'identity card has been uploaded successfully', status: 200 };
          },
          {
            params: IdParamSchema,
            body: IdentityCardUploadSchema,
            response: {
              201: UploadIdentityCardResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Upload Identity Card',
              description: 'Upload front and back images of identity card for seller verification',
            },
          }
        )

        .use(authGuard())
        .post(
          '/upload/sent/picture/:id/:tipAmount/:receiverId',
          async ({ params, body, neo4j, log, set }) => {
            const file = body.sentPicture;
            const fileObject = {
              buffer: Buffer.from(await file.arrayBuffer()),
              mimetype: file.type,
              originalname: file.name,
            };

            const sentPictureData = await uploadSentPicture(
              fileObject,
              params.id,
              params.tipAmount,
              params.receiverId,
              { neo4j, log, stripe }
            );

            set.status = 201;
            return sentPictureData;
          },
          {
            params: UploadSentPictureParamSchema,
            body: t.Object({
              sentPicture: SentPictureUploadSchema,
            }),
            response: {
              201: UploadSentPictureResponseSchema,
            },
            detail: {
              tags: ['Sellers'],
              summary: 'Upload Sent Picture',
              description: 'Upload a private picture from seller to buyer with optional tip amount',
            },
          }
        )
    );
};
