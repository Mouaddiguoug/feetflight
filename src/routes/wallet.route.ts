import { Elysia } from 'elysia';
import { UpdateBalanceSchema, UserIdParamSchema, SellerIdParamSchema } from '@/schemas';
import { authGuard } from '@/plugins/auth.plugin';
import { getBalance, updateBalance } from '@/services/wallet.service';

export const walletRoutes = () => {
  return new Elysia({ name: 'routes.wallet' }).group('/wallet', app =>
    app
      .use(authGuard())
      .get(
        '/:userId',
        async ({ params, neo4j, log, set }) => {
          try {
            const balance = await getBalance(params.userId, { neo4j, log });
            set.status = 201;
            return { data: balance };
          } catch (error) {
            throw error;
          }
        },
        {
          params: UserIdParamSchema,
          detail: {
            tags: ['Wallet'],
            summary: 'Get Wallet Balance',
            description: 'Retrieves the wallet balance for a user by their user ID',
          },
        },
      )

      .put(
        '/:sellerId',
        async ({ params, body, neo4j, log, set }) => {
          try {
            const newAmount = await updateBalance(params.sellerId, body, { neo4j, log });
            set.status = 201;
            return { data: newAmount };
          } catch (error) {
            throw error;
          }
        },
        {
          params: SellerIdParamSchema,
          body: UpdateBalanceSchema,
          detail: {
            tags: ['Wallet'],
            summary: 'Update Wallet Balance',
            description:
              'Manually updates wallet balance for a seller by their seller ID (for admin adjustments, no commission applied). Use positive amounts to add funds, negative amounts to subtract funds. Business Rule: Balances cannot be negative - if an update would result in a negative balance, a 400 error is returned.',
          },
        },
      ),
  );
};

export default walletRoutes;
