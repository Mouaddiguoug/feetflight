import { Type as t, Static } from '@sinclair/typebox';

export const GetIdentityCardParamSchema = t.Object({
  id: t.String({ minLength: 1 }),
});

export type GetIdentityCardParamDTO = Static<typeof GetIdentityCardParamSchema>;
