import { Router } from 'express';
import postController from '@/controllers/post.controller';
import { Routes } from '@interfaces/routes.interface';
import multer from 'multer';
import fileMiddleware from '@/middlewares/fileValidation.middleware';
import authMiddleware from '@/middlewares/auth.middleware';

class postRoute implements Routes {
  public path = '/albums';
  public router = Router();
  public postController = new postController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, authMiddleware, this.postController.getAllAlbums);
    this.router.get(`${this.path}/popular`, authMiddleware, this.postController.getPopularAlbums);
    this.router.get(`${this.path}/category/:id`, authMiddleware, this.postController.getAlbumByCategory);
    this.router.get(`${this.path}/pictures/:id`, authMiddleware, this.postController.getPostPictures);
    this.router.get(`${this.path}/categories`, this.postController.getCategories);
    this.router.post(`${this.path}/:id`, this.postController.createPost);
    this.router.post(`${this.path}/upload/:id`, multer().array("postPicture"), fileMiddleware, this.postController.uploadPostPictures);
    this.router.post(`${this.path}/likes/:id`, authMiddleware, this.postController.likePost);
    this.router.put(`${this.path}/views/:id`, authMiddleware, this.postController.updateViews);
  }
}

export default postRoute;
