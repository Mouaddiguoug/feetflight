import { Integer, QueryResult } from 'neo4j-driver';
import { BaseRepository, NodeProps } from './base.repository';
import { NotFoundError } from '../../plugins/error.plugin';

/**
 * Subscription Repository - Type-Safe Implementation
 *
 * Handles all database operations related to user subscriptions to sellers.
 * Subscriptions allow users to access premium content from sellers.
 *
 * Type Safety Benefits:
 * - IntelliSense autocomplete for all properties
 * - Compile-time error detection
 * - No runtime errors from typos in property names
 * - Automatic Integer to number conversion
 */

/**
 * Subscription node properties as stored in Neo4j
 */
export interface SubscriptionNodeProps {
  id: string;
  planId: string;
  planName: string;
  planPrice: number;
  createdAt: string | Integer;
  active: boolean;
}

/**
 * Subscription properties after conversion
 */
export type SubscriptionProperties = NodeProps<SubscriptionNodeProps>;

/**
 * Subscription with user and seller details
 */
export interface SubscriptionWithDetails {
  subscription: {
    id: string;
    planId: string;
    planName: string;
    planPrice: number;
    createdAt: string;
    active: boolean;
  };
  user: {
    id: string;
    name: string;
    email: string;
    userName: string;
    avatar: string;
  };
  seller: {
    id: string;
    name: string;
    email: string;
    userName: string;
    avatar: string;
  };
}

/**
 * Type-safe record interfaces for query results
 */
interface SubscriptionRecord {
  subscription: SubscriptionNodeProps;
  [key: string]: unknown;
}

interface SubscriptionsRecord {
  subscriptions: SubscriptionNodeProps[];
  [key: string]: unknown;
}

interface ActiveSubscriptionRecord {
  active: boolean;
  [key: string]: unknown;
}

interface SubscriptionWithDetailsRecord {
  data: {
    subscription: {
      properties: SubscriptionNodeProps;
    };
    user: {
      properties: {
        id: string;
        name: string;
        email: string;
        userName: string;
        avatar: string;
      };
    };
    seller: {
      properties: {
        id: string;
        name: string;
        email: string;
        userName: string;
        avatar: string;
      };
    };
  };
  [key: string]: unknown;
}

/**
 * Input for creating a subscription
 */
export interface CreateSubscriptionInput {
  userId: string;
  sellerId: string;
  planId: string;
  planName: string;
  planPrice: number;
}

export class SubscriptionRepository extends BaseRepository {
  /**
   * Find subscription by ID
   */
  async findById(subscriptionId: string): Promise<SubscriptionProperties | null> {
    const query = `
      MATCH ()-[subscription:SUBSCRIBED_TO {id: $subscriptionId}]->()
      RETURN subscription {.*} as subscription
    `;

    const result = await this.executeRead<SubscriptionRecord>(query, { subscriptionId });
    const subscriptionData = this.getValue<SubscriptionRecord['subscription']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'subscription'
    );

    if (!subscriptionData) {
      return null;
    }

