import { Router } from 'express';
import postController from '@/controllers/post.controller';
import { Routes } from '@interfaces/routes.interface';
import multer from 'multer';
import fileMiddleware from '@/middlewares/fileValidation.middleware';
import authMiddleware from '@/middlewares/auth.middleware';
import sellerMiddleware from '@/middlewares/seller.middleware';

class postRoute implements Routes {
  public path = '/albums';
  public router = Router();
  public postController = new postController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/popular/:id`, authMiddleware, this.postController.getPopularAlbums);
    this.router.get(`${this.path}/random/:page/:id`, this.postController.getRandomAlbums);
    this.router.get(`${this.path}/seller/:id`, this.postController.getSellerAlbum);
    this.router.get(`${this.path}/category/:id`, authMiddleware, this.postController.getAlbumByCategory);
    this.router.get(`${this.path}/pictures/:id`, authMiddleware, this.postController.getPostPictures);
    this.router.get(`${this.path}/all-categories`, authMiddleware, this.postController.getCategories);
    this.router.get(`${this.path}/:id`, authMiddleware, this.postController.getAllAlbums);
    this.router.delete(`${this.path}/:id`, authMiddleware, this.postController.deleteAlbum);
    this.router.get(`${this.path}/plan/:id`, this.postController.getAlbumPlan);
    this.router.post(`${this.path}/:id`, authMiddleware, sellerMiddleware, this.postController.createPost);
    this.router.post(`${this.path}/upload/:id`, multer().any(), fileMiddleware, this.postController.uploadPostPictures);
    this.router.post(`${this.path}/likes/:id`, this.postController.likePost);
    this.router.put(`${this.path}/views/:id`, authMiddleware, this.postController.updateViews);
  }
}

export default postRoute;
