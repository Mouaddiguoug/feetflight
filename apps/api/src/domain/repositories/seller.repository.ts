import { BaseRepository, NodeProps } from './base.repository';
import { NotFoundError } from '../../plugins/error.plugin';

/**
 * Seller Repository - Type-Safe Implementation
 *
 * Handles all database operations related to sellers.
 * Sellers are users with additional business capabilities (selling content, subscriptions).
 *
 * Type Safety Benefits:
 * - IntelliSense autocomplete for all properties
 * - Compile-time error detection
 * - No runtime errors from typos in property names
 * - Automatic Integer to number conversion
 */

/**
 * Seller node properties as stored in Neo4j
 */
export interface SellerNodeProps {
  id: string;
  verified: boolean;
  frontIdentityCard?: string;
  backIdentityCard?: string;
}

/**
 * Seller properties after conversion
 */
export type SellerProperties = NodeProps<SellerNodeProps>;

/**
 * Subscription plan node properties as stored in Neo4j
 */
export interface PlanNodeProps {
  id: string;
  name: string;
  price: number;
}

/**
 * Subscription plan after conversion
 */
export type SubscriptionPlan = NodeProps<PlanNodeProps>;

/**
 * Input for creating a new plan
 */
export interface CreatePlanInput {
  id: string;
  name: string;
  price: number;
}

/**
 * Input for updating a plan
 */
export interface UpdatePlanInput {
  id: string;
  name?: string;
  price?: number;
}

/**
 * Type-safe record interfaces for query results
 */
interface SellerRecord {
  seller: SellerNodeProps;
  [key: string]: unknown;
}

interface IdentityCardRecord {
  identityCard: {
    frontSide: string | null;
    backSide: string | null;
  };
  [key: string]: unknown;
}

interface UnverifiedSellerRecord {
  sellers: Array<{
    id: string;
    name: string;
    email: string;
    userName: string;
    phone: string | null;
    createdAt: string;
    verified: boolean;
  }>;
  [key: string]: unknown;
}

interface PlansRecord {
  plans: PlanNodeProps[];
  [key: string]: unknown;
}

interface IsSellerRecord {
  isSeller: boolean;
  [key: string]: unknown;
}

export class SellerRepository extends BaseRepository {
  /**
   * Find seller by user ID with full type safety
   */
  async findById(userId: string): Promise<SellerProperties | null> {
    const query = `
      MATCH (user:user {id: $userId})-[:IS_A]->(seller:seller)
      RETURN seller {.*} as seller
    `;

    const result = await this.executeRead<SellerRecord>(query, { userId });
    const sellerData = this.getValue<SellerRecord['seller']>(result, 'seller');

    if (!sellerData) {
      return null;
    }

    return {
      id: sellerData.id,
      verified: sellerData.verified,
      frontIdentityCard: sellerData.frontIdentityCard,
      backIdentityCard: sellerData.backIdentityCard,
    };
  }

  /**
   * Find seller by ID or throw error
   */
  async findByIdOrFail(userId: string): Promise<SellerProperties> {
    const seller = await this.findById(userId);

    if (!seller) {
      throw new NotFoundError(`Seller with user ID ${userId} not found`);
    }

    return seller;
  }

  /**
   * Create seller node for a user with type safety
   */
  async create(userId: string): Promise<SellerProperties> {
    const query = `
      MATCH (user:user {id: $userId})
      CREATE (seller:seller {id: $userId, verified: false})
      CREATE (user)-[:IS_A]->(seller)
      RETURN seller {.*} as seller
    `;

    const result = await this.executeWrite<SellerRecord>(query, { userId });
    const sellerData = this.getValue<SellerRecord['seller']>(result, 'seller');

    if (!sellerData) {
      throw new Error('Failed to create seller');
    }

    return {
      id: sellerData.id,
      verified: sellerData.verified,
      frontIdentityCard: sellerData.frontIdentityCard,
      backIdentityCard: sellerData.backIdentityCard,
    };
  }

  /**
   * Update seller verification status
   */
  async updateVerificationStatus(userId: string, verified: boolean): Promise<void> {
    const query = `
      MATCH (user:user {id: $userId})-[:IS_A]->(seller:seller)
      SET seller.verified = $verified
    `;

    await this.executeWrite(query, { userId, verified });
  }

