import { Router } from 'express';
import UsersController from '@controllers/users.controller';
import { Routes } from '@interfaces/routes.interface';
import multer from 'multer';
import fileMiddleware from '@/middlewares/fileValidation.middleware';
import { request } from 'http';
import authMiddleware from '@/middlewares/auth.middleware';

class UsersRoute implements Routes {
  public path = '/users';
  public router = Router();
  public usersController = new UsersController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:id`,authMiddleware , this.usersController.getUserById);
    this.router.get(`${this.path}`, authMiddleware, this.usersController.getUsers);
    this.router.post(`${this.path}/buy/:id`, authMiddleware, this.usersController.buyPost);
    this.router.post(`${this.path}/subscribe/:id`, authMiddleware, this.usersController.subscribe);
    this.router.post(`${this.path}/unsubscribe/:id/:sellerId`, authMiddleware, this.usersController.cancelSubscription);
    this.router.get(`${this.path}/confirmation/:token`, this.usersController.emailConfirming);
    this.router.get(`${this.path}/:email`, authMiddleware, this.usersController.changePassword);
    this.router.get(`${this.path}/plans/:id`,authMiddleware, this.usersController.getSellerPlans);
    this.router.get(`${this.path}/ai/generatePictures`, this.usersController.generateAiPictures);
    this.router.put(`${this.path}/:id`, authMiddleware, this.usersController.updateUser);
    this.router.post(`${this.path}/generateOtp/:email`, this.usersController.generateOtp);
    this.router.post(`${this.path}/verifyOtp/:email`, this.usersController.verifyOtp);
    this.router.get(`${this.path}/verify/checkForSale/:userId/:postId/:plan`, this.usersController.checkForSale);
    this.router.post(`${this.path}/devices/token/:id`, authMiddleware, this.usersController.uploadDeviceToken);
    this.router.post(`${this.path}/desactivate/:id`, this.usersController.desactivateUser);
    this.router.get(`${this.path}/followed/:id`, this.usersController.getFollowedSellers);
    this.router.post(
      `${this.path}/upload/avatar/:id`,
      authMiddleware,
      multer().single('avatar'),
      fileMiddleware,
      
      this.usersController.uploadAvatar,
    );
    this.router.post(
      `${this.path}/upload/sent/picture/:id`,
      authMiddleware,
      multer().single('sentPicture'),
      fileMiddleware,
      
      this.usersController.uploadAvatar,
    );
  }
}

export default UsersRoute;
