import { t } from 'elysia';
import { Static } from '@sinclair/typebox';


export const UpdateBalanceSchema = t.Object({
  amount: t.Number({
    error: 'Amount must be a valid number',
  }),
});

export type UpdateBalanceDTO = Static<typeof UpdateBalanceSchema>;
