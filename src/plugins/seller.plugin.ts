import { Elysia } from 'elysia';
import { ForbiddenError, BadRequestError, UnauthorizedError, InternalServerError } from './error.plugin';
import { appLogger, loggerPlugin } from './logger.plugin';
import { Session } from 'neo4j-driver';
import { authGuard } from './auth.plugin';
import pino from 'pino';
import { Tneo4j } from './neo4j.plugin';

export interface SellerData {
  id: string;
  verified: boolean;
  userId: string;
  createdAt?: string;
}

export interface SellerGuardOptions {
  requireSelf?: boolean;
  paramKey?: string;
}

interface VerifiedSellerResult {
  seller: SellerData;
  userId: string;
}

/**
 * Helper function to verify seller status in Neo4j
 *
 * Performs single verification query and returns seller data.
 * Called only once per request in derive hook to avoid duplicate queries.
 */
async function verifySeller(
  userId: string,
  neo4j: Tneo4j,
  log?: pino.Logger,
  authenticatedUserId?: string,
  requireSelf?: boolean,
): Promise<VerifiedSellerResult> {
  if (!userId) {
    log?.error('Seller verification failed: User ID is required');
    throw new BadRequestError('User ID is required');
  }

  if (requireSelf && authenticatedUserId && userId !== authenticatedUserId) {
    log?.warn(
      { userId, authenticatedUserId },
      'Seller verification failed: params[paramKey] does not match authenticated user.id (requireSelf enabled)',
    );
    throw new ForbiddenError('You can only access your own seller resources');
  }

  try {
    const result = await neo4j.withSession(async (session: Session) => {
      const queryResult = await session.executeRead(tx =>
        tx.run('MATCH (u:user {id: $userId})-[:IS_A]-(s:seller) RETURN u, s', {
          userId: userId,
        }),
      );

      return queryResult;
    });

    if (result.records.length === 0) {
      log?.warn({ userId }, 'Seller verification failed: User is not a seller');
      throw new ForbiddenError('This user is not a seller');
    }

    const userRecord = result?.records[0]?.get('u').properties;
    const sellerRecord = result?.records[0]?.get('s').properties;

    // NOTE: 'verified' is sourced from user node, not seller node
    // This aligns with the existing data model where user.verified indicates
    // whether the user (who happens to be a seller) has been verified by administrators
    if (!userRecord.verified) {
      log?.warn({ userId }, 'Seller verification failed: Seller is not verified yet');
      throw new ForbiddenError('This seller is not verified yet');
    }

    // NOTE: seller.verified is set from userRecord.verified (user node)
    // This is intentional - the verification status is a property of the user account,
    // not the seller profile. The seller relationship (user)-[:IS_A]-(seller) simply
    // indicates that the user has seller privileges, but verification happens at user level.
    const seller: SellerData = {
      id: sellerRecord.id,
      verified: userRecord.verified, // From user node, not seller node
      userId: userRecord.id,
      createdAt: sellerRecord.createdAt,
    };

    log?.info({ userId, sellerId: seller.id }, 'Seller verified successfully');

    return { seller, userId };
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof BadRequestError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (log) {
      log.error({ error: errorMessage }, 'Seller verification failed with unexpected error');
    } else {
      appLogger.error({ error: errorMessage }, 'Seller verification failed with unexpected error');
    }

    throw new InternalServerError('Seller verification failed');
  }
}

/**
 * Verifies that the authenticated user is a verified seller by querying Neo4j.
 * Attaches seller data to context for use in downstream route handlers.
 * 
 * Error responses:
 * - 400 Bad Request: User ID is required (missing from params and user context)
 * - 401 Unauthorized: authGuard not applied first (missing user context)
 * - 403 Forbidden: User is not a seller
 * - 403 Forbidden: Seller is not verified yet
 * - 403 Forbidden: requireSelf check failed (params.id doesn't match user.id)
 * - 500 Internal Server Error: Unexpected errors (Neo4j failures, network issues, etc.)
 *
 * ⚠️ API Contract Change - Breaking Change (sorry man):
 * This plugin uses 403 Forbidden for seller authorization failures instead of 400 Bad Request
 * used by the legacy Express middleware (src/middlewares/seller.middleware.ts lines 27, 30).
 * This is the correct HTTP semantics per RFC 9110:
 * - 400 Bad Request: Client sent invalid data (malformed request)
 * - 403 Forbidden: Server understood the request but refuses to authorize it
 * - 500 Internal Server Error: Unexpected server-side failures
 */
export const sellerGuard = (options: SellerGuardOptions = {}) => {
  const { requireSelf = false, paramKey = 'id' } = options;

  return new Elysia({ name: 'plugin.seller.guard' })
  .use(loggerPlugin())
  .use(authGuard())
  .derive(async ctx => {
    const { params, user, neo4j, log } = ctx;

    if (!user) {
      const errorMsg = 'sellerGuard requires authGuard() to be applied first. User context is missing.';
      appLogger.error(errorMsg);
      throw new UnauthorizedError(errorMsg);
    }
    const userId = (params as any)?.[paramKey] || user.id;

    const { seller } = await verifySeller(userId, neo4j, log, user.id, requireSelf);

    return { seller };
  });
};