  /**
   * Get seller identity card documents with type safety
   */
  async getIdentityCard(userId: string): Promise<{ frontSide: string; backSide: string } | null> {
    const query = `
      MATCH (user:user {id: $userId})-[:IS_A]->(seller:seller)
      RETURN {
        frontSide: seller.frontIdentityCard,
        backSide: seller.backIdentityCard
      } as identityCard
    `;

    const result = await this.executeRead<IdentityCardRecord>(query, { userId });
    const identityCard = this.getValue<IdentityCardRecord['identityCard']>(result, 'identityCard');

    if (!identityCard || !identityCard.frontSide || !identityCard.backSide) {
      return null;
    }

    return {
      frontSide: identityCard.frontSide,
      backSide: identityCard.backSide,
    };
  }

  /**
   * Save seller identity card documents
   */
  async saveIdentityCard(userId: string, frontSide: string, backSide: string): Promise<void> {
    const query = `
      MATCH (user:user {id: $userId})-[:IS_A]->(seller:seller)
      SET seller.frontIdentityCard = $frontSide,
          seller.backIdentityCard = $backSide
    `;

    await this.executeWrite(query, { userId, frontSide, backSide });
  }

  /**
   * Get all unverified sellers with full type safety
   */
  async getUnverified(): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      userName: string;
      phone: string | null;
      createdAt: string;
      verified: boolean;
    }>
  > {
    const query = `
      MATCH (user:user)-[:IS_A]->(seller:seller {verified: false})
      RETURN collect({
        id: user.id,
        name: user.name,
        email: user.email,
        userName: user.userName,
        phone: user.phone,
        createdAt: toString(user.createdAt),
        verified: seller.verified
      }) as sellers
    `;

    const result = await this.executeRead<UnverifiedSellerRecord>(query);
    const sellers = this.getValue<UnverifiedSellerRecord['sellers']>(result, 'sellers');

    return sellers ?? [];
  }

  /**
   * Get subscription plans for a seller with type safety
   */
  async getPlans(sellerId: string): Promise<SubscriptionPlan[]> {
    const query = `
      MATCH (user:user {id: $sellerId})-[:IS_A]->(seller:seller)
      MATCH (seller)-[:HAS_A]->(plan:plan)
      RETURN collect(plan {.*}) as plans
    `;

    const result = await this.executeRead<PlansRecord>(query, { sellerId });
    const plans = this.getValue<PlansRecord['plans']>(result, 'plans');

    return plans ?? [];
  }

  /**
   * Create subscription plans for a seller with type safety
   */
  async createPlans(sellerId: string, plans: CreatePlanInput[]): Promise<SubscriptionPlan[]> {
    if (plans.length === 0) {
      return [];
    }

    const query = `
      MATCH (user:user {id: $sellerId})-[:IS_A]->(seller:seller)
      UNWIND $plans as planData
      CREATE (plan:plan {
        id: planData.id,
        name: planData.name,
        price: planData.price
      })
      CREATE (seller)-[:HAS_A]->(plan)
      WITH collect(plan {.*}) as createdPlans
      RETURN createdPlans as plans
    `;

    const result = await this.executeWrite<PlansRecord>(query, { sellerId, plans });
    const createdPlans = this.getValue<PlansRecord['plans']>(result, 'plans');

    return createdPlans ?? [];
  }

  /**
   * Update subscription plans with type safety
   */
  async updatePlans(plans: UpdatePlanInput[]): Promise<SubscriptionPlan[]> {
    if (plans.length === 0) {
      return [];
    }

    const query = `
      UNWIND $plans as planData
      MATCH (plan:plan {id: planData.id})
      SET plan.name = COALESCE(planData.name, plan.name),
          plan.price = COALESCE(planData.price, plan.price)
      WITH collect(plan {.*}) as updatedPlans
      RETURN updatedPlans as plans
    `;

    const result = await this.executeWrite<PlansRecord>(query, { plans });
    const updatedPlans = this.getValue<PlansRecord['plans']>(result, 'plans');

    return updatedPlans ?? [];
  }

  /**
   * Check if user is a seller with type safety
   */
  async isSeller(userId: string): Promise<boolean> {
    const query = `
      MATCH (user:user {id: $userId})-[:IS_A]->(seller:seller)
      RETURN count(seller) > 0 as isSeller
    `;

    const result = await this.executeRead<IsSellerRecord>(query, { userId });
    const isSeller = this.getValue<boolean>(result, 'isSeller');

    return isSeller ?? false;
  }
}
