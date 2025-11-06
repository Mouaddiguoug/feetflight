import { int, Session } from 'neo4j-driver';
import { Logger } from 'pino';
import { BadRequestError, InternalServerError, NotFoundError } from '@/plugins';

/**
 * Wallet Service Dependencies Interface
 *
 * Defines the dependencies required by wallet service functions.
 * Enables dependency injection for better testability and decoupling.
 */
export interface WalletServiceDeps {
  neo4j: {
    withSession: <T>(callback: (session: Session) => Promise<T>) => Promise<T>;
  };
  log?: Logger;
}

/**
 * Get Balance
 *
 * Retrieves the wallet balance for a seller by user ID.
 *
 * @param userId - The user's unique identifier
 * @param deps - Service dependencies (neo4j, log)
 * @returns Promise resolving to the wallet balance amount
 * @throws NotFoundError if wallet not found for the user
 * @throws InternalServerError for unexpected errors
 *
 * @example
 * ```typescript
 * const balance = await getBalance(userId, { neo4j, log });
 * ```
 */
export async function getBalance(userId: string, deps: WalletServiceDeps): Promise<number> {
  try {
    const amount = await deps.neo4j.withSession(async session => {
      const result = await session.executeRead(tx =>
        tx.run('MATCH (w:wallet)<-[:HAS_A]-(s:seller)<-[:IS_A]-(:user {id: $userId}) RETURN w', {
          userId,
        }),
      );

      if (result.records.length === 0) {
        return null;
      }

      // Handle Neo4j integer conversion
      const amountValue = result.records[0].get('w').properties.amount;
      return typeof amountValue === 'object' && 'low' in amountValue ? amountValue.low : Number(amountValue);
    });

    if (amount === null) {
      deps.log?.warn({ userId }, 'Wallet not found for user');
      throw new NotFoundError('Wallet not found for this user');
    }

    deps.log?.info({ userId, amount }, 'Retrieved wallet balance');
    return amount;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    deps.log?.error({ error: errorMessage, userId }, 'Get balance failed');
    throw new InternalServerError('Failed to retrieve wallet balance');
  }
}

/**
 * Update Balance For Payment
 *
 * Updates seller's wallet balance after a payment.
 * Applies 20% platform fee (seller receives 80% of payment).
 *
 * @param sellerId - The seller's unique identifier
 * @param balanceAmount - The payment amount before platform fee
 * @param deps - Service dependencies (neo4j, log)
 * @returns Promise resolving when balance is updated
 * @throws InternalServerError for unexpected errors
 *
 * Commission: 20% platform fee
 * Example: $100 payment → seller receives $80
 *
 * @example
 * ```typescript
 * await updateBalanceForPayment(sellerId, 100, { neo4j, log });
 * // Seller's wallet increases by $80
 * ```
 */
export async function updateBalanceForPayment(
  sellerId: string,
  balanceAmount: number | string,
  deps: WalletServiceDeps,
): Promise<void> {
  try {
    // Calculate commission (20% platform fee)
    const amount = Number(balanceAmount);
    const sellerAmount = amount - (amount * 20) / 100;

    await deps.neo4j.withSession(async session => {
      await session.executeWrite(tx =>
        tx.run('MATCH (w:wallet)<-[:HAS_A]-(s:seller {id: $sellerId}) SET w.amount = w.amount + $newAmount', {
          newAmount: sellerAmount,
          sellerId,
        }),
      );
    });

    deps.log?.info({ sellerId, originalAmount: amount, sellerAmount, commission: amount - sellerAmount }, 'Updated balance for payment');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    deps.log?.error({ error: errorMessage, sellerId, balanceAmount }, 'Update balance for payment failed');
    throw new InternalServerError('Failed to update wallet balance for payment');
  }
}

/**
 * Update Balance For Subscription
 *
 * Updates seller's wallet balance after a subscription payment.
 * Applies 30% platform fee (seller receives 70% of subscription).
 *
 * @param sellerId - The seller's unique identifier
 * @param balanceAmount - The subscription payment amount before platform fee
 * @param deps - Service dependencies (neo4j, log)
 * @returns Promise resolving to the updated wallet amount
 * @throws InternalServerError for unexpected errors
 *
 * Commission: 30% platform fee (higher than regular payments due to recurring nature)
 * Example: $100 subscription → seller receives $70
 *
 * @example
 * ```typescript
 * const newBalance = await updateBalanceForSubscription(sellerId, 100, { neo4j, log });
 * // Seller's wallet increases by $70, returns new balance
 * ```
 */
