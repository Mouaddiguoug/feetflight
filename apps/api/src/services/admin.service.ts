import { Tneo4j } from '@/plugins/neo4j.plugin';
import { Logger } from 'pino';
import { SellerRepository } from '@/domain/repositories/seller.repository';
import type {
  GetUnverifiedSellersResponse,
  GetSellerIdentityCardResponse,
} from '@feetflight/shared-types';

/**
 * Admin Service - Refactored to use Repository Pattern
 *
 * This service now delegates all database operations to repositories
 * and returns properly typed responses using TypeBox schemas.
 */

export interface AdminServiceDeps {
  neo4j: Tneo4j;
  log: Logger;
}

/**
 * Get all unverified sellers awaiting approval
 *
 * @returns Typed response with sellers array and total count
 */
export async function getUnverifiedSellers(
  deps: AdminServiceDeps
): Promise<GetUnverifiedSellersResponse> {
  const sellerRepo = new SellerRepository({ neo4j: deps.neo4j, log: deps.log });

  const sellers = await sellerRepo.getUnverified();

  return {
    sellers: sellers.map((seller) => ({
      id: seller.id,
      name: seller.name,
      email: seller.email,
      userName: seller.userName,
      phone: seller.phone || '',
      createdAt: seller.createdAt,
      verified: seller.verified,
    })),
    total: sellers.length,
  };
}

/**
 * Get seller identity card documents
 *
 * @param userId - Seller user ID
 * @returns Typed response with identity card data
 */
export async function getSellerIdentityCard(
  userId: string,
  deps: AdminServiceDeps
): Promise<GetSellerIdentityCardResponse> {
  const sellerRepo = new SellerRepository({ neo4j: deps.neo4j, log: deps.log });

  const identityCard = await sellerRepo.getIdentityCard(userId);

  if (!identityCard) {
    throw new Error('Identity card not found for seller');
  }

  return {
    identityCardData: {
      frontSide: identityCard.frontSide,
      backSide: identityCard.backSide,
    },
    sellerId: userId,
  };
}

/**
 * @deprecated Legacy adminService class for backward compatibility with Express controller
 */
class adminService {
  private deps: AdminServiceDeps;

  /**
   * Constructor accepting optional dependencies.
   * If no dependencies provided, methods will throw errors.
   *
   * @param deps - Optional admin service dependencies (neo4j, log)
   */
  constructor(deps?: AdminServiceDeps) {
    if (!deps) {
      throw new Error(
        'adminService now requires dependencies to be passed to constructor. ' +
          'Pass { neo4j, log } to the constructor, or use the exported functions directly.'
      );
    }
    this.deps = deps;
  }

  /**
   * @deprecated Use the exported getUnverifiedSellers() function instead
   */
  public async getUnverifiedSellers(): Promise<any> {
    return getUnverifiedSellers(this.deps);
  }

  /**
   * @deprecated Use the exported getSellerIdentityCard() function instead
   */
  public async getSellerIdentityCard(userid: string): Promise<any> {
    return getSellerIdentityCard(userid, this.deps);
  }
}

export default adminService;
