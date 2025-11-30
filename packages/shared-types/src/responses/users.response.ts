import { t } from 'elysia';
import { Static } from '@sinclair/typebox';
import { UserDataSchema } from './auth.response';

/**
 * EmailConfirmationResponseSchema
 * Response for GET /users/confirmation/:token
 */
export const EmailConfirmationResponseSchema = t.Object({
  message: t.String({
    description: 'Confirmation result message',
  }),
});

export type EmailConfirmationResponse = Static<typeof EmailConfirmationResponseSchema>;

/**
 * AiPictureSchema
 * Single AI-generated picture
 */
export const AiPictureSchema = t.Object({
  url: t.String({
    description: 'Generated image URL',
  }),
});

/**
 * GenerateAiPicturesResponseSchema
 * Response for GET /users/ai/generatePictures
 */
export const GenerateAiPicturesResponseSchema = t.Object({
  images: t.Array(AiPictureSchema, {
    description: 'Array of generated images',
  }),
});

export type GenerateAiPicturesResponse = Static<typeof GenerateAiPicturesResponseSchema>;

/**
 * GetUserResponseSchema
 * Response for GET /users/:userId
 */
export const GetUserResponseSchema = UserDataSchema;

export type GetUserResponse = Static<typeof GetUserResponseSchema>;

/**
 * UpdateUserResponseSchema
 * Response for PATCH /users/updateUser/:userId
 */
export const UpdateUserResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  data: UserDataSchema,
});

export type UpdateUserResponse = Static<typeof UpdateUserResponseSchema>;

/**
 * GenerateOtpResponseSchema
 * Response for POST /users/generateOtp
 */
export const GenerateOtpResponseSchema = t.Object({
  hash: t.String({
    description: 'OTP hash for verification',
  }),
  message: t.String({
    description: 'Success message',
  }),
});

export type GenerateOtpResponse = Static<typeof GenerateOtpResponseSchema>;

/**
 * VerifyOtpResponseSchema
 * Response for POST /users/verifyOtp
 */
export const VerifyOtpResponseSchema = t.Object({
  message: t.String({
    description: 'Verification result message',
  }),
  verified: t.Boolean({
    description: 'Whether OTP was successfully verified',
  }),
});

export type VerifyOtpResponse = Static<typeof VerifyOtpResponseSchema>;

/**
 * ContactResponseSchema
 * Response for POST /users/contact
 */
export const ContactResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type ContactResponse = Static<typeof ContactResponseSchema>;

/**
 * SignOutResponseSchema
 * Response for POST /users/signOut
 */
export const SignOutResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type SignOutResponse = Static<typeof SignOutResponseSchema>;

/**
 * SubscriptionPlanSchema
 * Represents a subscription plan
 */
export const SubscriptionPlanSchema = t.Object({
  id: t.String({
    description: 'Plan unique identifier',
  }),
  name: t.String({
    description: 'Plan name',
  }),
  price: t.Number({
    description: 'Plan price',
    minimum: 0,
  }),
});

export type SubscriptionPlanResponse = Static<typeof SubscriptionPlanSchema>;

/**
 * SubscribeResponseSchema
 * Response for POST /users/subscribe
 */
export const SubscribeResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  subscriptionId: t.String({
    description: 'Created subscription ID',
  }),
});

export type SubscribeResponse = Static<typeof SubscribeResponseSchema>;

/**
 * BuyPostsResponseSchema
 * Response for POST /users/buyPosts
 */
export const BuyPostsResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  purchasedPosts: t.Array(
    t.String({
      description: 'Post IDs',
    }),
    {
      description: 'Array of purchased post IDs',
    },
  ),
});

export type BuyPostsResponse = Static<typeof BuyPostsResponseSchema>;

/**
 * UnlockSentPictureResponseSchema
 * Response for POST /users/unlockSentPicture
 */
export const UnlockSentPictureResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  pictureUrl: t.String({
    description: 'Unlocked picture URL',
  }),
});

export type UnlockSentPictureResponse = Static<typeof UnlockSentPictureResponseSchema>;

/**
 * CancelSubscriptionResponseSchema
 * Response for POST /users/cancelSubscription
 */
