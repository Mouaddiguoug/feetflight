import { t } from 'elysia';
import { Static } from '@sinclair/typebox';

/**
 * NotificationSchema
 * Represents a single notification
 */
export const NotificationSchema = t.Object({
  id: t.String({
    description: 'Notification unique identifier',
  }),
  title: t.String({
    description: 'Notification title',
  }),
  body: t.String({
    description: 'Notification body/message',
  }),
  time: t.String({
    description: 'Notification timestamp',
  }),
  read: t.Optional(
    t.Boolean({
      description: 'Whether notification has been read',
    }),
  ),
});

export type NotificationResponse = Static<typeof NotificationSchema>;

/**
 * GetNotificationsResponseSchema
 * Response for GET /notifications/:userId
 */
export const GetNotificationsResponseSchema = t.Object({
  notifications: t.Array(NotificationSchema, {
    description: 'Array of notifications',
  }),
  total: t.Number({
    description: 'Total notification count',
    minimum: 0,
  }),
  unreadCount: t.Number({
    description: 'Count of unread notifications',
    minimum: 0,
  }),
});

export type GetNotificationsResponse = Static<typeof GetNotificationsResponseSchema>;

/**
 * SendNotificationResponseSchema
 * Response for POST /notifications/send
 */
export const SendNotificationResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  notificationId: t.String({
    description: 'Sent notification ID',
  }),
});

export type SendNotificationResponse = Static<typeof SendNotificationResponseSchema>;

/**
 * DeleteNotificationResponseSchema
 * Response for DELETE /notifications/:notificationId
 */
export const DeleteNotificationResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  deletedNotificationId: t.String({
    description: 'Deleted notification ID',
  }),
});

export type DeleteNotificationResponse = Static<typeof DeleteNotificationResponseSchema>;
