import { Router } from 'express';
import walletController from '@controllers/wallet.controller';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@/middlewares/auth.middleware';

class walletRoute implements Routes {
  public path = '/wallet';
  public router = Router();
  public walletController = new walletController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.put(`${this.path}/:id`, authMiddleware, this.walletController.updateBalance);
    this.router.get(`${this.path}/:id`, authMiddleware, this.walletController.getBalance);
  }
}

export default walletRoute;
