import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import neo4j from 'neo4j-driver';
import hpp from 'hpp';
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

export const transporter = nodemailer.createTransport({
  service: process.env.SERVICE,
  secure: Boolean(process.env.SECURE),
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
});

class App {
  public walletService = new walletService();
  public userService = new UserService();
  public app: express.Application;
  public env: string;
  public port: string | number;

  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
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
                  this.userService.checkForSale(event.data.object.customer, postId).then(exists => {
                    if (exists) return;
                    this.userService.buyPost(postId, event.data.object.customer, sellerId, amount);
                    this.walletService.UpdateBalanceForPayment(sellerId, amount);
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
