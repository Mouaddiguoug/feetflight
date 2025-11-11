export interface Config {
  // Server Configuration
  NODE_ENV: string;
  PORT: string;
  DOMAIN?: string;

  // Security
  SECRET_KEY: string;
  REFRESH_SECRET?: string;
  EMAIL_SECRET?: string;

  // Database
  NEO4J_URI: string;
  NEO4J_USERNAME: string;
  NEO4J_PASSWORD: string;

  // Payment
  STRIPE_TEST_KEY: string;
  STRIPE_WEBHOOK_SECRET?: string;

  // Email
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;

  // Logging
  LOG_FORMAT?: string;
  LOG_DIR?: string;
  LOG_LEVEL?: string;

  // CORS
  ORIGIN?: string;
  CREDENTIALS?: string;

  // AI
  OPENAI_API_KEY?: string;

  // Firebase
  projectId?: string;
}

const env = typeof Bun !== 'undefined' && Bun.env ? Bun.env : process.env;

export const CREDENTIALS = env.CREDENTIALS === 'true';

export const { NODE_ENV, PORT, SECRET_KEY, LOG_FORMAT, LOG_DIR, ORIGIN } = env;

export const config = env;

export const getPort = (): number => parseInt(env.PORT, 10);
export const isProduction = (): boolean => env.NODE_ENV === 'production';
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';

export default config;
