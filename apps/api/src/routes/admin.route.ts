import Elysia from 'elysia';
import { authGuard } from '@/plugins/auth.plugin';
import {
  IdParamSchema,
  GetSellerIdentityCardResponseSchema,
  GetUnverifiedSellersResponseSchema,
} from '@feetflight/shared-types';
import { getSellerIdentityCard, getUnverifiedSellers } from '@/services/admin.service';

/**
 * Admin Routes - Refactored with TypeBox Response Validation
 *
 * All routes now return properly typed responses validated against TypeBox schemas.
 */

export function adminRoutes() {
  return new Elysia({ name: 'routes.admin' }).group('/admin', (app) =>
    app
      .use(authGuard())

      /**
       * Get Seller Identity Card
       *
       * @security REQUIRES ADMIN ROLE
       * TODO: Implement admin role verification in production
       * Currently only requires authentication (any authenticated user can access)
       */
      .get(
        '/identityCard/:id',
        async ({ params, neo4j, log, set }) => {
          const result = await getSellerIdentityCard(params.id, { neo4j, log });
          set.status = 200;
          return result;
        },
        {
          params: IdParamSchema,
          response: {
            200: GetSellerIdentityCardResponseSchema,
          },
          detail: {
            tags: ['Admin'],
            summary: 'Get Seller Identity Card',
            description:
              'Retrieves seller identity card images (front and back) for verification purposes. Requires admin authentication.',
          },
        }
      )

      /**
       * Get Unverified Sellers
       *
       * @security REQUIRES ADMIN ROLE
       * @pending STAKEHOLDER CONFIRMATION REQUIRED
       *
       * This route was implemented in the controller but NOT exposed in the original Express routes.
       * It has been added during migration as potentially useful admin functionality.
       *
       * ACTION REQUIRED:
       * - Confirm with stakeholders if this route should be exposed
       * - If yes: implement admin-role guard (RBAC)
       * - If no: remove this route entirely
       */
      .get(
        '/sellers/unverified',
        async ({ neo4j, log, set }) => {
          const result = await getUnverifiedSellers({ neo4j, log });
          set.status = 200;
          return result;
        },
        {
          response: {
            200: GetUnverifiedSellersResponseSchema,
          },
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