    return {
      id: subscriptionData.id,
      planId: subscriptionData.planId,
      planName: subscriptionData.planName,
      planPrice: subscriptionData.planPrice,
      createdAt:
        typeof subscriptionData.createdAt === 'string'
          ? subscriptionData.createdAt
          : subscriptionData.createdAt.toString(),
      active: subscriptionData.active,
    };
  }

  /**
   * Find subscription by ID or throw error
   */
  async findByIdOrFail(subscriptionId: string): Promise<SubscriptionProperties> {
    const subscription = await this.findById(subscriptionId);

    if (!subscription) {
      throw new NotFoundError(`Subscription with ID ${subscriptionId} not found`);
    }

    return subscription;
  }

  /**
   * Create a new subscription
   */
  async create(input: CreateSubscriptionInput): Promise<SubscriptionProperties> {
    const subscriptionId = `sub_${Date.now()}`;

    const query = `
      MATCH (user:user {id: $userId}), (seller:seller {id: $sellerId})
      CREATE (user)-[subscription:SUBSCRIBED_TO {
        id: $subscriptionId,
        planId: $planId,
        planName: $planName,
        planPrice: $planPrice,
        createdAt: datetime().epochMillis,
        active: true
      }]->(seller)
      RETURN subscription {.*} as subscription
    `;

    const params = {
      subscriptionId,
      userId: input.userId,
      sellerId: input.sellerId,
      planId: input.planId,
      planName: input.planName,
      planPrice: input.planPrice,
    };

    const result = await this.executeWrite<SubscriptionRecord>(query, params);
    const subscriptionData = this.getValue<SubscriptionRecord['subscription']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'subscription'
    );

    if (!subscriptionData) {
      throw new Error('Failed to create subscription');
    }

    return {
      id: subscriptionData.id,
      planId: subscriptionData.planId,
      planName: subscriptionData.planName,
      planPrice: subscriptionData.planPrice,
      createdAt:
        typeof subscriptionData.createdAt === 'string'
          ? subscriptionData.createdAt
          : subscriptionData.createdAt.toString(),
      active: subscriptionData.active,
    };
  }

  /**
   * Cancel a subscription (set active to false)
   */
  async cancel(subscriptionId: string): Promise<void> {
    const query = `
      MATCH ()-[subscription:SUBSCRIBED_TO {id: $subscriptionId}]->()
      SET subscription.active = false
    `;

    await this.executeWrite(query, { subscriptionId });
  }

  /**
   * Check if user has active subscription to a seller
   */
  async checkActive(userId: string, sellerId: string): Promise<boolean> {
    const query = `
      MATCH (user:user {id: $userId})-[subscription:SUBSCRIBED_TO {active: true}]->(seller:seller {id: $sellerId})
      RETURN count(subscription) > 0 as active
    `;

    const result = await this.executeRead<ActiveSubscriptionRecord>(query, { userId, sellerId });
    return (
      this.getValue<boolean>(result as unknown as QueryResult<Record<string, unknown>>, 'active') ??
      false
    );
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<SubscriptionProperties[]> {
    const query = `
      MATCH (user:user {id: $userId})-[subscription:SUBSCRIBED_TO]->(:seller)
      RETURN collect(subscription {.*}) as subscriptions
      ORDER BY subscription.createdAt DESC
    `;

    const result = await this.executeRead<SubscriptionsRecord>(query, { userId });
    const subscriptions = this.getValue<SubscriptionsRecord['subscriptions']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'subscriptions'
    );

    return (subscriptions ?? []).map((sub) => ({
      id: sub.id,
      planId: sub.planId,
      planName: sub.planName,
      planPrice: sub.planPrice,
      createdAt: typeof sub.createdAt === 'string' ? sub.createdAt : sub.createdAt.toString(),
      active: sub.active,
    }));
  }

  /**
   * Get all subscribers for a seller
   */
  async getSellerSubscribers(sellerId: string): Promise<SubscriptionWithDetails[]> {
    const query = `
      MATCH (user:user)-[subscription:SUBSCRIBED_TO]->(seller:seller {id: $sellerId}),
            (sellerUser:user)-[:IS_A]->(seller)
      RETURN {
        subscription: subscription,
        user: user,
        seller: sellerUser
      } as data
      ORDER BY subscription.createdAt DESC
    `;

    const result = await this.executeRead<SubscriptionWithDetailsRecord>(query, { sellerId });
    const records = this.getRecords(result as unknown as QueryResult);

    return records.map((record) => {
      const data = record.get && typeof record.get === 'function' ? record.get('data') : undefined;
      if (!data || typeof data !== 'object' || !('subscription' in data)) {
        throw new Error("Invalid record structure: missing 'data.subscription'");
      }
      const subscription = (data as SubscriptionWithDetailsRecord['data']).subscription;
      return {
        subscription: {
          id: subscription.properties.id,
          planId: subscription.properties.planId,
          planName: data.subscription.properties.planName,
          planPrice: data.subscription.properties.planPrice,
          createdAt:
            typeof data.subscription.properties.createdAt === 'string'
              ? data.subscription.properties.createdAt
              : data.subscription.properties.createdAt.toString(),
          active: data.subscription.properties.active,
        },
        user: {
          id: data.user.properties.id,
          name: data.user.properties.name,
          email: data.user.properties.email,
          userName: data.user.properties.userName,
          avatar: data.user.properties.avatar,
        },
        seller: {
          id: data.seller.properties.id,
          name: data.seller.properties.name,
          email: data.seller.properties.email,
          userName: data.seller.properties.userName,
          avatar: data.seller.properties.avatar,
        },
      };
    });
  }

  /**
   * Get active subscriptions count for a seller
   */
  async getActiveSubscribersCount(sellerId: string): Promise<number> {
    const query = `
      MATCH (:user)-[subscription:SUBSCRIBED_TO {active: true}]->(seller:seller {id: $sellerId})
      RETURN count(subscription) as count
    `;

    interface CountRecord {
      count: Integer;
      [key: string]: unknown;
    }

    const result = await this.executeRead<CountRecord>(query, { sellerId });
    const count = this.getValue<Integer>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'count'
    );

    return this.toNumber(count ?? 0);
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivate(subscriptionId: string): Promise<void> {
    const query = `
      MATCH ()-[subscription:SUBSCRIBED_TO {id: $subscriptionId}]->()
      SET subscription.active = true
    `;

    await this.executeWrite(query, { subscriptionId });
  }
}
