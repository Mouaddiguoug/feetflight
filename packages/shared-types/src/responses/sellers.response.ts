import { t } from 'elysia';
import { Static } from '@sinclair/typebox';
import { SubscriptionPlanSchema } from './users.response';

/**
 * SellerInfoSchema
 * Represents detailed seller information
 */
export const SellerInfoSchema = t.Object({
  id: t.String({
    description: 'Seller unique identifier',
  }),
  name: t.String({
    description: 'Seller name',
  }),
  userName: t.String({
    description: 'Seller username',
  }),
  email: t.String({
    format: 'email',
    description: 'Seller email',
  }),
  avatar: t.String({
    description: 'Seller avatar URL',
  }),
  phone: t.String({
    description: 'Seller phone number',
  }),
  verified: t.Boolean({
    description: 'Whether seller is verified',
  }),
  confirmed: t.Boolean({
    description: 'Whether seller email is confirmed',
  }),
  followers: t.Number({
    description: 'Number of followers',
    minimum: 0,
  }),
  followings: t.Number({
    description: 'Number of followings',
    minimum: 0,
  }),
  createdAt: t.String({
    description: 'Account creation timestamp',
  }),
});

export type SellerInfoResponse = Static<typeof SellerInfoSchema>;

/**
 * CreateSubscriptionPlansResponseSchema
 * Response for POST /sellers/plans
 */
export const CreateSubscriptionPlansResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  plans: t.Array(SubscriptionPlanSchema, {
    description: 'Created subscription plans',
  }),
});

export type CreateSubscriptionPlansResponse = Static<typeof CreateSubscriptionPlansResponseSchema>;

/**
 * UpdatePlansResponseSchema
 * Response for PATCH /sellers/plans
 */
export const UpdatePlansResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  updatedPlans: t.Array(SubscriptionPlanSchema, {
    description: 'Updated subscription plans',
  }),
});

export type UpdatePlansResponse = Static<typeof UpdatePlansResponseSchema>;

/**
 * GetSellerInfoResponseSchema
 * Response for GET /sellers/:userId
 */
export const GetSellerInfoResponseSchema = SellerInfoSchema;

export type GetSellerInfoResponse = Static<typeof GetSellerInfoResponseSchema>;

/**
 * UpdateSellerInfoResponseSchema
 * Response for PATCH /sellers/:userId
 */
export const UpdateSellerInfoResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  seller: SellerInfoSchema,
});

export type UpdateSellerInfoResponse = Static<typeof UpdateSellerInfoResponseSchema>;

/**
 * VerifySellerIdentityResponseSchema
 * Response for POST /sellers/verify-identity
 */
export const VerifySellerIdentityResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  verified: t.Boolean({
    description: 'Whether identity verification was successful',
  }),
});

export type VerifySellerIdentityResponse = Static<typeof VerifySellerIdentityResponseSchema>;

/**
 * PayoutAccountSchema
 * Represents a payout account
 */
export const PayoutAccountSchema = t.Object({
  id: t.String({
    description: 'Payout account ID',
  }),
  bankCountry: t.String({
    description: 'Bank country',
  }),
  city: t.String({
    description: 'City',
  }),
  bankName: t.String({
    description: 'Bank name',
  }),
  accountNumber: t.String({
    description: 'Account number',
  }),
  swift: t.String({
    description: 'SWIFT code',
  }),
  status: t.String({
    description: 'Account status (Pending, Verified, etc)',
  }),
});

export type PayoutAccount = Static<typeof PayoutAccountSchema>;

/**
 * GetPayoutAccountsResponseSchema
 * Response for GET /sellers/payout/:id
 */
export const GetPayoutAccountsResponseSchema = t.Array(PayoutAccountSchema, {
  description: 'List of payout accounts',
});

export type GetPayoutAccountsResponse = Static<typeof GetPayoutAccountsResponseSchema>;

/**
 * AddPayoutAccountResponseSchema
 * Response for POST /sellers/payout/:id
 */
export const AddPayoutAccountResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type AddPayoutAccountResponse = Static<typeof AddPayoutAccountResponseSchema>;

/**
 * DeletePayoutAccountResponseSchema
 * Response for POST /sellers/payout/:id/:payoutAccountId
 */
export const DeletePayoutAccountResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type DeletePayoutAccountResponse = Static<typeof DeletePayoutAccountResponseSchema>;

/**
 * RequestWithdrawResponseSchema
 * Response for POST /sellers/withdrawal/:id/:payoutAccountId
 */
export const RequestWithdrawResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type RequestWithdrawResponse = Static<typeof RequestWithdrawResponseSchema>;

/**
 * GetAllSellersResponseSchema
 * Response for GET /sellers
 */
export const GetAllSellersResponseSchema = t.Array(SellerInfoSchema, {
  description: 'List of all sellers',
});

export type GetAllSellersResponse = Static<typeof GetAllSellersResponseSchema>;

/**
 * GetFollowersCountResponseSchema
 * Response for GET /sellers/followers/:id
 */
export const GetFollowersCountResponseSchema = t.Object({
  followers: t.Number({
    description: 'Number of followers',
    minimum: 0,
  }),
});

export type GetFollowersCountResponse = Static<typeof GetFollowersCountResponseSchema>;

/**
 * UploadIdentityCardResponseSchema
 * Response for POST /sellers/upload/identitycard/:id
 */
export const UploadIdentityCardResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  status: t.Number({
    description: 'HTTP status code',
  }),
});

export type UploadIdentityCardResponse = Static<typeof UploadIdentityCardResponseSchema>;

/**
 * UploadSentPictureResponseSchema
 * Response for POST /sellers/upload/sent/picture/:id/:tipAmount/:receiverId
 */
export const UploadSentPictureResponseSchema = t.Object({
  pictureId: t.String({
    description: 'Uploaded picture ID',
  }),
  path: t.String({
    description: 'Public path to uploaded picture',
  }),
});

export type UploadSentPictureResponse = Static<typeof UploadSentPictureResponseSchema>;
