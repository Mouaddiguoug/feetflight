/**
 * @deprecated Use HttpError or specific error classes (BadRequestError, UnauthorizedError, etc.) from '@/plugins/error.plugin' instead.
 * This class is maintained for backward compatibility with Express routes during the migration to Elysia.
 *
 * Migration guide:
 * - 400 errors: Use BadRequestError
 * - 401 errors: Use UnauthorizedError
 * - 403 errors: Use ForbiddenError
 * - 404 errors: Use NotFoundError
 * - 409 errors: Use ConflictError
 * - 422 errors: Use UnprocessableEntityError
 * - 500 errors: Use InternalServerError
 * - Generic errors: Use HttpError
 */
export class HttpException extends Error {
  public status: number;
  public override message: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

/**
 * Alias for backward compatibility
 * @deprecated Use HttpError from '@/plugins/error.plugin' instead
 */
export { HttpError as HttpException2 } from '@/plugins/error.plugin';
