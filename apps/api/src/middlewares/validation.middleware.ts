import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { RequestHandler } from 'express';
import { HttpException } from '@exceptions/HttpException';

/**
 * @deprecated This Express middleware is deprecated and will be removed in a future version.
 * Validation is now handled by TypeBox schemas in Elysia's native validation system.
 *
 * Migration guide:
 *
 * Before (Express with class-validator):
 *   router.post('/signup', validationMiddleware(CreateUserDto, 'body'), controller.signup)
 *
 * After (Elysia with TypeBox):
 *   .post('/signup', ({ body }) => { ... }, {
 *     body: SignupSchema  // From @feetflight/shared-types
 *   })
 *
 * **Available TypeBox schemas:**
 *
 * **Authentication** (from `@feetflight/shared-types`):
 * - `SignupSchema`: User registration with role-based validation
 * - `LoginSchema`: User login credentials
 * - `ChangePasswordSchema`: Password change validation
 * - `RefreshTokenSchema`: Refresh token request
 * - `EmailParamSchema`: Email parameter validation
 *
 * **Users** (from `@feetflight/shared-types`):
 * - `UpdateUserSchema`: User profile updates
 * - `GenerateOtpParamSchema`: OTP generation
 * - `VerifyOtpSchema`: OTP verification
 * - `ContactFormSchema`: Contact form submission
 * - `DeviceTokenSchema`: Device token upload
 * - `GenerateAiPicturesSchema`: AI picture generation
 * - `BuyPostSchema`: Post purchase
 * - `SubscriptionSchema`: Subscription creation
 * - `UnlockSentPictureSchema`: Sent picture unlock
 * - `CancelSubscriptionSchema`: Subscription cancellation
 *
 * **Sellers** (from `@feetflight/shared-types`):
 * - `CreateSubscriptionPlansSchema`: Subscription plan creation
 * - `UpdatePlansSchema`: Subscription plan updates
 * - `AddPayoutAccountSchema`: Payout account addition
 * - `RequestWithdrawParamSchema`: Withdrawal request
 * - `UploadSentPictureParamSchema`: Sent picture upload
 *
 * **Posts** (from `@feetflight/shared-types`):
 * - `CreatePostSchema`: Post/album creation
 * - `LikePostSchema`: Post like action
 * - `GetRandomAlbumsParamSchema`: Pagination parameters
 * - `CheckForSaleParamSchema`: Sale check parameters
 *
 * **Files** (from `@feetflight/shared-types`):
 * - `AvatarUploadSchema`: Avatar file upload
 * - `IdentityCardUploadSchema`: Identity card files upload
 * - `PostPicturesUploadSchema`: Post pictures upload
 * - `SentPictureUploadSchema`: Sent picture upload
 *
 * **Common** (from `@feetflight/shared-types`):
 * - `IdParamSchema`: ID parameter validation
 * - `UserIdParamSchema`: User ID parameter validation
 * - `TokenParamSchema`: Token parameter validation
 * - `PaginationQuerySchema`: Pagination query parameters
 *
 * **Benefits of TypeBox validation:**
 * - No need for class-validator and class-transformer packages
 * - Compile-time type inference with TypeScript
 * - Better performance (no runtime class transformation)
 * - Integrated with Elysia's validation system
 * - Automatic OpenAPI documentation generation
 * - Custom error messages per field
 * - Supports complex validation patterns (unions, optionals, nested objects)
 *
 * **Type inference example:**
 * ```typescript
 * import { SignupSchema, type SignupDTO } from '@feetflight/shared-types';
 *
 * .post('/signup', ({ body }) => {
 *   // body is automatically typed as SignupDTO
 *   const { email, password, name } = body.data;
 *   // ...
 * }, {
 *   body: SignupSchema
 * })
 * ```
 */
const validationMiddleware = (
  type: any,
  value: string | 'body' | 'query' | 'params' = 'body',
  skipMissingProperties = false,
  whitelist = true,
  forbidNonWhitelisted = true
): RequestHandler => {
  return (req, res, next) => {
    validate(plainToClass(type, req[value]), {
      skipMissingProperties,
      whitelist,
      forbidNonWhitelisted,
    }).then((errors: ValidationError[]) => {
      if (errors.length > 0) {
        const message = errors
          .map((error: ValidationError) => Object.values(error.constraints))
          .join(', ');
        next(new HttpException(400, message));
      } else {
        next();
      }
    });
  };
};

export default validationMiddleware;
