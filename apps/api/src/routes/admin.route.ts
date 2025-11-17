import Elysia from 'elysia';
import { authGuard } from '@/plugins/auth.plugin';
import { IdParamSchema } from '@feetflight/shared-types';
import { getSellerIdentityCard, getUnverifiedSellers } from '@/services/admin.service';

export function adminRoutes() {
  return new Elysia({ name: 'routes.admin' }).group('/admin', (app) =>
    app
      .use(authGuard())

      /**
       * @Mouaddiguoug SECURITY NOTE: This route should verify admin role in production.
       * Currently only requires authentication (any authenticated user can access).
       */
      .get(
        '/identityCard/:id',
        async ({ params, neo4j, log, set }) => {
          const identityCard = await getSellerIdentityCard(params.id, { neo4j, log });
          set.status = 201;
          return { identityCardData: identityCard };
        },
        {
          params: IdParamSchema,
          detail: {
            tags: ['Admin'],
            summary: 'Get Seller Identity Card',
            description:
              'Retrieves seller identity card images (front and back) for verification purposes',
          },
        }
      )

      /**
       * @Mouaddiguoug IMPORTANT: REQUIRES STAKEHOLDER CONFIRMATION
       * This route was implemented in the controller (getUnverifiedSellers method)
       * but was NOT exposed in the original Express routes. It has been added during
       * migration as potentially useful admin functionality, but needs confirmation:
       *
       * ACTION REQUIRED:
       * - Confirm with stakeholders if this route should be exposed
       * - If yes: implement admin-role guard (RBAC)
       * - If no: remove this route entirely
       */
      .get(
        '/sellers/unverified',
        async ({ neo4j, log, set }) => {
          const unverifiedSellers = await getUnverifiedSellers({ neo4j, log });
          set.status = 201;
          return { unverifiedSellers };
        },
        {
          detail: {
            tags: ['Admin'],
            summary: '[PENDING APPROVAL] Get Unverified Sellers',
            description:
              '⚠️ REQUIRES STAKEHOLDER CONFIRMATION - This route was not exposed in the original API. Retrieves all sellers pending verification. Needs admin-role guard implementation before production use.',
          },
        }
      )
  );
}
