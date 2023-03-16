import { Router } from 'express';
import postController from '@/controllers/post.controller';
import { Routes } from '@interfaces/routes.interface';

class postRoute implements Routes {
  public path = '/post';
  public router = Router();
  public postController = new postController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/popular/:id`, this.postController.getPopularPosts);
    this.router.get(`${this.path}/recent/:id`, this.postController.getRecentPosts);
    this.router.get(`${this.path}/pictures/:id`, this.postController.getPostPictures);
    this.router.post(`${this.path}/:id`, this.postController.createPost);
    this.router.post(`${this.path}/likes/:id`, this.postController.likePost);
    this.router.put(`${this.path}/views/:id`, this.postController.updateViews);
  }
}

export default postRoute;
