import { Elysia } from 'elysia';
import {
  UpdateBalanceSchema,
  UserIdParamSchema,
  SellerIdParamSchema,
  GetBalanceResponseSchema,
  UpdateBalanceResponseSchema,
} from '@feetflight/shared-types';
import { authGuard } from '@/plugins/auth.plugin';
import { getBalance, updateBalance } from '@/services/wallet.service';

export const walletRoutes = () => {
  return new Elysia({ name: 'routes.wallet' }).group('/wallet', (app) =>
    app
      .use(authGuard())
      .get(
        '/:userId',
        async ({ params, neo4j, log, set }) => {
          const result = await getBalance(params.userId, { neo4j, log });
          set.status = 200;
          return result;
        },
        {
          params: UserIdParamSchema,
          response: {
            200: GetBalanceResponseSchema,
          },
          detail: {
            tags: ['Wallet'],
            summary: 'Get Wallet Balance',
            description: 'Retrieves the wallet balance for a user by their user ID',
          },
        }
      )

      .put(
        '/:sellerId',
        async ({ params, body, neo4j, log, set }) => {
          const result = await updateBalance(params.sellerId, body, { neo4j, log });
          set.status = 200;
          return result;
        },
        {
          params: SellerIdParamSchema,
          body: UpdateBalanceSchema,
          response: {
            200: UpdateBalanceResponseSchema,
          },
          detail: {
            tags: ['Wallet'],
            summary: 'Update Wallet Balance',
            description:
              'Manually updates wallet balance for a seller by their seller ID (for admin adjustments, no commission applied). Use positive amounts to add funds, negative amounts to subtract funds. Business Rule: Balances cannot be negative - if an update would result in a negative balance, a 400 error is returned.',
          },
        }
      )
  );
};

export default walletRoutes;
