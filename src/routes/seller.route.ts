import { Router } from 'express';
import sellerController from '@controllers/seller.controller';
import { Routes } from '@interfaces/routes.interface';
import multer from 'multer';
import fileMiddleware from '@/middlewares/fileValidation.middleware';
import authMiddleware from '@/middlewares/auth.middleware';

class sellerRoute implements Routes {
  public path = '/sellers';
  public router = Router();
  public sellerController = new sellerController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/plans/:id`, authMiddleware, this.sellerController.createSubscribePlans);
    this.router.get(`${this.path}/plans/:id`, authMiddleware, this.sellerController.getSubscriptionPlans);
    this.router.put(`${this.path}/plans`, authMiddleware, this.sellerController.updatePlans);
    this.router.get(`${this.path}`, authMiddleware, this.sellerController.getAllSellers);
    this.router.get(`${this.path}/followers/:id`, authMiddleware, this.sellerController.getFollowersCount);
    this.router.post(
      `${this.path}/upload/identitycard/:id`,
      multer().fields([
        { name: 'frontSide', maxCount: 1 },
        { name: 'backSide', maxCount: 1 },
      ]),
      fileMiddleware,
      this.sellerController.uploadIdentityCard,
    );
    this.router.post(
      `${this.path}/upload/sent/picture/:id`,
      authMiddleware,
      multer().single('sentPicture'),
      fileMiddleware,
      
      this.sellerController.uploadSentPicture,
    );
  }
}

export default sellerRoute;
