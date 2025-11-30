// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Config } from './config';

declare module 'bun' {
  interface Env {
    PORT: string;
    NODE_ENV: 'development' | 'production' | 'test';
    DOMAIN?: string;

    SECRET_KEY: string;
    REFRESH_SECRET?: string;
    EMAIL_SECRET?: string;

    NEO4J_URI: string;
    NEO4J_USERNAME: string;
    NEO4J_PASSWORD: string;

    STRIPE_TEST_KEY: string;
    STRIPE_WEBHOOK_SECRET?: string;

    RESEND_API_KEY: string;
    RESEND_FROM_EMAIL: string;

    LOG_FORMAT?: string;
    LOG_DIR?: string;
    LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug' | 'trace';

    ORIGIN?: string;
    CREDENTIALS?: 'true' | 'false';

    OPENAI_API_KEY?: string;
    projectId?: string;
  }
}

declare global {
  namespace NodeJS {
    type ProcessEnv = Bun.Env;
  }
}

export {};
