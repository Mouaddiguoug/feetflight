import { t } from 'elysia';
import { Static } from '@sinclair/typebox';

/**
 * UpdateUserSchema
 * Use for PATCH /users/:id route validation
 * Validates user profile updates
 * Requires at least one updatable field to be present
 */
export const UpdateUserSchema = t.Object({
  data: t.Object(
    {
      name: t.Optional(
        t.String({
          minLength: 2,
          error: 'Name must be at least 2 characters',
        }),
      ),
      userName: t.Optional(
        t.String({
          minLength: 3,
          error: 'Username must be at least 3 characters',
        }),
      ),
    },
    {
      minProperties: 1,
      additionalProperties: false,
    },
  ),
});

export type UpdateUserDTO = Static<typeof UpdateUserSchema>;

/**
 * GenerateOtpParamSchema
 * Use for POST /generate-otp/:email route validation
 * Validates email parameter for OTP generation
 */
export const GenerateOtpParamSchema = t.Object({
  email: t.String({
    format: 'email',
    error: 'Invalid email format',
  }),
});

export type GenerateOtpParamDTO = Static<typeof GenerateOtpParamSchema>;

/**
 * VerifyOtpSchema
 * Use for POST /verify-otp route validation
 * Validates OTP verification request
 */
export const VerifyOtpSchema = t.Object({
  otp: t.String({
    pattern: '^[0-9]{4}$',
    error: 'OTP must be a 4-digit number',
  }),
  hash: t.String({
    minLength: 1,
    error: 'Hash is required',
  }),
});

export type VerifyOtpDTO = Static<typeof VerifyOtpSchema>;

/**
 * ContactFormSchema
 * Use for POST /contact route validation
 * Validates contact form submission
 */
export const ContactFormSchema = t.Object({
  name: t.String({
    minLength: 2,
    error: 'Name must be at least 2 characters',
  }),
  email: t.String({
    format: 'email',
    error: 'Invalid email format',
  }),
  number: t.String({
    pattern: '^\\+?[1-9]\\d{1,14}$',
    error: 'Invalid phone number format',
  }),
  message: t.String({
    minLength: 10,
    maxLength: 1000,
    error: 'Message must be between 10 and 1000 characters',
  }),
});

export type ContactFormDTO = Static<typeof ContactFormSchema>;

/**
 * DeviceTokenSchema
 * Use for POST /device-token route validation
 * Validates device token upload
 */
export const DeviceTokenSchema = t.Object({
  token: t.String({
    minLength: 1,
    error: 'Device token is required',
  }),
});

export type DeviceTokenDTO = Static<typeof DeviceTokenSchema>;

/**
 * GenerateAiPicturesSchema
 * Use for POST /generate-ai-pictures route validation
 * Validates AI picture generation request
 */
export const GenerateAiPicturesSchema = t.Object({
  color: t.String({
    minLength: 3,
    error: 'Color must be at least 3 characters',
  }),
  category: t.String({
    minLength: 3,
    error: 'Category must be at least 3 characters',
  }),
});

export type GenerateAiPicturesDTO = Static<typeof GenerateAiPicturesSchema>;

/**
 * BuyPostSchema
 * Use for POST /buy-post route validation
 * Validates post purchase request
 */
export const BuyPostSchema = t.Object({
  data: t.Object({
    posts: t.Array(
      t.Object({
        id: t.String(),
      }),
      {
        minItems: 1,
        error: 'At least one post must be selected',
      },
    ),
  }),
});

export type BuyPostDTO = Static<typeof BuyPostSchema>;

/**
 * SubscriptionSchema
 * Use for POST /subscription route validation
 * Validates subscription creation
 */
export const SubscriptionSchema = t.Object({
  data: t.Object({
    sellerId: t.String({
      error: 'Seller ID is required',
    }),
    subscriptionPlanId: t.String({
      error: 'Subscription plan ID is required',
    }),
    subscriptionPlanTitle: t.String({
      error: 'Subscription plan title is required',
    }),
    subscriptionPlanPrice: t.Numeric({
      minimum: 0,
      error: 'Subscription plan price must be a positive number',
    }),
  }),
});

export type SubscriptionDTO = Static<typeof SubscriptionSchema>;

/**
 * UnlockSentPictureSchema
 * Use for POST /unlock-sent-picture route validation
 * Validates sent picture unlock request
 */
export const UnlockSentPictureSchema = t.Object({
  pictureId: t.String({
    error: 'Picture ID is required',
  }),
  messageId: t.String({
    error: 'Message ID is required',
  }),
  tipAmount: t.Number({
    minimum: 0,
    error: 'Tip amount must be a positive number',
  }),
  chatRoomId: t.String({
    error: 'Chat room ID is required',
  }),
});

export type UnlockSentPictureDTO = Static<typeof UnlockSentPictureSchema>;

/**
 * CancelSubscriptionSchema
 * Use for DELETE /subscription/:id route validation (DEPRECATED)
 * Validates subscription cancellation
 */
export const CancelSubscriptionSchema = t.Object({
  data: t.Object({
    userId: t.String({
      error: 'User ID is required',
    }),
  }),
});

export type CancelSubscriptionDTO = Static<typeof CancelSubscriptionSchema>;

/**
 * CancelSubscriptionParamSchema
 * Use for POST /subscription/:id/cancel route validation
 * Validates user ID and seller user ID parameters for subscription cancellation
 */
export const CancelSubscriptionParamSchema = t.Object({
  id: t.String({
    error: 'User ID is required',
  }),
  sellerUserId: t.String({
    error: 'Seller user ID is required',
  }),
});

export type CancelSubscriptionParamDTO = Static<typeof CancelSubscriptionParamSchema>;

/**
 * GetFollowedSellersParamSchema
 * Use for GET /users/followed/:id/:role route validation
 * Validates user ID and role parameters for fetching followed sellers
 */
export const GetFollowedSellersParamSchema = t.Object({
  id: t.String({
    error: 'User ID is required',
  }),
  role: t.String({
    enum: ['Buyer', 'Seller'],
    error: 'Role must be either Buyer or Seller',
  }),
});

export type GetFollowedSellersParamDTO = Static<typeof GetFollowedSellersParamSchema>;

/**
 * CheckSubscriptionSchema
 * Use for POST /users/verify/checkForSubscription/:id route validation
 * Validates seller user ID for checking subscription status
 */
export const CheckSubscriptionSchema = t.Object({
  data: t.Object({
    userId: t.String({
      error: 'Seller user ID is required',
    }),
  }),
});

export type CheckSubscriptionDTO = Static<typeof CheckSubscriptionSchema>;

/**
 * CheckSubscriptionParamSchema
 * Use for GET /users/verify/checkForSubscription/:id/:sellerUserId route validation
 * Validates user ID and seller user ID parameters for checking subscription status
 */
export const CheckSubscriptionParamSchema = t.Object({
  id: t.String({
    error: 'User ID is required',
  }),
  sellerUserId: t.String({
    error: 'Seller user ID is required',
  }),
});

export type CheckSubscriptionParamDTO = Static<typeof CheckSubscriptionParamSchema>;
