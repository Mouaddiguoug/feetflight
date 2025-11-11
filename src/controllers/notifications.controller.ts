import NotificationService from '@/services/notification.service';
import { NextFunction, Request, Response } from 'express';

/**
 * @deprecated This Express controller is deprecated and will be removed in a future version.
 */
class NotificationController {
  public notificationService = new NotificationService();

  public getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;
    try {
      const notifications = await this.notificationService.getNotofications(userId);

      res.status(201).json(notifications);
    } catch (error) {
      console.log(error);
    }
  };

  public pushNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;
    const messageData = req.body;
    try {
      console.log(messageData.avatar);

      await this.notificationService.pushMessageNotification(
        userId,
        'Message',
        `${messageData.userName} just sent you a message`,
        messageData.avatar,
      );

      res.status(201).json('sent successfully');
    } catch (error) {
      console.log(error);
    }
  };
}

export default NotificationController;