export const CancelSubscriptionResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type CancelSubscriptionResponse = Static<typeof CancelSubscriptionResponseSchema>;

/**
 * CheckForSaleResponseSchema
 * Response for GET /users/checkForSale/:postId
 */
export const CheckForSaleResponseSchema = t.Object({
  hasPurchased: t.Boolean({
    description: 'Whether user has purchased this post',
  }),
  postId: t.String({
    description: 'Post ID',
  }),
});

export type CheckForSaleResponse = Static<typeof CheckForSaleResponseSchema>;

/**
 * CheckForSubscriptionResponseSchema
 * Response for GET /users/checkForSubscription/:userId/:sellerId
 */
export const CheckForSubscriptionResponseSchema = t.Object({
  isSubscribed: t.Boolean({
    description: 'Whether user is subscribed to seller',
  }),
  subscriptionId: t.Optional(
    t.String({
      description: 'Active subscription ID if subscribed',
    }),
  ),
});

export type CheckForSubscriptionResponse = Static<typeof CheckForSubscriptionResponseSchema>;

/**
 * CheckSubscriptionByUserIdResponseSchema
 * Response for GET /users/checkSubscriptionbyUserId/:userId
 */
export const CheckSubscriptionByUserIdResponseSchema = t.Object({
  subscriptions: t.Array(
    t.Object({
      sellerId: t.String({
        description: 'Seller ID',
      }),
      subscriptionId: t.String({
        description: 'Subscription ID',
      }),
      planName: t.String({
        description: 'Plan name',
      }),
      planPrice: t.Number({
        description: 'Plan price',
        minimum: 0,
      }),
    }),
    {
      description: 'Array of active subscriptions',
    },
  ),
});

export type CheckSubscriptionByUserIdResponse = Static<typeof CheckSubscriptionByUserIdResponseSchema>;

/**
 * GetSellerPlansResponseSchema
 * Response for GET /users/getSellerPlans/:sellerId
 */
export const GetSellerPlansResponseSchema = t.Object({
  plans: t.Array(SubscriptionPlanSchema, {
    description: 'Array of seller subscription plans',
  }),
});

export type GetSellerPlansResponse = Static<typeof GetSellerPlansResponseSchema>;

/**
 * FollowedSellerSchema
 * Represents a followed seller
 */
export const FollowedSellerSchema = t.Object({
  id: t.String({
    description: 'Seller ID',
  }),
  name: t.String({
    description: 'Seller name',
  }),
  userName: t.String({
    description: 'Seller username',
  }),
  avatar: t.String({
    description: 'Seller avatar URL',
  }),
  verified: t.Boolean({
    description: 'Whether seller is verified',
  }),
});

/**
 * GetFollowedSellersResponseSchema
 * Response for GET /users/getFollowedSellers/:userId
 */
export const GetFollowedSellersResponseSchema = t.Object({
  sellers: t.Array(FollowedSellerSchema, {
    description: 'Array of followed sellers',
  }),
});

export type GetFollowedSellersResponse = Static<typeof GetFollowedSellersResponseSchema>;

/**
 * UploadAvatarResponseSchema
 * Response for PATCH /users/uploadAvatar/:userId
 */
export const UploadAvatarResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  avatarUrl: t.String({
    description: 'Uploaded avatar URL',
  }),
});

export type UploadAvatarResponse = Static<typeof UploadAvatarResponseSchema>;

/**
 * UploadDeviceTokenResponseSchema
 * Response for POST /users/uploadDeviceToken/:userId
 */
export const UploadDeviceTokenResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type UploadDeviceTokenResponse = Static<typeof UploadDeviceTokenResponseSchema>;

/**
 * DesactivateUserResponseSchema
 * Response for DELETE /users/desactivateUser/:userId
 */
export const DesactivateUserResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type DesactivateUserResponse = Static<typeof DesactivateUserResponseSchema>;

/**
 * ChangePasswordResponseSchema
 * Response for PATCH /users/password/:email
 */
export const ChangePasswordResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
});

export type ChangePasswordResponse = Static<typeof ChangePasswordResponseSchema>;
