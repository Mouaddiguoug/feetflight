import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import neo4j from 'neo4j-driver';
import hpp from 'hpp';
import admin from "firebase-admin";
import morgan from 'morgan';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { NODE_ENV, PORT, LOG_FORMAT, ORIGIN, CREDENTIALS } from '@config';
import { Routes } from '@interfaces/routes.interface';
import errorMiddleware from '@middlewares/error.middleware';
import { logger, stream } from '@utils/logger';
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import walletService from './services/wallet.service';
import UserService from './services/users.service';
import Stripe from 'stripe';
import NotificationService from './services/notification.service';

export const transporter = nodemailer.createTransport({
  service: process.env.SERVICE,
  secure: true,
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.PASS,
  },
});

class App {
  public walletService = new walletService();
  public userService = new UserService();
  
  public notificationService = new NotificationService();
  public app: express.Application;
  public env: string;
  public port: string | number;

  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV;
    this.port = PORT || 3000;
    this.app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next): Promise<void> => {
      try {
        const stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });
        let signature = req.headers['stripe-signature'];
        if (!signature) res.status(201).json({ message: 'signature needed' });
        let event;
        try {
          event = stripe.webhooks.constructEvent(req.body, signature, process.env.WEBHOOK_SIGNATURE);
        } catch (err) {
          console.log(err.message);
        }

        switch (event.type) {
          case 'charge.succeeded':
            console.log(event.data.object);
          case 'checkout.session.completed':
            switch (event.data.object.mode) {
              case 'payment':
                event.data.object.metadata.sellersIds.split(',').map((record: any) => {
                  let sellerId = '';
                  let postId = '';
                  let amount = 0;
                  record.split('.').map((record: any) => {
                    switch (record.split(':')[0]) {
                      case 'sellerId':
                        sellerId = record.split(':')[1];
                        break;
                      case 'postId':
                        postId = record.split(':')[1];
                        break;
                      case 'amount':
                        amount = record.split(':')[1];
                        break;
                      default:
                        break;
                    }
                  });
                  this.userService.checkForSale(event.data.object.customer, postId).then(async exists => {
                    if (exists) return;
                    await this.userService.buyPost(postId, event.data.object.customer, sellerId, amount);
                    await this.walletService.UpdateBalanceForPayment(sellerId, amount);
                    const title = "Album Sold"
                    const body = `congratulations, a customer just bought an album.`
                    await this.notificationService.pushSellerNotificatons(sellerId, title, body)
                   
                  });

                });
                break;
              case 'subscription':
                this.userService.createSubscriptioninDb(
                  event.data.object.customer,
                  event.data.object.metadata.sellerId,
                  event.data.object.metadata.subscriptionPlanTitle,
                  event.data.object.metadata.subscriptionPlanPrice,
                );
                this.walletService.UpdateBalanceForSubscription(
                  event.data.object.metadata.sellerId,
                  event.data.object.metadata.subscriptionPlanPrice,
                );
                const title = "Subscription"
                const body = `congratulations, a customer just subscribed to the plan ${event.data.object.metadata.subscriptionPlanTitle}`

                this.notificationService.pushSellerNotificatons(event.data.object.metadata.sellerId, title, body)
                break;
              default:
                break;
            }

            break;
          case 'payment_method.attached':
            const paymentMethod = event.data.object;
            console.log(paymentMethod);
            break;
          default:
            break;
        }
      } catch (error) {
        console.log(error);
      }
    });
    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeSwagger();
    this.initializeErrorHandling();
    admin.initializeApp({
      credential: admin.credential.cert(path.join(__dirname, "./config/push_notification_key.json")),
      projectId: process.env.projectId
    })
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(cors({ origin: ORIGIN, credentials: CREDENTIALS }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
    this.app.use("/public", express.static(path.resolve(path.join(__dirname, "../public"))));
    transporter.use(
      'compile',
      hbs({
        viewEngine: {
          extname: '.handlebars',
          layoutsDir: path.resolve(__dirname, '../public/views/'),
          partialsDir: path.resolve(__dirname, '../public/views/'),
          defaultLayout: "verifying_email"
        },
        viewPath: path.resolve(__dirname, '../public/views/'),
        extName: '.handlebars',
      }),
    );
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use('/', route.router);
    });
  }

  private initializeSwagger() {
    const options = {
      swaggerDefinition: {
        info: {
          title: 'REST API',
          version: '1.0.0',
          description: 'Example docs',
        },
      },
      apis: ['swagger.yaml'],
    };

    const specs = swaggerJSDoc(options);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export const stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });

export function initializeDbConnection() {
  try {
    const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD));

    driver.verifyConnectivity();
    console.log('Driver created');
    return driver;
  } catch (error) {
    console.log(`connectivity verification failed. ${error}`);
  }
}

export default App;
