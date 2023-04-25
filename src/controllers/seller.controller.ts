import { NextFunction, Request, Response } from 'express';
import sellerService from '@services/seller.service';

class sellerController {
  public sellerService = new sellerService();

  public getSubscriptionPlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);

      const subscriptionPlans = await this.sellerService.getSubscriptiionPlans(userId);

      res.status(200).json({ subscriptionPlans });
    } catch (error) {
      next(error);
    }
  };

  public createSubscribePlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);
      const subscriptionPlansData = req.body;

      const createdSubscriptionPlans = await this.sellerService.createSubscribePlans(userId, subscriptionPlansData);

      res.status(200).json({ createdSubscriptionPlans });
    } catch (error) {
      next(error);
    }
  };

  public uploadIdentityCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);
      
      const identityCardData = req.files;
      
      const identityCard = await this.sellerService.uploadIdentityCard(identityCardData, userId);

      res.status(200).json({ identityCard });
    } catch (error) {
      next(error);
    }
  };
}

export default sellerController;
