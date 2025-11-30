import Stripe from 'stripe';

/**
 * Configured Stripe client instance
 * Use this instance to interact with the Stripe API throughout the application
 *
 * Note: The client is created without validation at module load time.
 * Validation occurs when attempting to use the client in service functions.
 */
export const stripe = new Stripe(process.env.STRIPE_TEST_KEY || '', {
  apiVersion: '2025-10-29.clover' as const,
});
