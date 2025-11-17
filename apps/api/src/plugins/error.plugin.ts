import { Elysia } from 'elysia';
import { appLogger, loggerPlugin } from './logger.plugin';

export class HttpError extends Error {
  constructor(
    public status: number,
    public override message: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toResponse(headers?: Record<string, string>) {
    return Response.json(
      { error: this.message, status: this.status },
      {
        status: this.status,
        headers: headers
          ? { 'Content-Type': 'application/json', ...headers }
          : { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * 400 Bad Request - Invalid request data
 */
export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request') {
    super(400, message);
  }
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

/**
 * 409 Conflict - Resource conflict (e.g., duplicate email)
 */
export class ConflictError extends HttpError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

/**
 * 422 Unprocessable Entity - Validation failures
 */
export class UnprocessableEntityError extends HttpError {
  constructor(message = 'Unprocessable Entity') {
    super(422, message);
  }
}

/**
 * 500 Internal Server Error - Unexpected server errors
 */
export class InternalServerError extends HttpError {
  constructor(message = 'Internal Server Error') {
    super(500, message);
  }
}

export const errorPlugin = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return new Elysia({ name: 'plugin.error', seed: 'plugin.error' })
    .use(loggerPlugin())
    .error({
      HttpError,
      BadRequestError,
      UnauthorizedError,
      ForbiddenError,
      NotFoundError,
      ConflictError,
      UnprocessableEntityError,
      InternalServerError,
    })
    .onError(({ code, error, set, request, log }) => {
      const method = request.method;
      const path = new URL(request.url).pathname;

      // Handle custom error classes
      if (
        code === 'BadRequestError' ||
        code === 'UnauthorizedError' ||
        code === 'ForbiddenError' ||
        code === 'NotFoundError' ||
        code === 'ConflictError' ||
        code === 'UnprocessableEntityError' ||
        code === 'InternalServerError' ||
        code === 'HttpError'
      ) {
        const httpError = error as HttpError;

        // Log error with context
        if (log) {
          log.error(
            {
              code,
              method,
              path,
              status: httpError.status,
              message: httpError.message,
            },
            `[${method}] ${path} >> StatusCode:: ${httpError.status}, Message:: ${httpError.message}`
          );
        } else {
          appLogger.error(
            {
              code,
              method,
              path,
              status: httpError.status,
              message: httpError.message,
            },
            `[${method}] ${path} >> StatusCode:: ${httpError.status}, Message:: ${httpError.message}`
          );
        }

        // Set WWW-Authenticate header for 401 responses and return with header
        if (httpError.status === 401) {
          return httpError.toResponse({ 'WWW-Authenticate': 'Bearer' });
        }

        return httpError.toResponse();
      }

      // Handle validation errors
      if (code === 'VALIDATION') {
        const status = 400;

        if (log) {
          log.warn(
            {
              code,
              method,
              path,
              status,
              errors: isProduction ? undefined : error.all,
            },
            `[${method}] ${path} >> Validation Error`
          );
        } else {
          appLogger.warn(
            {
              code,
              method,
              path,
              status,
              errors: isProduction ? undefined : error,
            },
            `[${method}] ${path} >> Validation Error`
          );
        }

        set.status = status;

        if (isProduction) {
          return {
            error: 'Validation failed',
            status,
          };
        }

        return {
          error: 'Validation failed',
          message: error.message,
          details: error.all,
          status,
        };
      }

      // Handle NOT_FOUND errors
      if (code === 'NOT_FOUND') {
        const status = 404;

        appLogger.warn(
          {
            code,
            method,
            path,
            status,
          },
          `[${method}] ${path} >> Not Found`
        );

        set.status = status;
        return {
          error: 'Route not found',
          status,
        };
      }

      // Handle PARSE errors
      if (code === 'PARSE') {
        const status = 400;
        appLogger.warn(
          {
            code,
            method,
            path,
            status,
          },
          `[${method}] ${path} >> Parse Error`
        );

        set.status = status;
        return {
          error: 'Malformed request body',
          status,
        };
      }

      // Handle INTERNAL_SERVER_ERROR and UNKNOWN errors
      const status = 500;

      if (log) {
        log.error({
          code,
          method,
          path,
          status,
          error: isProduction
            ? undefined
            : error instanceof Error
              ? {
                  message: error.message,
                  stack: error.stack,
                }
              : { message: String(error) },
        });
      } else {
        appLogger.error(
          {
            code,
            method,
            path,
            status,
            error: isProduction
              ? undefined
              : error instanceof Error
                ? {
                    message: error.message,
                    stack: error.stack,
                  }
                : { message: String(error) },
          },
          `[${method}] ${path} >> Internal Server Error`
        );
      }

      set.status = status;

      return {
        error: isProduction
          ? 'Internal Server Error'
          : error instanceof Error
            ? error.message
            : String(error),
        status,
      };
    });
};
