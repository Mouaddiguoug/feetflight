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

  public requestWithdraw = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);
      const payoutAccountId = String(req.params.payoutAccountId);

      const requestedWithdraw = await this.sellerService.requestWithdraw(userId, payoutAccountId);

      res
        .status(requestedWithdraw ? 201 : 400)
        .json({ message: requestedWithdraw ? 'Your withdraw request is being account has been added successfully!' : 'Something went wrong!' });
    } catch (error) {
      next(error);
    }
  };

  public addPayoutAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);
      const bankAccountData = req.body;

      const payoutAccount = await this.sellerService.addPayoutAccount(userId, bankAccountData);

      res
        .status(payoutAccount ? 201 : 400)
        .json({ message: payoutAccount ? 'Your payout account has been added successfully!' : 'Something went wrong!' });
    } catch (error) {
      next(error);
    }
  };

  public deletePayoutAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.payoutAccountId);

      await this.sellerService.deletePayoutAccount(id);

      res.status(201).json({ message: 'Your payout account has been deleted successfully!' });
    } catch (error) {
      next(error);
    }
  };

  public getPayoutAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);

      const payoutAccount = await this.sellerService.getPayoutAccounts(userId);

      res.status(201).json(payoutAccount);
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

  public getAllSellers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.sellerService.getAllSellers();

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  public uploadSentPicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);
      const tipAmount = String(req.params.tipAmount);
      const receiverId = String(req.params.receiverId);

      const sentPictureDataFile = req.file;

      const sentPictureData = await this.sellerService.uploadSentPicture(sentPictureDataFile, userId, tipAmount, receiverId);
      res.status(201).json(sentPictureData);
    } catch (error) {
      next(error);
    }
  };

  public uploadIdentityCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);

      const identityCardData = req.files;

      await this.sellerService.uploadIdentityCard(identityCardData, userId);

      res.status(201).json({ message: 'identity card haq been uploaded successfully', status: 200 });
    } catch (error) {
      next(error);
    }
  };
}

export default sellerController;