export async function updateBalanceForSubscription(
  sellerId: string,
  balanceAmount: number | string,
  deps: WalletServiceDeps,
): Promise<number> {
  try {
    // Calculate commission (30% platform fee for subscriptions)
    const amount = Number(balanceAmount);
    const sellerAmount = amount - (amount * 30) / 100;

    const updatedAmount = await deps.neo4j.withSession(async session => {
      const result = await session.executeWrite(tx =>
        tx.run('MATCH (w:wallet)<-[:HAS_A]-(s:seller {id: $sellerId}) SET w.amount = w.amount + $newAmount RETURN w', {
          newAmount: sellerAmount,
          sellerId,
        }),
      );

      if (result.records.length === 0) {
        return null;
      }

      // Handle Neo4j integer conversion
      const amountValue = result.records[0].get('w').properties.amount;
      return typeof amountValue === 'object' && 'low' in amountValue ? amountValue.low : Number(amountValue);
    });

    if (updatedAmount === null) {
      deps.log?.warn({ sellerId }, 'Seller wallet not found for subscription update');
      throw new NotFoundError('Seller wallet not found');
    }

    deps.log?.info(
      {
        sellerId,
        originalAmount: amount,
        sellerAmount,
        commission: amount - sellerAmount,
        newBalance: updatedAmount,
      },
      'Updated balance for subscription',
    );

    return updatedAmount;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    deps.log?.error({ error: errorMessage, sellerId, balanceAmount }, 'Update balance for subscription failed');
    throw new InternalServerError('Failed to update wallet balance for subscription');
  }
}

/**
 * @deprecated Deprecated class-based wallet service
 *
 * This class is deprecated. Use the exported functions instead:
 * - getBalance(userId, deps)
 * - updateBalanceForPayment(sellerId, amount, deps)
 * - updateBalanceForSubscription(sellerId, amount, deps)
 *
 * Migration Example:
 * ```typescript
 * // Old (deprecated):
 * const walletService = new walletService();
 * const balance = await walletService.getBalance(userId);
 *
 * // New (recommended):
 * import { getBalance } from '@/services/wallet.service';
 * const balance = await getBalance(userId, { neo4j, log });
 * ```
 *
 * The new functions use dependency injection which provides:
 * - Better testability (can mock dependencies)
 * - No session leaks (managed by neo4j plugin)
 * - Type-safe error handling
 * - Structured logging with context
 * - Framework-agnostic (works with Elysia, Express, etc.)
 */
class walletService {
  constructor() {
    throw new Error(
      'walletService class is deprecated. Use exported functions instead:\n' +
        '- getBalance(userId, { neo4j, log })\n' +
        '- updateBalanceForPayment(sellerId, amount, { neo4j, log })\n' +
        '- updateBalanceForSubscription(sellerId, amount, { neo4j, log })\n' +
        '\nSee file documentation for migration examples.',
    );
  }
}

export default walletService;

/**
 * Migration Notes:
 *
 * This service has been refactored from class-based to functional approach with dependency injection.
 *
 * Key Changes:
 * - initializeDbConnection() → deps.neo4j.withSession() (from neo4j plugin)
 * - console.log() → deps.log?.info/error/warn() (structured logging)
 * - Manual session.close() → Automatic cleanup via withSession
 * - Class methods → Exported functions
 * - throw new Error() → throw new NotFoundError/InternalServerError
 *
 * Commission Rates:
 * - Regular payments: 20% platform fee (UpdateBalanceForPayment)
 * - Subscriptions: 30% platform fee (UpdateBalanceForSubscription)
 *
 * Dependencies:
 * - neo4j: Injected from neo4jPlugin via context
 * - log: Injected from loggerPlugin via context
 *
 * Usage in Routes:
 * ```typescript
 * import { getBalance } from '@/services/wallet.service';
 *
 * app.get('/balance/:userId', async ({ params, neo4j, log }) => {
 *   const balance = await getBalance(params.userId, { neo4j, log });
 *   return { balance };
 * });
 * ```
 *
 * Usage in Webhooks (app.ts):
 * ```typescript
 * await updateBalanceForPayment(sellerId, amount, { neo4j, log });
 * await updateBalanceForSubscription(sellerId, amount, { neo4j, log });
 * ```
 */
