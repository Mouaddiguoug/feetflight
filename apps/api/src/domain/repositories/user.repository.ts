import { Integer, QueryResult } from 'neo4j-driver';
import { BaseRepository, NodeProps } from './base.repository';
import { NotFoundError } from '../../plugins/error.plugin';

/**
 * User Repository - Type-Safe Implementation
 *
 * Demonstrates full type safety using Neo4j 5.2.0+ features.
 * All queries use typed record interfaces for compile-time validation.
 *
 * Type Safety Benefits:
 * - IntelliSense autocomplete for all properties
 * - Compile-time error detection
 * - No runtime errors from typos in property names
 * - Automatic Integer to number conversion
 */

/**
 * User node properties as stored in Neo4j
 * Note: followers and followings use Integer in Neo4j, converted to number in NodeProps
 */
export interface UserNodeProps {
  id: string;
  email: string;
  password: string;
  name: string;
  userName: string;
  avatar: string;
  phone?: string;
  confirmed: boolean;
  verified: boolean;
  desactivated: boolean;
  createdAt: string | Integer;
  followers: Integer; // Neo4j Integer, will be converted to number
  followings: Integer; // Neo4j Integer, will be converted to number
  [key: string]: unknown;
}

/**
 * User properties after Integer conversion
 * This is what you get from repository methods
 */
export type UserProperties = NodeProps<UserNodeProps>;

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  id: string;
  email: string;
  password: string;
  name: string;
  userName: string;
  avatar?: string;
  phone?: string;
  confirmed?: boolean;
  verified?: boolean;
  desactivated?: boolean;
}

/**
 * Input for updating user
 */
export interface UpdateUserInput {
  name?: string;
  userName?: string;
  avatar?: string;
  confirmed?: boolean;
  verified?: boolean;
  desactivated?: boolean;
  password?: string;
}

/**
 * Type-safe record for user with calculated fields
 */
interface UserWithCountsRecord {
  user: {
    id: string;
    email: string;
    password: string;
    name: string;
    userName: string;
    avatar: string;
    phone?: string;
    confirmed: boolean;
    verified: boolean;
    desactivated: boolean;
    createdAt: string | Integer;
    followers: Integer;
    followings: Integer;
  };
  [key: string]: unknown;
}

/**
 * Type-safe record for role query
 */
interface RoleRecord {
  role: 'Buyer' | 'Seller' | null;
  [key: string]: unknown;
}

/**
 * Type-safe record for device tokens query
 */
interface DeviceTokensRecord {
  tokens: string[];
  [key: string]: unknown;
}

export class UserRepository extends BaseRepository {
  /**
   * Find user by ID
   * }
   */
  async findById(userId: string): Promise<UserProperties | null> {
    const query = `
      MATCH (user:user {id: $userId})
      RETURN user {
        .*,
        followers: size((user)<-[:FOLLOWS]-()),
        followings: size((user)-[:FOLLOWS]->())
      } as user
    `;

    const result = await this.executeRead<UserWithCountsRecord>(query, { userId });

    // Type-safe extraction - TypeScript knows the exact structure
    const userData = this.getValue<UserWithCountsRecord['user']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'user'
    );

    if (!userData) {
      return null;
    }

