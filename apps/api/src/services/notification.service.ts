import moment from 'moment';
import { getMessaging } from 'firebase-admin/messaging';
import { InternalServerError } from '@/plugins/error.plugin';
import type { Session } from 'neo4j-driver';
import { Tneo4j } from '@/plugins/neo4j.plugin';
import { Logger } from 'pino';
import { NotificationRepository } from '@/domain/repositories/notification.repository';
import { UserRepository } from '@/domain/repositories/user.repository';
import type { GetNotificationsResponse, SendNotificationResponse } from '@feetflight/shared-types';

export interface NotificationServiceDeps {
  neo4j: Tneo4j;
  log: Logger;
}

export async function getNotifications(
  userId: string,
  deps: NotificationServiceDeps
): Promise<GetNotificationsResponse> {
  const { neo4j, log } = deps;
  const notificationRepo = new NotificationRepository({ neo4j, log });

  try {
    const notifications = await notificationRepo.getUserNotifications(userId);
    const unreadCount = await notificationRepo.getUnreadCount(userId);

    // Format time for each notification
    const formattedNotifications = notifications.map((notif) => {
      // Convert Integer to string if needed
      const timeValue =
        typeof notif.time === 'object' && 'toNumber' in notif.time
          ? (notif.time as any).toNumber()
          : notif.time;
      const days = moment().diff(timeValue, 'days');
      const hours = moment().diff(timeValue, 'hours');
      const minutes = moment().diff(timeValue, 'minutes');
      const seconds = moment().diff(timeValue, 'seconds');

      let formattedTime: string;
      if (days === 0) {
        if (hours === 0) {
          if (minutes === 0) {
            formattedTime = seconds < 60 ? `${seconds} seconds` : `${minutes} minutes`;
          } else {
            formattedTime = minutes < 60 ? `${minutes} minutes` : `${hours} hours`;
          }
        } else {
          formattedTime = hours < 24 ? `${hours} hours` : `${days} days`;
        }
      } else {
        formattedTime = `${days} days`;
      }

      return {
        ...notif,
        time: formattedTime,
      };
    });

    return {
      notifications: formattedNotifications,
      total: formattedNotifications.length,
      unreadCount,
    };
  } catch (error) {
    log?.error({ error, userId }, 'Get notifications failed');
    throw new InternalServerError(
      `Failed to get notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function pushMessageNotification(
  userId: string,
  title: string,
  body: string,
  avatar: string,
  deps: NotificationServiceDeps
): Promise<SendNotificationResponse> {
  const { neo4j, log } = deps;
  const userRepo = new UserRepository({ neo4j, log });
  const notificationRepo = new NotificationRepository({ neo4j, log });

  try {
    // Get device tokens using repository
    const deviceTokens = await userRepo.getDeviceTokens(userId);

    if (deviceTokens.length > 0) {
      const deviceToken = deviceTokens[0]; // Use first token

      if (!deviceToken) {
        log?.warn({ userId }, 'Device token is empty, skipping push notification');
      } else {
        log?.info(
          { userId, avatar: `${process.env.DOMAIN}${avatar}` },
          'Sending push notification'
        );

        const message = {
          notification: {
            title: title,
            body: body,
          },
          android: avatar
            ? {
                notification: {
                  imageUrl: `${process.env.DOMAIN}${avatar}`,
                },
              }
            : {},
          apns: avatar
            ? {
                payload: {
                  aps: {
                    'mutable-content': 1,
                  },
                },
                fcm_options: {
                  image: `${process.env.DOMAIN}${avatar}`,
                },
              }
            : {},
          webpush: avatar
            ? {
                headers: {
                  image: `${process.env.DOMAIN}${avatar}`,
                },
              }
            : {},
          token: deviceToken,
        };

        try {
          await getMessaging().send(message);
          log?.info({ userId }, 'Push notification sent successfully');
        } catch (error) {
          // Log Firebase errors but don't throw (graceful degradation)
          log?.error({ error, userId }, 'Firebase push notification failed');
        }
      }
    } else {
      log?.info({ userId }, 'No device token found, skipping push notification');
    }

    // Create notification in database
    const notification = await notificationRepo.create(userId, { title, body });

    return {
      message: 'Notification sent successfully',
      notificationId: notification.id,
    };
  } catch (error) {
    log?.error({ error, userId }, 'Push message notification failed');
    throw new InternalServerError(
      `Failed to push message notification: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function pushSellerNotifications(
  sellerId: string,
  title: string,
  body: string,
  deps: NotificationServiceDeps
): Promise<void> {
  const { neo4j, log } = deps;
  const userRepo = new UserRepository({ neo4j, log });
  const notificationRepo = new NotificationRepository({ neo4j, log });

  try {
    // Get user ID for the seller (need to query for this)
    const userId = await neo4j.withSession(async (session: Session) => {
      const result = await session.executeRead((tx) =>
        tx.run('MATCH (seller {id: $sellerId})<-[:IS_A]-(user:user) RETURN user.id as userId', {
          sellerId,
        })
      );
      return result.records[0]?.get('userId');
    });

    if (!userId) {
      log?.warn({ sellerId }, 'Seller user not found');
      return;
    }

    // Get device tokens using repository
    const deviceTokens = await userRepo.getDeviceTokens(userId);

    // Send Firebase push notification if device token exists
    if (deviceTokens.length > 0) {
      const deviceToken = deviceTokens[0]; // Use first token

      if (!deviceToken) {
        log?.warn({ sellerId }, 'Device token is empty, skipping push notification to seller');
      } else {
        const message = {
          notification: {
            title: title,
            body: body,
          },
          token: deviceToken,
        };

        try {
          await getMessaging().send(message);
          log?.info({ sellerId }, 'Push notification sent successfully to seller');
        } catch (error) {
          // Log Firebase errors but don't throw (graceful degradation)
          log?.error({ error, sellerId }, 'Firebase push notification failed for seller');
        }
      }
    } else {
      log?.info({ sellerId }, 'No device token found for seller, skipping push notification');
    }

    // Create notification in database using repository
    await notificationRepo.create(userId, { title, body });

    log?.info({ sellerId }, 'Notification created in database for seller');
  } catch (error) {
    log?.error({ error, sellerId }, 'Push seller notifications failed');
    throw new InternalServerError(
      `Failed to push seller notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

class NotificationService {
  private deps: NotificationServiceDeps;

  constructor(deps?: NotificationServiceDeps) {
    if (!deps) {
      throw new Error(
        'NotificationService now requires dependencies to be passed to constructor. ' +
          'Pass { neo4j, log } to the constructor, or use the exported functions directly.'
      );
    }
    this.deps = deps;
  }

  /**
   * @deprecated Use the exported getNotifications() function instead
   * Note: Typo was fixed - this method was originally named getNotofications
   */
  public async getNotofications(userId: string): Promise<any> {
    return getNotifications(userId, this.deps);
  }

  /**
   * @deprecated Use the exported pushMessageNotification() function instead
   */
  public async pushMessageNotification(
    userId: string,
    title: string,
    body: string,
    avatar: string
  ): Promise<any> {
    return pushMessageNotification(userId, title, body, avatar, this.deps);
  }

  /**
   * Legacy method with typo - kept for backward compatibility
   * @deprecated Use pushSellerNotifications() (correct spelling) or the exported function
   */
  public async pushSellerNotificatons(sellerId: string, title: string, body: string): Promise<any> {
    return pushSellerNotifications(sellerId, title, body, this.deps);
  }

  /**
   * @deprecated Use the exported pushSellerNotifications() function instead
   * Note: This is the correctly spelled version of pushSellerNotificatons
   */
  public async pushSellerNotifications(
    sellerId: string,
    title: string,
    body: string
  ): Promise<any> {
    return pushSellerNotifications(sellerId, title, body, this.deps);
  }
}

export default NotificationService;
