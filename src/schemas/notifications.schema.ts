import { Type as t, Static } from '@sinclair/typebox';


export const PushNotificationSchema = t.Object({
  userName: t.String({ minLength: 1 }),
  avatar: t.Optional(t.String()),
});

export type PushNotificationDTO = Static<typeof PushNotificationSchema>;
