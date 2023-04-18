import { Router } from 'express';
import sellerController from '@controllers/seller.controller';
import { Routes } from '@interfaces/routes.interface';

class sellerRoute implements Routes {
  public path = '/sellers';
  public router = Router();
  public sellerController = new sellerController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/plans/:id`, this.sellerController.createSubscribePlans);
    this.router.get(`${this.path}/plans/:id`, this.sellerController.getSubscriptionPlans);
  }
}

export default sellerRoute;
