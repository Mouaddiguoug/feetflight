/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Environment validation is now handled by the envPlugin in src/app.ts using TypeBox schemas.
 *
 * Migration:
 * - Old: validateEnv() called in server.ts before app initialization
 * - New: envPlugin() registered in app.ts, validates on app.onStart
 *
 * Benefits of new approach:
 * - TypeBox schemas provide better type inference
 * - Validation happens during plugin registration (fail-fast)
 * - Descriptive error messages with missing variable names
 * - Integrated with Elysia lifecycle
 * - No external dependency (envalid package)
 *
 * The envPlugin validates all required variables:
 * - PORT, NODE_ENV, SECRET_KEY
 * - NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD
 * - STRIPE_TEST_KEY, STRIPE_WEBHOOK_SECRET
 * - RESEND_API_KEY, RESEND_FROM_EMAIL
 *
 * Optional variables are not validated but have defaults:
 * - REFRESH_SECRET (defaults to SECRET_KEY)
 * - EMAIL_SECRET (defaults to SECRET_KEY)
 * - LOG_LEVEL (defaults to 'info')
 * - ORIGIN (defaults to '*')
 * - CREDENTIALS (defaults to 'false')
 *
 * To migrate your code:
 * 1. Remove the `validateEnv()` call from server.ts
 * 2. Ensure envPlugin() is registered in app.ts (already done)
 * 3. Add STRIPE_WEBHOOK_SECRET to your .env file
 * 4. Test that environment validation still works on server startup
 *
 * This file is kept temporarily for backward compatibility and will be removed
 * once all code has been migrated to use the new envPlugin.
 */

import { cleanEnv, port, str } from 'envalid';

const validateEnv = () => {
  console.warn(
    '\n⚠️  Warning: validateEnv() is deprecated!\n' +
      'Environment validation is now handled by envPlugin in src/app.ts.\n' +
      'Please remove the validateEnv() call from your code.\n',
  );

  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
  });
};

export default validateEnv;
