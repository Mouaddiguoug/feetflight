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
    transporter: ()=>transporter,
    initializeDbConnection: ()=>initializeDbConnection,
    default: ()=>_default
});
const _compression = _interopRequireDefault(require("compression"));
const _cookieParser = _interopRequireDefault(require("cookie-parser"));
const _cors = _interopRequireDefault(require("cors"));
const _express = _interopRequireDefault(require("express"));
const _helmet = _interopRequireDefault(require("helmet"));
const _neo4JDriver = _interopRequireDefault(require("neo4j-driver"));
const _hpp = _interopRequireDefault(require("hpp"));
const _morgan = _interopRequireDefault(require("morgan"));
const _swaggerJsdoc = _interopRequireDefault(require("swagger-jsdoc"));
const _swaggerUiExpress = _interopRequireDefault(require("swagger-ui-express"));
const _config = require("./config");
const _errorMiddleware = _interopRequireDefault(require("./middlewares/error.middleware"));
const _logger = require("./utils/logger");
const _nodemailer = _interopRequireDefault(require("nodemailer"));
const _nodemailerExpressHandlebars = _interopRequireDefault(require("nodemailer-express-handlebars"));
const _path = _interopRequireDefault(require("path"));
function _interopRequireDefault(obj) {
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
        this.app.use((0, _cookieParser.default)());
        console.log(__dirname);
        transporter.use('compile', (0, _nodemailerExpressHandlebars.default)({
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
        const specs = (0, _swaggerJsdoc.default)(options);
        this.app.use('/api-docs', _swaggerUiExpress.default.serve, _swaggerUiExpress.default.setup(specs));
    }
    initializeErrorHandling() {
        this.app.use(_errorMiddleware.default);
    }
    constructor(routes){
        this.app = (0, _express.default)();
        this.env = _config.NODE_ENV || 'development';
        this.port = _config.PORT || 3000;
        this.initializeMiddlewares();
        this.initializeRoutes(routes);
        this.initializeSwagger();
        this.initializeErrorHandling();
    }
};
function initializeDbConnection() {
    try {
        const driver = _neo4JDriver.default.driver(process.env.NEO4J_URI, _neo4JDriver.default.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD));
        driver.verifyConnectivity();
        console.log('Driver created');
        return driver;
    } catch (error) {
        console.log(`connectivity verification failed. ${error}`);
    }
}
const _default = App;

//# sourceMappingURL=app.js.map