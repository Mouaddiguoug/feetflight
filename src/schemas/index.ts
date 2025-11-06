/**
 * Central export point for all TypeBox validation schemas.
 * Import schemas from this file in route handlers for consistent validation across the application.
 *
 * Example usage:
 * import { SignupSchema, LoginSchema, CreatePostSchema } from '@/schemas';
 */

// Auth schemas
export {
  SignupSchema,
  type SignupDTO,
  LoginSchema,
  type LoginDTO,
  ChangePasswordSchema,
  type ChangePasswordDTO,
  RefreshTokenSchema,
  type RefreshTokenDTO,
  EmailParamSchema,
  type EmailParamDTO,
} from './auth.schema';

// User schemas
export {
  UpdateUserSchema,
  type UpdateUserDTO,
  GenerateOtpParamSchema,
  type GenerateOtpParamDTO,
  VerifyOtpSchema,
  type VerifyOtpDTO,
  ContactFormSchema,
  type ContactFormDTO,
  DeviceTokenSchema,
  type DeviceTokenDTO,
  GenerateAiPicturesSchema,
  type GenerateAiPicturesDTO,
  BuyPostSchema,
  type BuyPostDTO,
  SubscriptionSchema,
  type SubscriptionDTO,
  UnlockSentPictureSchema,
  type UnlockSentPictureDTO,
  CancelSubscriptionSchema,
  type CancelSubscriptionDTO,
  GetFollowedSellersParamSchema,
  type GetFollowedSellersParamDTO,
  CheckSubscriptionSchema,
  type CheckSubscriptionDTO,
} from './users.schema';

// Seller schemas
export {
  CreateSubscriptionPlansSchema,
  type CreateSubscriptionPlansDTO,
  UpdatePlansSchema,
  type UpdatePlansDTO,
  AddPayoutAccountSchema,
  type AddPayoutAccountDTO,
  RequestWithdrawParamSchema,
  type RequestWithdrawParamDTO,
  UploadSentPictureParamSchema,
  type UploadSentPictureParamDTO,
} from './sellers.schema';

// Post schemas
export {
  CreatePostSchema,
  type CreatePostDTO,
  LikePostSchema,
  type LikePostDTO,
  GetRandomAlbumsParamSchema,
  type GetRandomAlbumsParamDTO,
  CheckForSaleParamSchema,
  type CheckForSaleParamDTO,
} from './posts.schema';

// File schemas
export {
  AvatarUploadSchema,
  type AvatarUploadDTO,
  IdentityCardUploadSchema,
  type IdentityCardUploadDTO,
  PostPicturesUploadSchema,
  type PostPicturesUploadDTO,
  SentPictureUploadSchema,
  type SentPictureUploadDTO,
} from './files.schema';

// Common schemas
export {
  IdParamSchema,
  type IdParamDTO,
  UserIdParamSchema,
  type UserIdParamDTO,
  TokenParamSchema,
  type TokenParamDTO,
  PaginationQuerySchema,
  type PaginationQueryDTO,
} from './common.schema';
