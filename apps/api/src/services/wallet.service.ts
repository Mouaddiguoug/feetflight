import { Logger } from 'pino';
import { BadRequestError, InternalServerError, NotFoundError } from '@/plugins';
import { Tneo4j } from '@/plugins/neo4j.plugin';

export interface WalletServiceDeps {
  neo4j: Tneo4j;
  log?: Logger;
}

export async function getBalance(userId: string, deps: WalletServiceDeps): Promise<number> {
  try {
    const amount = await deps.neo4j.withSession(async (session) => {
      const result = await session.executeRead((tx) =>
        tx.run('MATCH (w:wallet)<-[:HAS_A]-(s:seller)<-[:IS_A]-(:user {id: $userId}) RETURN w', {
          userId,
        })
      );

      if (result.records.length === 0) {
        return null;
      }

      // Handle Neo4j integer conversion
      const amountValue = result.records[0]?.get('w').properties.amount;
      return typeof amountValue === 'object' && 'low' in amountValue
        ? amountValue.low
        : Number(amountValue);
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

export async function updateBalance(
  sellerId: string,
  balanceData: any,
  deps: WalletServiceDeps
): Promise<number> {
  try {
    // Validate balanceData has required fields
    if (!balanceData || typeof balanceData.amount !== 'number') {
      deps.log?.warn(
        { sellerId, balanceData },
        'Invalid balance data: amount field is missing or not a number'
      );
      throw new BadRequestError('Invalid balance data: amount must be a number');
    }

    const amount = balanceData.amount;

    const updatedAmount = await deps.neo4j.withSession(async (session) => {
      // First, get the current balance
      const currentResult = await session.executeRead((tx) =>
        tx.run(
          'MATCH (w:wallet)<-[:HAS_A]-(s:seller {id: $sellerId}) RETURN w.amount as currentAmount',
          {
            sellerId,
          }
        )
      );

      if (currentResult.records.length === 0) {
        return { success: false, amount: null, reason: 'not_found' };
      }

      // Handle Neo4j integer conversion for current balance
      const currentAmountValue = currentResult.records[0]?.get('currentAmount');
      const currentBalance =
        typeof currentAmountValue === 'object' && 'low' in currentAmountValue
          ? currentAmountValue.low
          : Number(currentAmountValue);

      // Calculate new balance
      const newBalance = currentBalance + amount;

      // Business rule: prevent negative balances
      if (newBalance < 0) {
        deps.log?.warn(
          { sellerId, currentBalance, amount, wouldBeBalance: newBalance },
          'Balance update rejected: would result in negative balance'
        );
        return {
          success: false,
          amount: null,
          reason: 'negative_balance',
          currentBalance,
          requestedAmount: amount,
        };
      }

      // Perform the update
      const result = await session.executeWrite((tx) =>
        tx.run(
          'MATCH (w:wallet)<-[:HAS_A]-(s:seller {id: $sellerId}) SET w.amount = w.amount + $amount RETURN w',
          {
            sellerId,
            amount,
          }
        )
      );

      if (result.records.length === 0) {
        return { success: false, amount: null, reason: 'not_found' };
      }

      // Handle Neo4j integer conversion
      const amountValue = result.records[0]?.get('w').properties.amount;
      const finalAmount =
        typeof amountValue === 'object' && 'low' in amountValue
          ? amountValue.low
          : Number(amountValue);

      return { success: true, amount: finalAmount, reason: null };
    });

    if (!updatedAmount.success) {
      if (updatedAmount.reason === 'not_found') {
        deps.log?.warn({ sellerId }, 'Seller wallet not found for balance update');
        throw new NotFoundError('Seller wallet not found');
      } else if (updatedAmount.reason === 'negative_balance') {
        throw new BadRequestError(
          `Insufficient balance: current balance is ${updatedAmount.currentBalance}, cannot subtract ${Math.abs(updatedAmount.requestedAmount)}`
        );
      }
    }

    deps.log?.info(
      { sellerId, amount, newBalance: updatedAmount.amount },
      'Updated wallet balance manually'
    );
    return updatedAmount.amount!;
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    deps.log?.error({ error: errorMessage, sellerId, balanceData }, 'Update balance failed');
    throw new InternalServerError('Failed to update wallet balance');
  }
}

export async function updateBalanceForPayment(
  sellerId: string,
  balanceAmount: number | string,
  deps: WalletServiceDeps
): Promise<void> {
  try {
    // Calculate commission (20% platform fee)
    const amount = Number(balanceAmount);
    const sellerAmount = amount - (amount * 20) / 100;

    await deps.neo4j.withSession(async (session) => {
      await session.executeWrite((tx) =>
        tx.run(
          'MATCH (w:wallet)<-[:HAS_A]-(s:seller {id: $sellerId}) SET w.amount = w.amount + $newAmount',
          {
            newAmount: sellerAmount,
            sellerId,
          }
        )
      );
    });

    deps.log?.info(
      { sellerId, originalAmount: amount, sellerAmount, commission: amount - sellerAmount },
      'Updated balance for payment'
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    deps.log?.error(
      { error: errorMessage, sellerId, balanceAmount },
      'Update balance for payment failed'
    );
    throw new InternalServerError('Failed to update wallet balance for payment');
  }
}

export async function updateBalanceForSubscription(
  sellerId: string,
  balanceAmount: number | string,
  deps: WalletServiceDeps
): Promise<number> {
  try {
    const amount = Number(balanceAmount);
    const sellerAmount = amount - (amount * 30) / 100;

    const updatedAmount = await deps.neo4j.withSession(async (session) => {
      const result = await session.executeWrite((tx) =>
        tx.run(
          'MATCH (w:wallet)<-[:HAS_A]-(s:seller {id: $sellerId}) SET w.amount = w.amount + $newAmount RETURN w',
          {
            newAmount: sellerAmount,
            sellerId,
          }
        )
      );

      if (result.records.length === 0) {
        return null;
      }

      // Handle Neo4j integer conversion
      const amountValue = result.records[0]?.get('w').properties.amount;
      return typeof amountValue === 'object' && 'low' in amountValue
        ? amountValue.low
        : Number(amountValue);
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
      'Updated balance for subscription'
    );

    return updatedAmount;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    deps.log?.error(
      { error: errorMessage, sellerId, balanceAmount },
      'Update balance for subscription failed'
    );
    throw new InternalServerError('Failed to update wallet balance for subscription');
  }
}

/**
 * @deprecated Deprecated class-based wallet service
 */
class walletService {
  constructor() {
    throw new Error(
      'walletService class is deprecated. Use exported functions instead:\n' +
        '- getBalance(userId, { neo4j, log })\n' +
        '- updateBalance(sellerId, { amount }, { neo4j, log })\n' +
        '- updateBalanceForPayment(sellerId, amount, { neo4j, log })\n' +
        '- updateBalanceForSubscription(sellerId, amount, { neo4j, log })\n' +
        '\nSee file documentation for migration examples.'
    );
  }
}

export default walletService;
