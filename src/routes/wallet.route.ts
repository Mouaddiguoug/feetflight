import { Router } from 'express';
import walletController from '@controllers/wallet.controller';
import { Routes } from '@interfaces/routes.interface';

class walletRoute implements Routes {
  public path = '/wallet';
  public router = Router();
  public walletController = new walletController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.put(`${this.path}/:id`, this.walletController.updateBalance);
    this.router.get(`${this.path}/:id`, this.walletController.getBalance);
  }
}

export default walletRoute;
