import { Router } from 'express';
import AdminController from '@/controllers/admin.controller';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';

class AdminRoute implements Routes {
  public path = '/admin';
  public router = Router();
  public AdminController = new AdminController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/identityCard/:id`, this.AdminController.getSellerIdentityCardSession);
  }
}

export default AdminRoute;
