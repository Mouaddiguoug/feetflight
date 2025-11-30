import { Integer, QueryResult } from 'neo4j-driver';
import { BaseRepository, NodeProps } from './base.repository';
import { NotFoundError } from '../../plugins/error.plugin';

/**
 * Notification Repository - Type-Safe Implementation
 *
 * Handles all database operations related to user notifications.
 * Notifications are messages sent to users about system events.
 *
 * Type Safety Benefits:
 * - IntelliSense autocomplete for all properties
 * - Compile-time error detection
 * - No runtime errors from typos in property names
 * - Automatic Integer to number conversion
 */

/**
 * Notification node properties as stored in Neo4j
 */
export interface NotificationNodeProps {
  id: string;
  title: string;
  body: string;
  time: string | Integer;
  read?: boolean;
}

/**
 * Notification properties after conversion
 */
export type NotificationProperties = NodeProps<NotificationNodeProps>;

/**
 * Type-safe record interfaces for query results
 */
interface NotificationRecord {
  notification: NotificationNodeProps;
  [key: string]: unknown;
}

interface NotificationsRecord {
  notifications: NotificationNodeProps[];
  [key: string]: unknown;
}

interface CountRecord {
  count: Integer;
  [key: string]: unknown;
}

/**
 * Input for creating a notification
 */
export interface CreateNotificationInput {
  title: string;
  body: string;
}

export class NotificationRepository extends BaseRepository {
  /**
   * Find notification by ID
   */
  async findById(notificationId: string): Promise<NotificationProperties | null> {
    const query = `
      MATCH (notification:notification {id: $notificationId})
      RETURN notification {.*} as notification
    `;

    const result = await this.executeRead<NotificationRecord>(query, { notificationId });
    const notificationData = this.getValue<NotificationRecord['notification']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'notification'
    );

    if (!notificationData) {
      return null;
    }

    return {
      id: notificationData.id,
      title: notificationData.title,
      body: notificationData.body,
      time:
        typeof notificationData.time === 'string'
          ? notificationData.time
          : notificationData.time.toString(),
      read: notificationData.read ?? false,
    };
  }

  /**
   * Find notification by ID or throw error
   */
  async findByIdOrFail(notificationId: string): Promise<NotificationProperties> {
    const notification = await this.findById(notificationId);

    if (!notification) {
      throw new NotFoundError(`Notification with ID ${notificationId} not found`);
    }

    return notification;
  }

  /**
   * Create a new notification for a user
   */
  async create(userId: string, input: CreateNotificationInput): Promise<NotificationProperties> {
    const notificationId = `notif_${Date.now()}`;

    const query = `
      MATCH (user:user {id: $userId})
      CREATE (notification:notification {
        id: $notificationId,
        title: $title,
        body: $body,
        time: datetime().epochMillis,
        read: false
      })
      CREATE (user)-[:HAS_NOTIFICATION]->(notification)
      RETURN notification {.*} as notification
    `;

    const params = {
      userId,
      notificationId,
      title: input.title,
      body: input.body,
    };

    const result = await this.executeWrite<NotificationRecord>(query, params);
    const notificationData = this.getValue<NotificationRecord['notification']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'notification'
    );

    if (!notificationData) {
      throw new Error('Failed to create notification');
    }

    return {
      id: notificationData.id,
      title: notificationData.title,
      body: notificationData.body,
      time:
        typeof notificationData.time === 'string'
          ? notificationData.time
          : notificationData.time.toString(),
      read: notificationData.read ?? false,
    };
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string): Promise<void> {
    const query = `
      MATCH (notification:notification {id: $notificationId})
      DETACH DELETE notification
    `;

    await this.executeWrite(query, { notificationId });
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string): Promise<NotificationProperties[]> {
    const query = `
      MATCH (user:user {id: $userId})-[:HAS_NOTIFICATION]->(notification:notification)
      RETURN collect(notification {.*}) as notifications
      ORDER BY notification.time DESC
    `;

    const result = await this.executeRead<NotificationsRecord>(query, { userId });
    const notifications = this.getValue<NotificationsRecord['notifications']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'notifications'
    );

    return (notifications ?? []).map((notif) => ({
      id: notif.id,
      title: notif.title,
      body: notif.body,
      time: typeof notif.time === 'string' ? notif.time : notif.time.toString(),
      read: notif.read ?? false,
    }));
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const query = `
      MATCH (notification:notification {id: $notificationId})
      SET notification.read = true
    `;

    await this.executeWrite(query, { notificationId });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const query = `
      MATCH (user:user {id: $userId})-[:HAS_NOTIFICATION]->(notification:notification)
      SET notification.read = true
    `;

    await this.executeWrite(query, { userId });
  }

  /**
   * Get unread notifications count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const query = `
      MATCH (user:user {id: $userId})-[:HAS_NOTIFICATION]->(notification:notification {read: false})
      RETURN count(notification) as count
    `;

    const result = await this.executeRead<CountRecord>(query, { userId });
    const count = this.getValue<Integer>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'count'
    );

    return this.toNumber(count ?? 0);
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<NotificationProperties[]> {
    const query = `
      MATCH (user:user {id: $userId})-[:HAS_NOTIFICATION]->(notification:notification {read: false})
      RETURN collect(notification {.*}) as notifications
      ORDER BY notification.time DESC
    `;

    const result = await this.executeRead<NotificationsRecord>(query, { userId });
    const notifications = this.getValue<NotificationsRecord['notifications']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'notifications'
    );

    return (notifications ?? []).map((notif) => ({
      id: notif.id,
      title: notif.title,
      body: notif.body,
      time: typeof notif.time === 'string' ? notif.time : notif.time.toString(),
      read: notif.read ?? false,
    }));
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllForUser(userId: string): Promise<void> {
    const query = `
      MATCH (user:user {id: $userId})-[:HAS_NOTIFICATION]->(notification:notification)
      DETACH DELETE notification
    `;

    await this.executeWrite(query, { userId });
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteReadNotifications(userId: string): Promise<void> {
    const query = `
      MATCH (user:user {id: $userId})-[:HAS_NOTIFICATION]->(notification:notification {read: true})
      DETACH DELETE notification
    `;

    await this.executeWrite(query, { userId });
  }
}
