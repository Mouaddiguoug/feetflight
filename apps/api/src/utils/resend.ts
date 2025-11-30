import { Resend } from 'resend';

/**
 * Resend Client - Centralized email delivery client
 *
 * This utility exports a configured Resend instance for sending transactional
 * and verification emails. It replaces the nodemailer transporter previously
 * exported from src/app.ts.
 *
 * @requires RESEND_API_KEY - Environment variable containing the Resend API key
 * @see https://resend.com/docs
 *
 * @example
 * ```typescript
 * import { resend } from '@/utils/resend';
 * import { render } from '@react-email/render';
 * import { VerifyEmailTemplate } from '@/emails/verify-email';
 *
 * const html = await render(
 *   <VerifyEmailTemplate userName="John" token="abc123" domain="https://example.com" role="Buyer" />
 * );
 *
 * await resend.emails.send({
 *   from: 'Feetflight <onboarding@yourdomain.com>',
 *   to: 'user@example.com',
 *   subject: 'Verifying Email',
 *   html,
 * });
 * ```
 *
 * @note Configuration:
 * - Add RESEND_API_KEY to your .env file
 * - Verify your sending domain in the Resend dashboard: https://resend.com/domains
 * - Set RESEND_FROM_EMAIL in .env with a verified email address
 *
 * @migration
 * - Replaces: nodemailer transporter from src/app.ts
 * - Benefits:
 *   - Modern email API with better deliverability
 *   - Built-in retry logic and error handling
 *   - No SMTP configuration required
 *   - Better logging and debugging
 *
 * @note Lazy Initialization:
 * - Validation is deferred until first use to prevent blocking app startup
 * - Missing RESEND_API_KEY will throw an error when attempting to send emails
 * - This allows the app to start even if email functionality is not configured
 */

/**
 * Configured Resend client instance
 * Use this instance to send emails throughout the application
 *
 * Note: The client is created without validation at module load time.
 * Validation occurs when attempting to use the client in service functions.
 */
export const resend = new Resend(process.env.RESEND_API_KEY || '');
