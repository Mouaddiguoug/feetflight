import { NextFunction, Request, Response } from 'express';
import postService from '@/services/post.service';
import Stripe from 'stripe';

class postController {
  public postService = new postService();

  public getPopularPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const popularPosts = await this.postService.getPopularPosts();

      res.status(201).json({ popularPosts });
    } catch (error) {
      next(error);
    }
  };

  public getRecentPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categoryId = String(req.params.id);
      const recentPosts = await this.postService.getRecentPosts(categoryId);

      res.status(201).json({ data: recentPosts });
    } catch (error) {
      next(error);
    }
  }

  public getPostPictures = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postId = String(req.params.id);
      const postPictures = await this.postService.getPostPictures(postId);

      res.status(201).json({ data: postPictures });
    } catch (error) {
      next(error);
    }
  };

  public updateViews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postId = String(req.params.id);
      const updatedViews = await this.postService.UpdateViews(postId);

      res.status(201).json({ updatedViews });
    } catch (error) {
      next(error);
    }
  };

  public likePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postId = String(req.params.id);
      const likes = await this.postService.likePost(postId);

      res.status(201).json({ like: likes });
    } catch (error) {
      next(error);
    }
  };

  public createPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postData = req.body;
      const userId = String(req.params.id);
      const createdPost = await this.postService.createPost(userId, postData);

      res.status(201).json({ data: createdPost });
    } catch (error) {
      next(error);
    }
  };

  public uploadPostPictures = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pictureFiles = req.files;
      const collectionId = String(req.params.id);
      await this.postService.uploadPostPictures(pictureFiles, collectionId);

      res.status(201).json({ messazge: "post pirctures have been uploaded successfully" });
    } catch (error) {
      next(error);
    }
  };
}

export default postController;
