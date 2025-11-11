/**
 * @deprecated This file is DEPRECATED and can be safely removed.
 * Environment validation is now handled by the envPlugin in src/app.ts using TypeBox schemas.
 *
 * Migration Status: ✅ COMPLETE
 * - ✅ envPlugin created in src/app.ts with TypeBox validation
 * - ✅ env.d.ts created for TypeScript type augmentation
 * - ✅ config/index.ts updated to use Bun.env with proper typing
 * - ✅ All routes migrated to Elysia
 * - ✅ validateEnv() calls removed from codebase
 *
 * Benefits of New Approach:
 * - TypeBox schemas provide compile-time type inference
 * - Validation happens during plugin registration (fail-fast)
 * - Descriptive error messages with field-level validation
 * - Integrated with Elysia lifecycle
 * - No external dependency (envalid package removed)
 * - Type augmentation in env.d.ts provides IDE autocomplete
 *
 * The envPlugin validates all required variables:
 * - PORT, NODE_ENV, SECRET_KEY
 * - NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD
 * - STRIPE_TEST_KEY, STRIPE_WEBHOOK_SECRET
 * - RESEND_API_KEY, RESEND_FROM_EMAIL
 *
 * Optional variables with defaults:
 * - REFRESH_SECRET (defaults to SECRET_KEY)
 * - EMAIL_SECRET (defaults to SECRET_KEY)
 * - LOG_LEVEL (defaults to 'info')
 * - ORIGIN (defaults to '*')
 * - CREDENTIALS (defaults to 'false')
 *
 * To Remove This File:
 * 1. Verify no code calls validateEnv() (search codebase)
 * 2. Remove this file: src/utils/validateEnv.ts
 * 3. Remove envalid from package.json dependencies (if present)
 * 4. Run: bun remove envalid (if installed)
 * 5. Update any imports that reference this file
 *
 * This file is kept temporarily to prevent breaking changes during gradual migration.
 * It can be safely deleted once you've verified no code depends on it.
 */

const validateEnv = () => {
  console.warn(
    '\n' +
      '═══════════════════════════════════════════════════════════════\n' +
      '⚠️  WARNING: validateEnv() is DEPRECATED and no longer needed!\n' +
      '═══════════════════════════════════════════════════════════════\n' +
      '\n' +
      'Environment validation is now handled by envPlugin in src/app.ts\n' +
      'using TypeBox schemas with better type safety and error messages.\n' +
      '\n' +
      'This file can be safely removed. To remove:\n' +
      '  1. Delete src/utils/validateEnv.ts\n' +
      '  2. Run: bun remove envalid (if installed)\n' +
      '  3. Remove any imports of this file\n' +
      '\n' +
      '═══════════════════════════════════════════════════════════════\n',
  );

  // No-op: validation now handled by envPlugin
  // Envalid import removed to avoid runtime overhead
};

export default validateEnv;
