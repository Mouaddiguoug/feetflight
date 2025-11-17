import { uid } from 'uid';
import moment from 'moment';
import { getMessaging } from 'firebase-admin/messaging';
import { InternalServerError } from '@/plugins/error.plugin';
import type { Session } from 'neo4j-driver';
import { Tneo4j } from '@/plugins/neo4j.plugin';
import { Logger } from 'pino';
export interface NotificationServiceDeps {
  neo4j: Tneo4j;
  log?: Logger;
}

export async function getNotifications(
  userId: string,
  deps: NotificationServiceDeps
): Promise<any[]> {
  const { neo4j, log } = deps;

  try {
    const notifications = await neo4j.withSession(async (session: Session) => {
      const result = await session.executeRead((tx) =>
        tx.run(
          'MATCH (notification:notification)<-[:got_notified]-(u:user {id: $userId}) RETURN notification ORDER BY notification.time DESC',
          { userId }
        )
      );

      // Format time for each notification
      result.records.forEach((record) => {
        const days = moment().diff(record.get('notification').properties.time, 'days');
        const hours = moment().diff(record.get('notification').properties.time, 'hours');
        const minutes = moment().diff(record.get('notification').properties.time, 'minutes');
        const seconds = moment().diff(record.get('notification').properties.time, 'seconds');

        if (days == 0) {
          if (hours == 0) {
            if (minutes == 0) {
              if (seconds < 60) {
                record.get('notification').properties.time = `${seconds} seconds`;
              } else {
                record.get('notification').properties.time = `${minutes} minutes`;
              }
            } else if (minutes < 60) {
              record.get('notification').properties.time = `${minutes} minutes`;
            } else {
              record.get('notification').properties.time = `${hours} hours`;
            }
          } else if (hours < 24) {
            record.get('notification').properties.time = `${hours} hours`;
          } else {
            record.get('notification').properties.time = `${days} days`;
          }
        } else {
          record.get('notification').properties.time = `${days} days`;
        }
      });

      return result.records.map((record) => record.get('notification').properties);
    });

    return notifications;
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
): Promise<void> {
  const { neo4j, log } = deps;

  try {
    await neo4j.withSession(async (session: Session) => {
      // Get device token
      const deviceTokenResult = await session.executeRead((tx) =>
        tx.run(
          'MATCH (user:user {id: $userId})-[:logged_in_with]->(deviceToken:deviceToken) RETURN deviceToken',
          { userId }
        )
      );

      if (deviceTokenResult.records.length > 0) {
        const deviceToken = deviceTokenResult.records[0]?.get('deviceToken').properties.token;

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
      } else {
        log?.info({ userId }, 'No device token found, skipping push notification');
      }
    });
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

  try {
    await neo4j.withSession(async (session: Session) => {
      // Get device token
      const deviceTokenResult = await session.executeRead((tx) =>
        tx.run(
          'MATCH (seller {id: $sellerId})<-[:IS_A]-(user:user)-[:logged_in_with]->(deviceToken:deviceToken) RETURN deviceToken',
          { sellerId }
        )
      );

      // Send Firebase push notification if device token exists
      if (deviceTokenResult.records.length > 0) {
        const deviceToken = deviceTokenResult.records[0]?.get('deviceToken').properties.token;

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
      } else {
        log?.info({ sellerId }, 'No device token found for seller, skipping push notification');
      }

      // Create notification node in database
      await session.executeWrite((tx) =>
        tx.run(
          'MATCH (seller {id: $sellerId})<-[:IS_A]-(user:user) CREATE (user)-[:got_notified]->(notification:notification {id: $notificationsId, title: $title, body: $body, time: $time}) RETURN notification',
          {
            sellerId: sellerId,
            notificationsId: uid(10),
            title: title,
            body: body,
            time: moment().format('MMMM DD, YYYY, h:mm:ss a'),
          }
        )
      );

      log?.info({ sellerId }, 'Notification created in database for seller');
    });
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
