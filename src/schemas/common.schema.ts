import { t, type Static } from 'elysia';
/**
 * Common schema patterns for reuse across domain-specific schemas
 * These are reusable schema patterns to avoid duplication across domain-specific schemas.
 * Can be composed with domain-specific schemas using TypeBox's t.Composite or t.Intersect when needed.
 */

/**
 * IdParamSchema
 * Use for validating generic ID parameter in routes
 * Example: GET /items/:id
 */
export const IdParamSchema = t.Object({
  id: t.String({}),
});

export type IdParamDTO = Static<typeof IdParamSchema>;

/**
 * UserIdParamSchema
 * Use for validating user ID parameter in routes
 */
export const UserIdParamSchema = t.Object({
  userId: t.String({
    minLength: 1,
    error: 'User ID is required',
  }),
});

export type UserIdParamDTO = Static<typeof UserIdParamSchema>;

/**
 * SellerIdParamSchema
 * Use for validating seller ID parameter in routes
 * Example: PUT /wallet/:sellerId
 */
export const SellerIdParamSchema = t.Object({
  sellerId: t.String({
    minLength: 1,
    error: 'Seller ID is required',
  }),
});

export type SellerIdParamDTO = Static<typeof SellerIdParamSchema>;

/**
 * TokenParamSchema
 * Use for validating token parameter in routes
 * Example: GET /verify/:token
 */
export const TokenParamSchema = t.Object({
  token: t.String({
    minLength: 1,
    error: 'Token is required',
  }),
});

export type TokenParamDTO = Static<typeof TokenParamSchema>;

/**
 * PaginationQuerySchema
 * Use for validating pagination query parameters
 * Example: GET /items?page=0&limit=20
 * Defaults: page=0, limit=20
 */
export const PaginationQuerySchema = t.Object({
  page: t.Optional(
    t.Number({
      minimum: 0,
      default: 0,
      error: 'Page must be a non-negative number',
    }),
  ),
  limit: t.Optional(
    t.Number({
      minimum: 1,
      maximum: 100,
      default: 20,
      error: 'Limit must be between 1 and 100',
    }),
  ),
});

export type PaginationQueryDTO = Static<typeof PaginationQuerySchema>;
