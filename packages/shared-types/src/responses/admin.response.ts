import { t } from 'elysia';
import { Static } from '@sinclair/typebox';

/**
 * UnverifiedSellerSchema
 * Represents an unverified seller awaiting approval
 */
export const UnverifiedSellerSchema = t.Object({
  id: t.String({
    description: 'Seller ID',
  }),
  name: t.String({
    description: 'Seller name',
  }),
  email: t.String({
    format: 'email',
    description: 'Seller email',
  }),
  userName: t.String({
    description: 'Seller username',
  }),
  phone: t.String({
    description: 'Seller phone number',
  }),
  createdAt: t.String({
    description: 'Account creation timestamp',
  }),
  verified: t.Boolean({
    description: 'Verification status',
  }),
});

/**
 * GetUnverifiedSellersResponseSchema
 * Response for GET /admin/sellers/unverified
 */
export const GetUnverifiedSellersResponseSchema = t.Object({
  sellers: t.Array(UnverifiedSellerSchema, {
    description: 'Array of unverified sellers',
  }),
  total: t.Number({
    description: 'Total count of unverified sellers',
    minimum: 0,
  }),
});

export type GetUnverifiedSellersResponse = Static<typeof GetUnverifiedSellersResponseSchema>;

/**
 * IdentityCardDataSchema
 * Represents seller identity card documents
 */
export const IdentityCardDataSchema = t.Object({
  frontSide: t.String({
    description: 'Front side image URL or base64',
  }),
  backSide: t.String({
    description: 'Back side image URL or base64',
  }),
});

/**
 * GetSellerIdentityCardResponseSchema
 * Response for GET /admin/identityCard/:id
 */
export const GetSellerIdentityCardResponseSchema = t.Object({
  identityCardData: IdentityCardDataSchema,
  sellerId: t.String({
    description: 'Seller ID',
  }),
});

export type GetSellerIdentityCardResponse = Static<typeof GetSellerIdentityCardResponseSchema>;
