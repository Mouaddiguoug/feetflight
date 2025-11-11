import { NextFunction, Request, Response } from 'express';
import { getBalance, updateBalance } from '@/services/wallet.service';

/**
 * @deprecated This Express controller is deprecated and will be removed in a future version.
 */
class WalletController {
  public updateBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sellerId = String(req.params.id);
      const balanceData = req.body;

      // Note: This requires neo4j and log dependencies which are not available in Express context
      // This is a limitation of the old Express pattern - proper migration to Elysia is recommended
      throw new Error('WalletController is deprecated. Please use Elysia wallet routes at /wallet');
    } catch (error) {
      next(error);
    }
  };

  public getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);

      // Note: This requires neo4j and log dependencies which are not available in Express context
      // This is a limitation of the old Express pattern - proper migration to Elysia is recommended
      throw new Error('WalletController is deprecated. Please use Elysia wallet routes at /wallet');
    } catch (error) {
      next(error);
    }
  };
}

export default WalletController;