    // Convert all properties, including Integer types
    return {
      id: userData.id,
      email: userData.email,
      password: userData.password,
      name: userData.name,
      userName: userData.userName,
      avatar: userData.avatar,
      phone: userData.phone,
      confirmed: userData.confirmed,
      verified: userData.verified,
      desactivated: userData.desactivated,
      createdAt:
        typeof userData.createdAt === 'string' ? userData.createdAt : userData.createdAt.toString(),
      followers: this.toNumber(userData.followers), // Convert Integer to number
      followings: this.toNumber(userData.followings),
    };
  }

  /**
   * Find user by ID or throw error
   */
  async findByIdOrFail(userId: string): Promise<UserProperties> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return user;
  }

  /**
   * Find user by email with full type safety
   */
  async findByEmail(email: string): Promise<UserProperties | null> {
    const query = `
      MATCH (user:user {email: $email})
      RETURN user {
        .*,
        followers: size((user)<-[:FOLLOWS]-()),
        followings: size((user)-[:FOLLOWS]->())
      } as user
    `;

    const result = await this.executeRead<UserWithCountsRecord>(query, { email });
    const userData = this.getValue<UserWithCountsRecord['user']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'user'
    );

    if (!userData) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      password: userData.password,
      name: userData.name,
      userName: userData.userName,
      avatar: userData.avatar,
      phone: userData.phone,
      confirmed: userData.confirmed,
      verified: userData.verified,
      desactivated: userData.desactivated,
      createdAt:
        typeof userData.createdAt === 'string' ? userData.createdAt : userData.createdAt.toString(),
      followers: this.toNumber(userData.followers),
      followings: this.toNumber(userData.followings),
    };
  }

  /**
   * Find user by username
   */
  async findByUserName(userName: string): Promise<UserProperties | null> {
    const query = `
      MATCH (user:user {userName: $userName})
      RETURN user {
        .*,
        followers: size((user)<-[:FOLLOWS]-()),
        followings: size((user)-[:FOLLOWS]->())
      } as user
    `;

    const result = await this.executeRead<UserWithCountsRecord>(query, { userName });
    const userData = this.getValue<UserWithCountsRecord['user']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'user'
    );

    if (!userData) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      password: userData.password,
      name: userData.name,
      userName: userData.userName,
      avatar: userData.avatar,
      phone: userData.phone,
      confirmed: userData.confirmed,
      verified: userData.verified,
      desactivated: userData.desactivated,
      createdAt:
        typeof userData.createdAt === 'string' ? userData.createdAt : userData.createdAt.toString(),
      followers: this.toNumber(userData.followers),
      followings: this.toNumber(userData.followings),
    };
  }

  /**
   * Check if user exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    interface ExistsRecord {
      exists: boolean;
      [key: string]: unknown;
    }

    const query = `
      MATCH (user:user {email: $email})
      RETURN count(user) > 0 as exists
    `;

    const result = await this.executeRead<ExistsRecord>(query, { email });
    return (
      this.getValue<boolean>(result as unknown as QueryResult<Record<string, unknown>>, 'exists') ??
      false
    );
  }

  /**
   * Create a new user with type-safe return
   */
  async create(input: CreateUserInput): Promise<UserProperties> {
    const query = `
      CREATE (user:user {
        id: $id,
        email: $email,
        password: $password,
        name: $name,
        userName: $userName,
        avatar: $avatar,
        phone: $phone,
        confirmed: $confirmed,
        verified: $verified,
        desactivated: $desactivated,
        createdAt: datetime().epochMillis
      })
      RETURN user {
        .*,
        createdAt: toString(user.createdAt),
        followers: 0,
        followings: 0
      } as user
    `;

    const params = {
      id: input.id,
      email: input.email,
      password: input.password,
      name: input.name,
      userName: input.userName,
      avatar: input.avatar || '',
      phone: input.phone || null,
      confirmed: input.confirmed ?? false,
      verified: input.verified ?? false,
      desactivated: input.desactivated ?? false,
    };

    const result = await this.executeWrite<UserWithCountsRecord>(query, params);
    const userData = this.getValue<UserWithCountsRecord['user']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'user'
    );

    if (!userData) {
      throw new Error('Failed to create user');
    }

    return {
      id: userData.id,
      email: userData.email,
      password: userData.password,
      name: userData.name,
      userName: userData.userName,
      avatar: userData.avatar,
      phone: userData.phone,
      confirmed: userData.confirmed,
      verified: userData.verified,
      desactivated: userData.desactivated,
      createdAt:
        typeof userData.createdAt === 'string' ? userData.createdAt : userData.createdAt.toString(),
      followers: 0,
      followings: 0,
    };
  }

  /**
   * Update user properties with type safety
   */
  async update(userId: string, input: UpdateUserInput): Promise<UserProperties> {
    // Build SET clause dynamically based on provided fields
    const setFields: string[] = [];
    const params: Record<string, unknown> = { userId };

    if (input.name !== undefined) {
      setFields.push('user.name = $name');
      params.name = input.name;
    }
    if (input.userName !== undefined) {
      setFields.push('user.userName = $userName');
      params.userName = input.userName;
    }
    if (input.avatar !== undefined) {
      setFields.push('user.avatar = $avatar');
      params.avatar = input.avatar;
    }
    if (input.confirmed !== undefined) {
      setFields.push('user.confirmed = $confirmed');
      params.confirmed = input.confirmed;
    }
    if (input.verified !== undefined) {
      setFields.push('user.verified = $verified');
      params.verified = input.verified;
    }
    if (input.desactivated !== undefined) {
      setFields.push('user.desactivated = $desactivated');
      params.desactivated = input.desactivated;
    }
    if (input.password !== undefined) {
      setFields.push('user.password = $password');
      params.password = input.password;
    }

    if (setFields.length === 0) {
      // No fields to update, return current user
      return this.findByIdOrFail(userId);
    }

    const query = `
      MATCH (user:user {id: $userId})
      SET ${setFields.join(', ')}
      RETURN user {
        .*,
        createdAt: toString(user.createdAt),
        followers: size((user)<-[:FOLLOWS]-()),
        followings: size((user)-[:FOLLOWS]->())
      } as user
    `;

    const result = await this.executeWrite<UserWithCountsRecord>(query, params);
    const userData = this.getValue<UserWithCountsRecord['user']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'user'
    );

    if (!userData) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return {
      id: userData.id,
      email: userData.email,
      password: userData.password,
      name: userData.name,
      userName: userData.userName,
      avatar: userData.avatar,
      phone: userData.phone,
      confirmed: userData.confirmed,
      verified: userData.verified,
      desactivated: userData.desactivated,
      createdAt:
        typeof userData.createdAt === 'string' ? userData.createdAt : userData.createdAt.toString(),
      followers: this.toNumber(userData.followers),
      followings: this.toNumber(userData.followings),
    };
  }

  /**
   * Soft delete user by setting desactivated flag
   */
  async softDelete(userId: string): Promise<void> {
    await this.update(userId, { desactivated: true });
  }

  /**
   * Hard delete user and all relationships
   */
  async delete(userId: string): Promise<void> {
    const query = `
      MATCH (user:user {id: $userId})
      DETACH DELETE user
    `;

    await this.executeWrite(query, { userId });
  }

  /**
   * Get user's role (Buyer or Seller) with type safety
   */
  async getUserRole(userId: string): Promise<'Buyer' | 'Seller' | null> {
    const query = `
      MATCH (user:user {id: $userId})
      OPTIONAL MATCH (user)-[:IS_A]->(seller:seller)
      OPTIONAL MATCH (user)-[:IS_A]->(buyer:buyer)
      RETURN
        CASE
          WHEN seller IS NOT NULL THEN 'Seller'
          WHEN buyer IS NOT NULL THEN 'Buyer'
          ELSE null
        END as role
    `;

    const result = await this.executeRead<RoleRecord>(query, { userId });
    return this.getValue<'Buyer' | 'Seller' | null>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'role'
    );
  }

  /**
   * Add device token for push notifications
   */
  async addDeviceToken(userId: string, token: string): Promise<void> {
    const query = `
      MATCH (user:user {id: $userId})
      MERGE (user)-[:logged_in_with]->(deviceToken:deviceToken {token: $token})
    `;

    await this.executeWrite(query, { userId, token });
  }

  /**
   * Remove all device tokens for a user (logout)
   */
  async removeAllDeviceTokens(userId: string): Promise<void> {
    const query = `
      MATCH (user:user {id: $userId})-[r:logged_in_with]->(deviceToken:deviceToken)
      DELETE r, deviceToken
    `;

    await this.executeWrite(query, { userId });
  }

  /**
   * Get all device tokens for a user with type safety
   */
  async getDeviceTokens(userId: string): Promise<string[]> {
    const query = `
      MATCH (user:user {id: $userId})-[:logged_in_with]->(deviceToken:deviceToken)
      RETURN collect(deviceToken.token) as tokens
    `;

    const result = await this.executeRead<DeviceTokensRecord>(query, { userId });
    return (
      this.getValue<string[]>(
        result as unknown as QueryResult<Record<string, unknown>>,
        'tokens'
      ) ?? []
    );
  }

  /**
   * Get followed sellers for a user
   */
  async getFollowedSellers(userId: string): Promise<UserProperties[]> {
    const query = `
      MATCH (user:user {id: $userId})-[:FOLLOWS]->(seller:user)-[:IS_A]->(:seller)
      RETURN collect(seller {
        .*,
        createdAt: toString(seller.createdAt),
        followers: size((seller)<-[:FOLLOWS]-()),
        followings: size((seller)-[:FOLLOWS]->())
      }) as sellers
    `;

    interface SellersRecord {
      sellers: Array<UserWithCountsRecord['user']>;
      [key: string]: unknown;
    }

    const result = await this.executeRead<SellersRecord>(query, { userId });
    const sellers =
      this.getValue<Array<UserWithCountsRecord['user']>>(
        result as unknown as QueryResult<Record<string, unknown>>,
        'sellers'
      ) ?? [];

    return sellers.map((seller) => ({
      id: seller.id,
      email: seller.email,
      password: seller.password,
      name: seller.name,
      userName: seller.userName,
      avatar: seller.avatar,
      phone: seller.phone,
      confirmed: seller.confirmed,
      verified: seller.verified,
      desactivated: seller.desactivated,
      createdAt:
        typeof seller.createdAt === 'string' ? seller.createdAt : seller.createdAt.toString(),
      followers: this.toNumber(seller.followers),
      followings: this.toNumber(seller.followings),
    }));
  }
}
