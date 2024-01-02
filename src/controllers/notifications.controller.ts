import NotificationService from '@/services/notification.service';
import { NextFunction, Request, Response } from 'express';

class NotificationController {
  public notificationService = new NotificationService();

  public getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id
    try {
        
      const notifications = await this.notificationService.getNotofications(userId);

      res.status(201).json(notifications);
    } catch (error) {
      console.log(error);
    }
  };
}

export default NotificationController;
