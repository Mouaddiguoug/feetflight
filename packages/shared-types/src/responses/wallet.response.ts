import { t } from 'elysia';
import { Static } from '@sinclair/typebox';

/**
 * GetBalanceResponseSchema
 * Response for GET /wallet/:sellerId/balance
 */
export const GetBalanceResponseSchema = t.Object({
  balance: t.Number({
    description: 'Current wallet balance',
    minimum: 0,
  }),
  sellerId: t.String({
    description: 'Seller ID',
  }),
});

export type GetBalanceResponse = Static<typeof GetBalanceResponseSchema>;

/**
 * UpdateBalanceResponseSchema
 * Response for PUT /wallet/:sellerId/balance
 */
export const UpdateBalanceResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  newBalance: t.Number({
    description: 'Updated balance',
    minimum: 0,
  }),
});

export type UpdateBalanceResponse = Static<typeof UpdateBalanceResponseSchema>;

/**
 * WithdrawBalanceResponseSchema
 * Response for POST /wallet/:sellerId/withdraw
 */
export const WithdrawBalanceResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  withdrawnAmount: t.Number({
    description: 'Amount withdrawn',
    minimum: 0,
  }),
  remainingBalance: t.Number({
    description: 'Remaining balance after withdrawal',
    minimum: 0,
  }),
  transactionId: t.String({
    description: 'Transaction/transfer ID',
  }),
});

export type WithdrawBalanceResponse = Static<typeof WithdrawBalanceResponseSchema>;
