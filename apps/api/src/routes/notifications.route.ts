import Elysia from 'elysia';
import { authGuard } from '@/plugins/auth.plugin';
import {
  IdParamSchema,
  PushNotificationSchema,
  GetNotificationsResponseSchema,
  SendNotificationResponseSchema,
} from '@feetflight/shared-types';
import { getNotifications, pushMessageNotification } from '@/services/notification.service';

export function notificationsRoutes() {
  return new Elysia({ name: 'routes.notifications' }).group('/notifications', (app) =>
    app
      .use(authGuard())

      .get(
        '/:id',
        async ({ params, neo4j, log, set }) => {
          const result = await getNotifications(params.id, { neo4j, log });
          set.status = 200;
          return result;
        },
        {
          params: IdParamSchema,
          response: {
            200: GetNotificationsResponseSchema,
          },
          detail: {
            tags: ['Notifications'],
            summary: 'Get User Notifications',
            description:
              'Retrieves all notifications for a user with relative time formatting (e.g., "5 minutes ago")',
          },
        }
      )

      .post(
        '/:id',
        async ({ params, body, neo4j, log, set }) => {
          const message = `${body.userName} just sent you a message`;
          const result = await pushMessageNotification(
            params.id,
            'Message',
            message,
            body.avatar || '',
            {
              neo4j,
              log,
            }
          );
          set.status = 201;
          return result;
        },
        {
          params: IdParamSchema,
          body: PushNotificationSchema,
          response: {
            201: SendNotificationResponseSchema,
          },
          detail: {
            tags: ['Notifications'],
            summary: 'Push Message Notification',
            description:
              'Sends a push notification to user via Firebase Cloud Messaging with optional avatar image',
          },
        }
      )
  );
}
