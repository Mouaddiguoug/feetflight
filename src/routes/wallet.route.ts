import { Router } from 'express';
import walletController from '@controllers/wallet.controller';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';

class walletRoute implements Routes {
  public path = '/wallet';
  public router = Router();
  public walletController = new walletController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/:id`, this.walletController.updateAmount);
  }
}

export default walletRoute;
