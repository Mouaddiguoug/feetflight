import { Router } from 'express';
import postController from '@/controllers/post.controller';
import { Routes } from '@interfaces/routes.interface';
import multer from 'multer';
import fileMiddleware from '@/middlewares/fileValidation.middleware';

class postRoute implements Routes {
  public path = '/albums';
  public router = Router();
  public postController = new postController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/popular`, this.postController.getPopularAlbums);
    this.router.get(`${this.path}/category/:id`, this.postController.getAlbumByCategory);
    this.router.get(`${this.path}/pictures/:id`, this.postController.getPostPictures);
    this.router.get(`${this.path}/categories`, this.postController.getCategories);
    this.router.post(`${this.path}/:id`, this.postController.createPost);
    this.router.post(`${this.path}/upload/:id`, multer().array("postPicture"), fileMiddleware, this.postController.uploadPostPictures);
    this.router.post(`${this.path}/likes/:id`, this.postController.likePost);
    this.router.put(`${this.path}/views/:id`, this.postController.updateViews);
  }
}

export default postRoute;
