/**
 * Plugins Barrel Export
 *
 * Central export point for all Elysia plugins. Import plugins from this file
 * for consistent usage across the application.
 *
 * Usage example:
 * ```typescript
 * // Instead of:
 * import { authPlugin } from '@/plugins/auth.plugin';
 * import { sellerGuard } from '@/plugins/seller.plugin';
 * import { neo4jPlugin } from '@/plugins/neo4j.plugin';
 *
 * // Use:
 * import { authPlugin, authGuard, sellerGuard, neo4jPlugin } from '@/plugins';
 * ```
 */

// Neo4j Plugin
export { neo4jPlugin } from './neo4j.plugin';

// Error Plugin and Error Classes
export {
  errorPlugin,
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  InternalServerError,
} from './error.plugin';

// Logger Plugin
export { loggerPlugin, appLogger } from './logger.plugin';

// Authentication Plugin and Guard
export {
  authPlugin,
  authGuard,
  type JWTPayload,
  type AuthUser,
  type TokenData,
} from './auth.plugin';

// Seller Guard Plugin
export { sellerGuard, type SellerData, type SellerGuardOptions } from './seller.plugin';
