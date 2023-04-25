import { NextFunction, Request, Response } from 'express';
import walletService from '@/services/wallet.service';

class WalletController {
  public walletService = new walletService();

  public updateBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sellerId = String(req.params.id);
      const balanceData = req.body;
      const newAmount = await this.walletService.UpdateBalance(sellerId, balanceData);

      res.status(201).json({ data: newAmount });
    } catch (error) {
      next(error);
    }
  };

  public getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);
      const amountWallet = await this.walletService.getBalance(userId);

      res.status(201).json({ data: amountWallet });
    } catch (error) {
      next(error);
    }
  };

  public getPostPictures = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postId = String(req.params.id);
      const postPictures = await this.postService.getPostPictures(postId);

      res.status(201).json({ data: postPictures });
    } catch (error) {
      next(error);
    }
  };

  public updateViews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postId = String(req.params.id);
      const updatedViews = await this.postService.UpdateViews(postId);

      res.status(201).json({ updatedViews });
    } catch (error) {
      next(error);
    }
  };

  public createPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postData = req.body;
      const userId = String(req.params.id);
      const createdPost = await this.postService.createPost(userId, postData);

      res.status(201).json({ data: createdPost });
    } catch (error) {
      next(error);
    }
  };
}

export default WalletController;
