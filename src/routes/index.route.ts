import { Elysia, t } from 'elysia';


export function indexRoutes() {
  return new Elysia({ name: 'routes.index' })
    .get(
      '/',
      () => ({ status: 'ok', message: 'Feetflight API is running' }),
      {
        detail: {
          tags: ['Health'],
          summary: 'Health Check',
          description: 'Returns API status to verify the server is running',
        }
      },
    );
}

export default indexRoutes;
