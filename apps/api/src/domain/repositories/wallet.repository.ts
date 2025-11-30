import { QueryResult } from 'neo4j-driver';
import { BaseRepository, NodeProps } from './base.repository';
import { NotFoundError } from '../../plugins/error.plugin';

/**
 * Wallet Repository - Type-Safe Implementation
 *
 * Handles all database operations related to seller wallets.
 * Wallets store the balance for sellers.
 *
 * Type Safety Benefits:
 * - IntelliSense autocomplete for all properties
 * - Compile-time error detection
 * - No runtime errors from typos in property names
 * - Automatic Integer to number conversion
 */

/**
 * Wallet node properties as stored in Neo4j
 */
export interface WalletNodeProps {
  id: string;
  amount: number; // Stored as number, not Integer
}

/**
 * Wallet properties after conversion
 */
export type WalletProperties = NodeProps<WalletNodeProps>;

/**
 * Type-safe record interfaces for query results
 */
interface WalletRecord {
  wallet: WalletNodeProps;
  [key: string]: unknown;
}

interface BalanceRecord {
  amount: number;
  [key: string]: unknown;
}

export class WalletRepository extends BaseRepository {
  /**
   * Find wallet by seller ID
   */
  async findBySellerId(sellerId: string): Promise<WalletProperties | null> {
    const query = `
      MATCH (seller:seller {id: $sellerId})-[:HAS_A]->(wallet:wallet)
      RETURN wallet {.*} as wallet
    `;

    const result = await this.executeRead<WalletRecord>(query, { sellerId });
    const walletData = this.getValue<WalletRecord['wallet']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'wallet'
    );

    if (!walletData) {
      return null;
    }

    return {
      id: walletData.id,
      amount: walletData.amount,
    };
  }

  /**
   * Find wallet by seller ID or throw error
   */
  async findBySellerIdOrFail(sellerId: string): Promise<WalletProperties> {
    const wallet = await this.findBySellerId(sellerId);

    if (!wallet) {
      throw new NotFoundError(`Wallet for seller ${sellerId} not found`);
    }

    return wallet;
  }

  /**
   * Create a new wallet for a seller
   */
  async create(sellerId: string): Promise<WalletProperties> {
    const walletId = `wallet_${Date.now()}`;

    const query = `
      MATCH (seller:seller {id: $sellerId})
      CREATE (wallet:wallet {
        id: $walletId,
        amount: 0.0
      })
      CREATE (seller)-[:HAS_A]->(wallet)
      RETURN wallet {.*} as wallet
    `;

    const result = await this.executeWrite<WalletRecord>(query, { sellerId, walletId });
    const walletData = this.getValue<WalletRecord['wallet']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'wallet'
    );

    if (!walletData) {
      throw new Error('Failed to create wallet');
    }

    return {
      id: walletData.id,
      amount: walletData.amount,
    };
  }

  /**
   * Get wallet balance
   */
  async getBalance(sellerId: string): Promise<number> {
    const query = `
      MATCH (seller:seller {id: $sellerId})-[:HAS_A]->(wallet:wallet)
      RETURN wallet.amount as amount
    `;

    const result = await this.executeRead<BalanceRecord>(query, { sellerId });
    const amount = this.getValue<number>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'amount'
    );

    if (amount === null || amount === undefined) {
      throw new NotFoundError(`Wallet for seller ${sellerId} not found`);
    }

    return amount;
  }

  /**
   * Update wallet balance (set to specific amount)
   */
  async updateBalance(sellerId: string, amount: number): Promise<number> {
    const query = `
      MATCH (seller:seller {id: $sellerId})-[:HAS_A]->(wallet:wallet)
      SET wallet.amount = $amount
      RETURN wallet.amount as amount
    `;

    const result = await this.executeWrite<BalanceRecord>(query, { sellerId, amount });
    const newAmount = this.getValue<number>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'amount'
    );

    if (newAmount === null || newAmount === undefined) {
      throw new NotFoundError(`Wallet for seller ${sellerId} not found`);
    }

    return newAmount;
  }

  /**
   * Add to wallet balance
   */
  async addToBalance(sellerId: string, amount: number): Promise<number> {
    const query = `
      MATCH (seller:seller {id: $sellerId})-[:HAS_A]->(wallet:wallet)
      SET wallet.amount = wallet.amount + $amount
      RETURN wallet.amount as amount
    `;

    const result = await this.executeWrite<BalanceRecord>(query, { sellerId, amount });
    const newAmount = this.getValue<number>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'amount'
    );

    if (newAmount === null || newAmount === undefined) {
      throw new NotFoundError(`Wallet for seller ${sellerId} not found`);
    }

    return newAmount;
  }

  /**
   * Subtract from wallet balance
   */
  async subtractFromBalance(sellerId: string, amount: number): Promise<number> {
    const query = `
      MATCH (seller:seller {id: $sellerId})-[:HAS_A]->(wallet:wallet)
      SET wallet.amount = wallet.amount - $amount
      RETURN wallet.amount as amount
    `;

    const result = await this.executeWrite<BalanceRecord>(query, { sellerId, amount });
    const newAmount = this.getValue<number>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'amount'
    );

    if (newAmount === null || newAmount === undefined) {
      throw new NotFoundError(`Wallet for seller ${sellerId} not found`);
    }

    return newAmount;
  }

  /**
   * Check if wallet has sufficient balance
   */
  async hasSufficientBalance(sellerId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(sellerId);
    return balance >= amount;
  }
}
