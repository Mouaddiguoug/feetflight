"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    transporter: function() {
        return transporter;
    },
    stripe: function() {
        return stripe;
    },
    initializeDbConnection: function() {
        return initializeDbConnection;
    },
    default: function() {
        return _default;
    }
});
const _compression = /*#__PURE__*/ _interop_require_default(require("compression"));
const _cookieparser = /*#__PURE__*/ _interop_require_default(require("cookie-parser"));
const _cors = /*#__PURE__*/ _interop_require_default(require("cors"));
const _express = /*#__PURE__*/ _interop_require_default(require("express"));
const _helmet = /*#__PURE__*/ _interop_require_default(require("helmet"));
const _neo4jdriver = /*#__PURE__*/ _interop_require_default(require("neo4j-driver"));
const _hpp = /*#__PURE__*/ _interop_require_default(require("hpp"));
const _firebaseadmin = /*#__PURE__*/ _interop_require_default(require("firebase-admin"));
const _morgan = /*#__PURE__*/ _interop_require_default(require("morgan"));
const _swaggerjsdoc = /*#__PURE__*/ _interop_require_default(require("swagger-jsdoc"));
const _swaggeruiexpress = /*#__PURE__*/ _interop_require_default(require("swagger-ui-express"));
const _config = require("./config");
const _errormiddleware = /*#__PURE__*/ _interop_require_default(require("./middlewares/error.middleware"));
const _logger = require("./utils/logger");
const _nodemailer = /*#__PURE__*/ _interop_require_default(require("nodemailer"));
const _nodemailerexpresshandlebars = /*#__PURE__*/ _interop_require_default(require("nodemailer-express-handlebars"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
const _walletservice = /*#__PURE__*/ _interop_require_default(require("./services/wallet.service"));
const _usersservice = /*#__PURE__*/ _interop_require_default(require("./services/users.service"));
const _stripe = /*#__PURE__*/ _interop_require_default(require("stripe"));
const _notificationservice = /*#__PURE__*/ _interop_require_default(require("./services/notification.service"));
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const transporter = _nodemailer.default.createTransport({
    service: process.env.SERVICE,
    secure: Boolean(process.env.SECURE),
    auth: {
        user: process.env.USER,
        pass: process.env.PASS
    }
});
let App = class App {
    listen() {
        this.app.listen(this.port, ()=>{
            _logger.logger.info(`=================================`);
            _logger.logger.info(`======= ENV: ${this.env} =======`);
            _logger.logger.info(`🚀 App listening on the port ${this.port}`);
            _logger.logger.info(`=================================`);
        });
    }
    getServer() {
        return this.app;
    }
    initializeMiddlewares() {
        this.app.use((0, _morgan.default)(_config.LOG_FORMAT, {
            stream: _logger.stream
        }));
        this.app.use((0, _cors.default)({
            origin: _config.ORIGIN,
            credentials: _config.CREDENTIALS
        }));
        this.app.use((0, _hpp.default)());
        this.app.use((0, _helmet.default)());
        this.app.use((0, _compression.default)());
        this.app.use(_express.default.json());
        this.app.use(_express.default.urlencoded({
            extended: true
        }));
        this.app.use((0, _cookieparser.default)());
        this.app.use("/public", _express.default.static(_path.default.resolve(_path.default.join(__dirname, "../public"))));
        transporter.use('compile', (0, _nodemailerexpresshandlebars.default)({
            viewEngine: {
                extname: '.handlebars',
                layoutsDir: _path.default.resolve(__dirname, '../public/views/'),
                partialsDir: _path.default.resolve(__dirname, '../public/views/')
            },
            viewPath: _path.default.resolve(__dirname, '../public/views/'),
            extName: '.handlebars'
        }));
    }
    initializeRoutes(routes) {
        routes.forEach((route)=>{
            this.app.use('/', route.router);
        });
    }
    initializeSwagger() {
        const options = {
            swaggerDefinition: {
                info: {
                    title: 'REST API',
                    version: '1.0.0',
                    description: 'Example docs'
                }
            },
            apis: [
                'swagger.yaml'
            ]
        };
        const specs = (0, _swaggerjsdoc.default)(options);
        this.app.use('/api-docs', _swaggeruiexpress.default.serve, _swaggeruiexpress.default.setup(specs));
    }
    initializeErrorHandling() {
        this.app.use(_errormiddleware.default);
    }
    constructor(routes){
        _define_property(this, "walletService", new _walletservice.default());
        _define_property(this, "userService", new _usersservice.default());
        _define_property(this, "notificationService", new _notificationservice.default());
        _define_property(this, "app", void 0);
        _define_property(this, "env", void 0);
        _define_property(this, "port", void 0);
        this.app = (0, _express.default)();
        this.env = _config.NODE_ENV;
        this.port = _config.PORT || 3000;
        this.app.post('/webhook', _express.default.raw({
            type: 'application/json'
        }), async (req, res, next)=>{
            try {
                const stripe = new _stripe.default(process.env.STRIPE_TEST_KEY, {
                    apiVersion: '2022-11-15'
                });
                let signature = req.headers['stripe-signature'];
                if (!signature) res.status(201).json({
                    message: 'signature needed'
                });
                let event;
                try {
                    event = stripe.webhooks.constructEvent(req.body, signature, process.env.WEBHOOK_SIGNATURE);
                } catch (err) {
                    console.log(err.message);
                }
                switch(event.type){
                    case 'charge.succeeded':
                        console.log(event.data.object);
                    case 'checkout.session.completed':
                        switch(event.data.object.mode){
                            case 'payment':
                                event.data.object.metadata.sellersIds.split(',').map((record)=>{
                                    let sellerId = '';
                                    let postId = '';
                                    let amount = 0;
                                    record.split('.').map((record)=>{
                                        switch(record.split(':')[0]){
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
                                    this.userService.checkForSale(event.data.object.customer, postId).then(async (exists)=>{
                                        if (exists) return;
                                        await this.userService.buyPost(postId, event.data.object.customer, sellerId, amount);
                                        await this.walletService.UpdateBalanceForPayment(sellerId, amount);
                                        const title = "Album Sold";
                                        const body = `congratulations, a customer just bought an album.`;
                                        await this.notificationService.pushSellerNotificatons(sellerId, title, body);
                                    });
                                });
                                break;
                            case 'subscription':
                                this.userService.createSubscriptioninDb(event.data.object.customer, event.data.object.metadata.sellerId, event.data.object.metadata.subscriptionPlanTitle, event.data.object.metadata.subscriptionPlanPrice);
                                this.walletService.UpdateBalanceForSubscription(event.data.object.metadata.sellerId, event.data.object.metadata.subscriptionPlanPrice);
                                const title = "Subscription";
                                const body = `congratulations, a customer just subscribed to the plan ${event.data.object.metadata.subscriptionPlanTitle}`;
                                this.notificationService.pushSellerNotificatons(event.data.object.metadata.sellerId, title, body);
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
        _firebaseadmin.default.initializeApp({
            credential: _firebaseadmin.default.credential.cert(_path.default.join(__dirname, "./config/push_notification_key.json")),
            projectId: process.env.projectId
        });
    }
};
const stripe = new _stripe.default(process.env.STRIPE_TEST_KEY, {
    apiVersion: '2022-11-15'
});
function initializeDbConnection() {
    try {
        const driver = _neo4jdriver.default.driver(process.env.NEO4J_URI, _neo4jdriver.default.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD));
        driver.verifyConnectivity();
        console.log('Driver created');
        return driver;
    } catch (error) {
        console.log(`connectivity verification failed. ${error}`);
    }
}
const _default = App;

//# sourceMappingURL=app.js.map