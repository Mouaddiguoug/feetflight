import { Elysia } from 'elysia';
import pino, { Logger, LoggerOptions } from 'pino';
import { randomUUID } from 'crypto';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const requestIdPlugin = () => {
  return new Elysia({ name: 'plugin.request-id', seed: 'plugin.request-id' }).onRequest(
    ({ request, set }) => {
      const headerName = 'x-request-id';
      const incomingId = request.headers.get(headerName);
      const id = incomingId ?? randomUUID();
      set.headers[headerName] = id;
    }
  );
};

function createPinoInstance(): Logger {
  const baseConfig: LoggerOptions = {
    base: { env: process.env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  };

  if (isDevelopment) {
    return pino({
      ...baseConfig,
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    });
  } else if (isProduction) {
    return pino({
      ...baseConfig,
      level: process.env.LOG_LEVEL || 'info',
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'password',
          'token',
          'secret',
          'apiKey',
          'accessToken',
          'refreshToken',
        ],
        censor: '[REDACTED]',
      },
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          headers: req.headers,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
          headers: res.headers,
        }),
      },
    });
  } else {
    return pino({
      ...baseConfig,
      level: 'info',
    });
  }
}

export const appLogger = createPinoInstance();

export const loggerPlugin = () => {
  const pinoInstance = createPinoInstance();

  return new Elysia({ name: 'plugin.logger', seed: 'plugin.logger' })
    .use(requestIdPlugin())

    .state('startTime', 0)
    .state('log', null as Logger | null)

    .onRequest(({ request, set, store }) => {
      const requestId = set.headers['x-request-id'];
      const method = request.method;
      const path = new URL(request.url).pathname;

      store.log = pinoInstance.child({
        requestId,
        method,
        path,
      });

      store.startTime = Date.now();
      store.log.info('Incoming request');
    })

    .derive(({ request, set, store }) => {
      if (!store.log) {
        const requestId = set.headers['x-request-id'];
        const method = request.method;
        const path = new URL(request.url).pathname;

        store.log = pinoInstance.child({
          requestId,
          method,
          path,
        });
      }

      return {
        log: store.log,
      };
    })

    .onAfterResponse(({ set, store }) => {
      const duration = Date.now() - store.startTime;
      const statusCode = set.status || 200;

      const statusNum = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;

      const level = statusNum >= 500 ? 'error' : statusNum >= 400 ? 'warn' : 'info';

      const logger = store.log || pinoInstance;
      logger[level]({ statusCode: statusNum, duration }, 'Request completed');
    })
    .as('scoped');
};
