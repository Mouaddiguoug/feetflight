import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { openapi } from '@elysiajs/openapi';
import admin from 'firebase-admin';
import path from 'path';

import { errorPlugin, loggerPlugin, neo4jPlugin, authPlugin } from '@/plugins';
import { stripe } from '@/utils/stripe';

import { authRoutes } from '@/routes/auth.route';
import { usersRoutes } from '@/routes/users.route';
import { indexRoutes } from '@/routes/index.route';

import { updateBalanceForPayment, updateBalanceForSubscription } from '@/services/wallet.service';
import { checkForSale, buyPost, createSubscriptioninDb } from '@/services/users.service';


const envPlugin = () => {
  return new Elysia({ name: 'plugin.env', seed: 'plugin.env' }).onStart(() => {
    const requiredVars = [
      'PORT',
      'NODE_ENV',
      'SECRET_KEY',
      'NEO4J_URI',
      'NEO4J_USERNAME',
      'NEO4J_PASSWORD',
      'STRIPE_TEST_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'RESEND_API_KEY',
      'RESEND_FROM_EMAIL',
    ];

    const missing = requiredVars.filter(varName => !Bun.env[varName] && !process.env[varName]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
          `Please ensure these are set in your .env file.`,
      );
    }
  });
};


admin.initializeApp({
  credential: admin.credential.cert(path.join(__dirname, './config/push_notification_key.json')),
  projectId: process.env.projectId || Bun.env.projectId,
});


export function createApp() {
  const app = new Elysia()
    .use(envPlugin())

    .use(errorPlugin())
    .use(loggerPlugin())
    .use(neo4jPlugin())
    .use(authPlugin())

    .use(
      cors({
        origin: process.env.ORIGIN || Bun.env.ORIGIN || '*',
        credentials: (process.env.CREDENTIALS || Bun.env.CREDENTIALS) === 'true',
      }),
    )

    .use(
      staticPlugin({
        assets: path.join(__dirname, '../public'),
        prefix: '/public',
        alwaysStatic: false,
      }),
    )

    .use(
      openapi({
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
      }),
    );

  const rawBodies = new WeakMap<Request, string>();

  app
    .onParse(async ({ request, headers }) => {
      const url = new URL(request.url);
      if (url.pathname === '/webhook' &&  headers["application/json"] === 'application/json') {
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

        log?.info({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook event');

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
                  await updateBalanceForPayment(session.metadata.sellerId, session.metadata.amount, { neo4j, log });

                  log?.info(
                    { sellerId: session.metadata.sellerId, amount: session.metadata.amount },
                    'Sent picture payment processed',
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

                    const alreadyBought = await checkForSale(session.customer, postId, {auth, neo4j, log });
                    if (alreadyBought) {
                      log?.warn({ customerId: session.customer, postId }, 'Post already purchased, skipping');
                      continue;
                    }

                    await buyPost(postId, session.customer,{auth, neo4j, log });

                    await updateBalanceForPayment(sellerId, amount, { neo4j, log });

                    await pushSellerNotificatons(
                      sellerId,
                      'Album Sold',
                      'Congratulations, a customer just bought an album.',
                      { log },
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
                  { auth, neo4j, log },
                );

                await updateBalanceForSubscription(session.metadata.sellerId, session.metadata.subscriptionPlanPrice, {
                  neo4j,
                  log,
                });

                await pushSellerNotificatons(
                  session.metadata.sellerId,
                  'Subscription',
                  `Congratulations, a customer just subscribed to the plan ${session.metadata.subscriptionPlanTitle}`,
                  { log },
                );

                log?.info(
                  {
                    sellerId: session.metadata.sellerId,
                    plan: session.metadata.subscriptionPlanTitle,
                    price: session.metadata.subscriptionPlanPrice,
                  },
                  'Subscription created',
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
      if (e instanceof Error){
        log.error(e.message)
      }else {
        log.error("fatal error")
      }
    }})

  app
    .use(indexRoutes()) // Health check at /
    .use(authRoutes()) // Auth routes (signup, login, etc.)
    .use(usersRoutes()); // User routes (/users/*)

  // Additional route modules will be registered here as they're migrated:
  // .use(sellerRoutes())
  // .use(postRoutes())
  // .use(walletRoutes())
  // .use(adminRoutes())
  // .use(notificationsRoutes())

  return app;
}

export default createApp;