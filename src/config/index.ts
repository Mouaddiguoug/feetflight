/**
 * Configuration Module
 *
 * Exports environment variables for use throughout the application.
 *
 * Migration Notes:
 * - Removed dotenv package (Bun loads .env files automatically)
 * - Changed from process.env to Bun.env with fallback to process.env
 * - Added type-safe Config interface
 * - Environment validation now handled by envPlugin in app.ts
 *
 * Bun Environment File Loading:
 * Bun automatically loads .env files in the following order:
 * 1. .env.${Bun.env.NODE_ENV}.local (e.g., .env.development.local)
 * 2. .env.local
 * 3. .env.${Bun.env.NODE_ENV} (e.g., .env.development)
 * 4. .env
 *
 * Note: No need to call config() or require('dotenv') - Bun handles this natively.
 */

/**
 * Environment Configuration Interface
 *
 * Defines all environment variables used in the application.
 * Optional fields have default values or are not required for basic functionality.
 */
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

// Use Bun.env with fallback to process.env for compatibility
const env = typeof Bun !== 'undefined' && Bun.env ? Bun.env : process.env;

// Parse CREDENTIALS boolean
export const CREDENTIALS = env.CREDENTIALS === 'true';

// Export commonly used variables
export const { NODE_ENV, PORT, SECRET_KEY, LOG_FORMAT, LOG_DIR, ORIGIN } = env;

// Export typed config object
export const config: Partial<Config> = env as any;

// Export default
export default config;
