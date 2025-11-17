import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { swagger } from '@elysiajs/swagger';
import { Type as t, Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import admin from 'firebase-admin';
import path from 'path';

import { errorPlugin, loggerPlugin, neo4jPlugin, authPlugin } from '@/plugins';
import { stripe } from '@/utils/stripe';

import { authRoutes } from '@/routes/auth.route';
import { usersRoutes } from '@/routes/users.route';
import { sellerRoutes } from '@/routes/seller.route';
import { indexRoutes } from '@/routes/index.route';
import { postRoutes } from '@/routes/post.route';
import { walletRoutes } from '@/routes/wallet.route';
import { adminRoutes } from '@/routes/admin.route';
import { notificationsRoutes } from '@/routes/notifications.route';

import { updateBalanceForPayment, updateBalanceForSubscription } from '@/services/wallet.service';
import { checkForSale, buyPost, createSubscriptioninDb } from '@/services/users.service';
import { pushSellerNotifications } from './services/notification.service';

const EnvSchema = t.Object({
  // Server Configuration
  PORT: t.String({ pattern: '^[0-9]+$' }),
  NODE_ENV: t.Union([t.Literal('development'), t.Literal('production'), t.Literal('test')]),
  DOMAIN: t.Optional(t.String()),

  // Security (with defaults applied before validation)
  SECRET_KEY: t.String({ minLength: 32 }),
  REFRESH_SECRET: t.Optional(t.String()),
  EMAIL_SECRET: t.Optional(t.String()),

  // Database
  NEO4J_URI: t.String(),
  NEO4J_USERNAME: t.String(),
  NEO4J_PASSWORD: t.String(),

  // Payment
  STRIPE_TEST_KEY: t.String({ pattern: '^sk_(test|live)_' }),
  STRIPE_WEBHOOK_SECRET: t.Optional(t.String()),

  // Email
  RESEND_API_KEY: t.String({ pattern: '^re_' }),
  RESEND_FROM_EMAIL: t.String({ format: 'email' }),

  // Logging
  LOG_FORMAT: t.Optional(t.String()),
  LOG_DIR: t.Optional(t.String()),
  LOG_LEVEL: t.Optional(
    t.Union([
      t.Literal('error'),
      t.Literal('warn'),
      t.Literal('info'),
      t.Literal('debug'),
      t.Literal('trace'),
    ])
  ),

  // CORS
  ORIGIN: t.Optional(t.String()),
  CREDENTIALS: t.Optional(t.String({ pattern: '^(true|false)$' })),

  // AI
  OPENAI_API_KEY: t.Optional(t.String()),

  // Firebase
  projectId: t.Optional(t.String()),
});

export type Env = Static<typeof EnvSchema>;
const envPlugin = () => {
  return new Elysia({ name: 'plugin.env', seed: 'plugin.env' }).onStart(() => {
    const env = typeof Bun !== 'undefined' && Bun.env ? Bun.env : process.env;

    if (!env.REFRESH_SECRET) {
      env.REFRESH_SECRET = env.SECRET_KEY;
    }
    if (!env.EMAIL_SECRET) {
      env.EMAIL_SECRET = env.SECRET_KEY;
    }
    if (!env.LOG_LEVEL) {
      env.LOG_LEVEL = 'info';
    }
    if (!env.ORIGIN) {
      env.ORIGIN = '*';
    }
    if (!env.CREDENTIALS) {
      env.CREDENTIALS = 'false';
    }

    const errors = [...Value.Errors(EnvSchema, env)];

    if (errors.length > 0) {
      const requiredMissing: string[] = [];
      const formatInvalid: string[] = [];

      errors.forEach((error) => {
        const path = error.path.substring(1);
        const message = error.message;

        if (message.includes('Required property')) {
          requiredMissing.push(`  - ${path}: Missing required environment variable`);
        } else if (message.includes('Expected string length greater or equal to')) {
          formatInvalid.push(`  - ${path}: Must be at least 32 characters for security`);
        } else if (message.includes('Expected string to match pattern')) {
          if (path === 'PORT') {
            formatInvalid.push(`  - ${path}: Must be a valid port number (e.g., 3000)`);
          } else if (path === 'NEO4J_URI') {
            formatInvalid.push(
              `  - ${path}: Must start with 'bolt://' or 'neo4j://' (e.g., bolt://localhost:7687)`
            );
          } else if (path === 'STRIPE_TEST_KEY') {
            formatInvalid.push(
              `  - ${path}: Must be a valid Stripe key starting with 'sk_test_' or 'sk_live_'`
            );
          } else if (path === 'RESEND_API_KEY') {
            formatInvalid.push(`  - ${path}: Must be a valid Resend API key starting with 're_'`);
          } else if (path === 'CREDENTIALS') {
            formatInvalid.push(`  - ${path}: Must be 'true' or 'false'`);
          } else {
            formatInvalid.push(`  - ${path}: Invalid format - ${message}`);
          }
        } else if (message.includes('Expected string to match format')) {
          formatInvalid.push(`  - ${path}: Must be a valid email address`);
        } else if (message.includes('Expected union value')) {
          if (path === 'NODE_ENV') {
            formatInvalid.push(`  - ${path}: Must be 'development', 'production', or 'test'`);
          } else if (path === 'LOG_LEVEL') {
            formatInvalid.push(`  - ${path}: Must be 'error', 'warn', 'info', 'debug', or 'trace'`);
          } else {
            formatInvalid.push(`  - ${path}: ${message}`);
          }
        } else {
          formatInvalid.push(`  - ${path}: ${message}`);
        }
      });

      let errorMessage = 'Environment validation failed:\n\n';

      if (requiredMissing.length > 0) {
        errorMessage += 'Required variables missing:\n';
        errorMessage += requiredMissing.join('\n') + '\n\n';
      }

      if (formatInvalid.length > 0) {
        errorMessage += 'Invalid format or value:\n';
        errorMessage += formatInvalid.join('\n') + '\n\n';
      }

      errorMessage +=
        'Please check your .env file and ensure all required variables are set correctly.\n';
      errorMessage += 'See .env.example for documentation and examples.';

      throw new Error(errorMessage);
    }

    console.log('Environment variables validated successfully');
  });
};

admin.initializeApp({
  credential: admin.credential.cert(path.join(__dirname, './config/push_notification_key.json')),
  projectId: process.env.projectId || Bun.env.projectId,
});

export function createApp() {
  const app = new Elysia()
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Feetflight API',
            version: '1.0.0',
            description: 'Feetflight API Documentation - Feet content marketplace platform',
          },
          tags: [
            { name: 'Health', description: 'Health check endpoints' },
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Users', description: 'User management endpoints' },
            { name: 'Sellers', description: 'Seller management endpoints' },
            { name: 'Posts', description: 'Post/content endpoints' },
            { name: 'Wallet', description: 'Wallet and payment endpoints' },
            { name: 'Admin', description: 'Admin endpoints' },
            { name: 'Notifications', description: 'Notification endpoints' },
          ],
        },
        path: '/docs',
        provider: 'scalar',
      })
    )
    .use(envPlugin())

    .use(errorPlugin())
    .use(loggerPlugin())
    .use(neo4jPlugin())
    .use(authPlugin())

    .use(
      cors({
        origin: process.env.ORIGIN || Bun.env.ORIGIN || '*',
        credentials: (process.env.CREDENTIALS || Bun.env.CREDENTIALS) === 'true',
      })
    )

    .use(
      staticPlugin({
        assets: path.join(__dirname, '../public'),
        prefix: '/public',
        alwaysStatic: false,
      })
    );

  const rawBodies = new WeakMap<Request, string>();

  app
    .onParse(async ({ request, headers }) => {
      const url = new URL(request.url);
      if (url.pathname === '/webhook' && headers['application/json'] === 'application/json') {
        const rawBody = await request.text();
        rawBodies.set(request, rawBody);
        return JSON.parse(rawBody);
      }
    })
    .post('/webhook', async ({ request, set, log, neo4j, auth }) => {
      try {
        const signature = request.headers.get('stripe-signature');
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || Bun.env.STRIPE_WEBHOOK_SECRET;

        if (!signature) {
          set.status = 400;
          return { error: 'Missing stripe-signature header' };
        }

        const rawBody = rawBodies.get(request);
        if (!rawBody) {
          set.status = 400;
          return { error: 'Unable to verify webhook signature: raw body missing' };
        }

        let event;
        try {
          try {
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret!);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            log?.error({ error: errorMessage }, 'Webhook signature verification failed');
            set.status = 400;
            return { error: `Webhook Error: ${errorMessage}` };
          }

          log?.info(
            { eventType: event.type, eventId: event.id },
            'Processing Stripe webhook event'
          );

          // Handle different event types
          switch (event.type) {
            case 'charge.succeeded':
            case 'checkout.session.completed': {
              const session = event.data.object as any;

              switch (session.mode) {
                case 'payment': {
                  // Check if this is a sent picture payment
                  if (session.metadata.comingFrom?.includes('sentPicturePayment')) {
                    // Update Firestore message to mark as bought
                    const db = admin.firestore();
                    await db
                      .collection('chat_room')
                      .doc(session.metadata.chatRoomId)
                      .collection('messages')
                      .doc(session.metadata.messageId)
                      .update({ isBought: true });

                    // Update seller's wallet balance
                    await updateBalanceForPayment(
                      session.metadata.sellerId,
                      session.metadata.amount,
                      { neo4j, log }
                    );

                    log?.info(
                      { sellerId: session.metadata.sellerId, amount: session.metadata.amount },
                      'Sent picture payment processed'
                    );
                  } else {
                    // Regular post purchase - may have multiple sellers
                    const sellerRecords = session.metadata.sellersIds.split(',');

                    for (const record of sellerRecords) {
                      let sellerId = '';
                      let postId = '';
                      let amount = 0;

                      // Parse seller record format: "sellerId:xxx.postId:yyy.amount:zzz"
                      record.split('.').forEach((part: string) => {
                        const [key, value] = part.split(':');
                        switch (key) {
                          case 'sellerId':
                            sellerId = value!;
                            break;
                          case 'postId':
                            postId = value!;
                            break;
                          case 'amount':
                            amount = Number(value);
                            break;
                        }
                      });

                      const alreadyBought = await checkForSale(session.customer, postId, {
                        auth,
                        neo4j,
                        log,
                      });
                      if (alreadyBought) {
                        log?.warn(
                          { customerId: session.customer, postId },
                          'Post already purchased, skipping'
                        );
                        continue;
                      }

                      await buyPost(postId, session.customer, { auth, neo4j, log });

                      await updateBalanceForPayment(sellerId, amount, { neo4j, log });

                      await pushSellerNotifications(
                        sellerId,
                        'Album Sold',
                        'Congratulations, a customer just bought an album.',
                        { log, neo4j }
                      );

                      log?.info({ sellerId, postId, amount }, 'Post purchase processed');
                    }
                  }
                  break;
                }

                case 'subscription': {
                  await createSubscriptioninDb(
                    session.subscription,
                    session.customer,
                    session.metadata.sellerId,
                    session.metadata.subscriptionPlanTitle,
                    session.metadata.subscriptionPlanPrice,
                    { auth, neo4j, log }
                  );

                  await updateBalanceForSubscription(
                    session.metadata.sellerId,
                    session.metadata.subscriptionPlanPrice,
                    {
                      neo4j,
                      log,
                    }
                  );

                  await pushSellerNotifications(
                    session.metadata.sellerId,
                    'Subscription',
                    `Congratulations, a customer just subscribed to the plan ${session.metadata.subscriptionPlanTitle}`,
                    { log, neo4j }
                  );

                  log?.info(
                    {
                      sellerId: session.metadata.sellerId,
                      plan: session.metadata.subscriptionPlanTitle,
                      price: session.metadata.subscriptionPlanPrice,
                    },
                    'Subscription created'
                  );
                  break;
                }

                default:
                  log?.warn({ mode: session.mode }, 'Unknown session mode');
              }
              break;
            }

            case 'payment_method.attached': {
              const paymentMethod = event.data.object;
              log?.info({ paymentMethod }, 'Payment method attached');
              break;
            }

            default:
              log?.warn({ eventType: event.type }, 'Unhandled event type');
          }

          set.status = 200;
          return { received: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          log?.error({ error: errorMessage }, 'Webhook processing failed');
          set.status = 500;
          return { error: 'Webhook processing failed' };
        }
      } catch (e) {
        if (e instanceof Error) {
          log.error(e.message);
        } else {
          log.error('fatal error');
        }
      }
    });

  app
    .use(indexRoutes())
    .use(authRoutes())
    .use(usersRoutes())
    .use(sellerRoutes())
    .use(postRoutes())
    .use(walletRoutes())
    .use(adminRoutes())
    .use(notificationsRoutes());

  return app;
}

export default createApp;
