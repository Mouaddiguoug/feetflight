import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import NotificationController from '@/controllers/notifications.controller';

class NotificationsRoute implements Routes {
  public path = '/notifications';
  public router = Router();
  public notificationsController = new NotificationController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:id`, this.notificationsController.getNotifications);
    this.router.post(`${this.path}/:id`, this.notificationsController.pushNotification);
  }
}

export default NotificationsRoute;
