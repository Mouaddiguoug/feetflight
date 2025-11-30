import { t } from 'elysia';
import { Static } from '@sinclair/typebox';

/**
 * CreateSubscriptionPlansSchema
 * Use for POST /subscription-plans route validation
 * Validates subscription plan creation
 */
export const CreateSubscriptionPlansSchema = t.Object({
  data: t.Object({
    subscriptionPlans: t.Array(
      t.Object({
        subscriptionPlanTitle: t.String({
          minLength: 3,
        }),
        subscriptionPlanPrice: t.Numeric({
          minimum: 0,
        }),
      }),
      {
        minItems: 1,
        error: 'At least one subscription plan is required',
      },
    ),
  }),
});

export type CreateSubscriptionPlansDTO = Static<typeof CreateSubscriptionPlansSchema>;

/**
 * UpdatePlansSchema
 * Use for PATCH /plans route validation
 * Validates subscription plan updates
 */
export const UpdatePlansSchema = t.Object({
  data: t.Object({
    plans: t.Array(
      t.Object({
        id: t.String(),
        name: t.String({
          minLength: 3,
        }),
        price: t.Numeric({
          minimum: 0,
        }),
      }),
      {
        minItems: 1,
        error: 'At least one plan must be provided',
      },
    ),
  }),
});

export type UpdatePlansDTO = Static<typeof UpdatePlansSchema>;

/**
 * AddPayoutAccountSchema
 * Use for POST /payout-account route validation
 * Validates payout account addition with SWIFT/BIC code validation
 */
export const AddPayoutAccountSchema = t.Object({
  bankCountry: t.String({
    minLength: 2,
    error: 'Bank country is required',
  }),
  city: t.String({
    minLength: 2,
    error: 'City is required',
  }),
  bankName: t.String({
    minLength: 2,
    error: 'Bank name is required',
  }),
  accountNumber: t.String({
    pattern: '^[0-9]{8,20}$',
    error: 'Account number must be 8-20 digits',
  }),
  swift: t.String({
    pattern: '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$',
    error: 'Invalid SWIFT/BIC code format',
  }),
});

export type AddPayoutAccountDTO = Static<typeof AddPayoutAccountSchema>;

/**
 * RequestWithdrawParamSchema
 * Use for POST /withdraw/:id/:payoutAccountId route validation
 * Validates withdrawal request parameters
 */
export const RequestWithdrawParamSchema = t.Object({
  id: t.String({
    error: 'User ID is required',
  }),
  payoutAccountId: t.String({
    error: 'Payout account ID is required',
  }),
});

export type RequestWithdrawParamDTO = Static<typeof RequestWithdrawParamSchema>;

/**
 * UploadSentPictureParamSchema
 * Use for POST /sent-picture/:id/:tipAmount/:receiverId route validation
 * Validates sent picture upload parameters
 */
export const UploadSentPictureParamSchema = t.Object({
  id: t.String({
    error: 'User ID is required',
  }),
  tipAmount: t.String({
    pattern: '^[0-9]+(\\.[0-9]{1,2})?$',
    error: 'Tip amount must be a valid number',
  }),
  receiverId: t.String({
    error: 'Receiver ID is required',
  }),
});

export type UploadSentPictureParamDTO = Static<typeof UploadSentPictureParamSchema>;
