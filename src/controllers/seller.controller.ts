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

  public getFollowersCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sellerId = String(req.params.id);
      
      const followersCount = await this.sellerService.getFollowersCount(sellerId);

      res.status(201).json({ followers: followersCount });
    } catch (error) {
      next(error);
    }
  };

  public updatePlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plans = req.body.data;
      
      const result = await this.sellerService.changePlans(plans);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  public uploadIdentityCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);
      
      const identityCardData = req.files;
      
      await this.sellerService.uploadIdentityCard(identityCardData, userId);

      res.status(201).json({ message: "identity card haq been uploaded successfully", status: 200 });
    } catch (error) {
      next(error);
    }
  };
}

export default sellerController;
