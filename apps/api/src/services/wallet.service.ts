import { Logger } from 'pino';
import { BadRequestError, InternalServerError, NotFoundError } from '@/plugins';
import { Tneo4j } from '@/plugins/neo4j.plugin';
import { WalletRepository } from '@/domain/repositories/wallet.repository';
import type { GetBalanceResponse, UpdateBalanceResponse } from '@feetflight/shared-types';

export interface WalletServiceDeps {
  neo4j: Tneo4j;
  log: Logger;
}

export async function getBalance(
  userId: string,
  deps: WalletServiceDeps
): Promise<GetBalanceResponse> {
  const walletRepo = new WalletRepository({ neo4j: deps.neo4j, log: deps.log });

  try {
    const amount = await walletRepo.getBalance(userId);
    deps.log?.info({ userId, amount }, 'Retrieved wallet balance');
    return {
      balance: amount,
      sellerId: userId,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      deps.log?.warn({ userId }, 'Wallet not found for user');
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
): Promise<UpdateBalanceResponse> {
  const walletRepo = new WalletRepository({ neo4j: deps.neo4j, log: deps.log });

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

    // Get current balance to check for negative
    const currentBalance = await walletRepo.getBalance(sellerId);
    const newBalance = currentBalance + amount;

    // Business rule: prevent negative balances
    if (newBalance < 0) {
      deps.log?.warn(
        { sellerId, currentBalance, amount, wouldBeBalance: newBalance },
        'Balance update rejected: would result in negative balance'
      );
      throw new BadRequestError(
        `Insufficient balance: current balance is ${currentBalance}, cannot subtract ${Math.abs(amount)}`
      );
    }

    // Perform the update
    const updatedAmount = await walletRepo.addToBalance(sellerId, amount);

    deps.log?.info(
      { sellerId, amount, newBalance: updatedAmount },
      'Updated wallet balance manually'
    );
    return {
      message: 'Wallet balance updated successfully',
      newBalance: updatedAmount,
    };
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
  const walletRepo = new WalletRepository({ neo4j: deps.neo4j, log: deps.log });

  try {
    // Calculate commission (20% platform fee)
    const amount = Number(balanceAmount);
    const sellerAmount = amount - (amount * 20) / 100;

    await walletRepo.addToBalance(sellerId, sellerAmount);

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
  const walletRepo = new WalletRepository({ neo4j: deps.neo4j, log: deps.log });

  try {
    const amount = Number(balanceAmount);
    const sellerAmount = amount - (amount * 30) / 100;

    const updatedAmount = await walletRepo.addToBalance(sellerId, sellerAmount);

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
