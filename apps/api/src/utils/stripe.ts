import Stripe from 'stripe';

/**
 * Stripe Client - Centralized payment processing client
 *
 * This utility exports a configured Stripe instance for handling payment
 * operations, customer creation, and subscription management. It replaces
 * the Stripe instance previously exported from src/app.ts.
 *
 * @requires STRIPE_TEST_KEY - Environment variable containing the Stripe API key
 * @see https://stripe.com/docs/api
 *
 * @example
 * ```typescript
 * import { stripe } from '@/utils/stripe';
 *
 * // Create a customer
 * const customer = await stripe.customers.create({
 *   email: 'user@example.com',
 *   name: 'John Doe',
 * });
 *
 * // Create a subscription
 * const subscription = await stripe.subscriptions.create({
 *   customer: customer.id,
 *   items: [{ price: 'price_123' }],
 * });
 * ```
 *
 * @note Configuration:
 * - Add STRIPE_TEST_KEY (or STRIPE_SECRET_KEY for production) to your .env file
 * - Get your API keys from: https://dashboard.stripe.com/apikeys
 * - API Version: 2022-11-15
 *
 * @migration
 * - Replaces: Stripe instance from src/app.ts (line 214)
 * - Benefits:
 *   - Centralized configuration
 *   - Single source of truth for Stripe client
 *   - Easier to mock in tests
 *   - Better separation of concerns
 *
 * @note Lazy Initialization:
 * - Validation is deferred until first use to prevent blocking app startup
 * - Missing STRIPE_TEST_KEY will throw an error when attempting to use Stripe
 * - This allows the app to start even if payment functionality is not configured
 */

/**
 * Configured Stripe client instance
 * Use this instance to interact with the Stripe API throughout the application
 *
 * Note: The client is created without validation at module load time.
 * Validation occurs when attempting to use the client in service functions.
 */
export const stripe = new Stripe(process.env.STRIPE_TEST_KEY || '', {
  apiVersion: '2022-11-15',
});
