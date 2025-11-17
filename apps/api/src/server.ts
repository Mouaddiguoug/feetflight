import { createApp } from '@/app';
import { appLogger } from '@/plugins/logger.plugin';

const app = createApp();

const port = Number(Bun.env.PORT || process.env.PORT || 3000);

app.listen(port, () => {
  appLogger.info(
    `======= ENV: ${Bun.env.NODE_ENV || process.env.NODE_ENV || 'development'} =======`
  );
  appLogger.info(`🚀 App listening on port ${port}`);
  appLogger.info(`📚 API Docs: http://localhost:${port}/docs`);
});

export default app;
