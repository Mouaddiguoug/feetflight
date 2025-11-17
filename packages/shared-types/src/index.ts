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
  CancelSubscriptionParamSchema,
  type CancelSubscriptionParamDTO,
  GetFollowedSellersParamSchema,
  type GetFollowedSellersParamDTO,
  CheckSubscriptionSchema,
  type CheckSubscriptionDTO,
  CheckSubscriptionParamSchema,
  type CheckSubscriptionParamDTO,
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
  SellerIdParamSchema,
  type SellerIdParamDTO,
  TokenParamSchema,
  type TokenParamDTO,
  PaginationQuerySchema,
  type PaginationQueryDTO,
} from './common.schema';

// Wallet schemas
export { UpdateBalanceSchema, type UpdateBalanceDTO } from './wallet.schema';

// Admin schemas
export { GetIdentityCardParamSchema, type GetIdentityCardParamDTO } from './admin.schema';

// Notifications schemas
export { PushNotificationSchema, type PushNotificationDTO } from './notifications.schema';

// // Interfaces
// export {User} from './interfaces/users.interface';
