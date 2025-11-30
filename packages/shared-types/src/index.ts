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

// Interfaces
export type { UserDataResponse as User } from './responses/auth.response';

// ============================================================================
// RESPONSE TYPES - TypeBox schemas for API responses
// ============================================================================

// Auth responses
export {
  TokenDataSchema,
  type TokenDataResponse,
  UserDataSchema,
  type UserDataResponse,
  SignupResponseSchema,
  type SignupResponse,
  LoginResponseSchema,
  type LoginResponse,
  RefreshTokenResponseSchema,
  type RefreshTokenResponse,
  LogoutResponseSchema,
  type LogoutResponse,
  ResendVerificationEmailResponseSchema,
  type ResendVerificationEmailResponse,
} from './responses/auth.response';

// User responses
export {
  EmailConfirmationResponseSchema,
  type EmailConfirmationResponse,
  AiPictureSchema,
  GenerateAiPicturesResponseSchema,
  type GenerateAiPicturesResponse,
  GetUserResponseSchema,
  type GetUserResponse,
  UpdateUserResponseSchema,
  type UpdateUserResponse,
  GenerateOtpResponseSchema,
  type GenerateOtpResponse,
  VerifyOtpResponseSchema,
  type VerifyOtpResponse,
  ContactResponseSchema,
  type ContactResponse,
  SignOutResponseSchema,
  type SignOutResponse,
  SubscriptionPlanSchema,
  type SubscriptionPlanResponse,
  SubscribeResponseSchema,
  type SubscribeResponse,
  BuyPostsResponseSchema,
  type BuyPostsResponse,
  UnlockSentPictureResponseSchema,
  type UnlockSentPictureResponse,
  CancelSubscriptionResponseSchema,
  type CancelSubscriptionResponse,
  CheckForSaleResponseSchema,
  type CheckForSaleResponse,
  CheckForSubscriptionResponseSchema,
  type CheckForSubscriptionResponse,
  CheckSubscriptionByUserIdResponseSchema,
  type CheckSubscriptionByUserIdResponse,
  GetSellerPlansResponseSchema,
  type GetSellerPlansResponse,
  FollowedSellerSchema,
  GetFollowedSellersResponseSchema,
  type GetFollowedSellersResponse,
  UploadAvatarResponseSchema,
  type UploadAvatarResponse,
  UploadDeviceTokenResponseSchema,
  type UploadDeviceTokenResponse,
  DesactivateUserResponseSchema,
  type DesactivateUserResponse,
  ChangePasswordResponseSchema,
  type ChangePasswordResponse,
} from './responses/users.response';

// Admin responses
export {
  UnverifiedSellerSchema,
  GetUnverifiedSellersResponseSchema,
  type GetUnverifiedSellersResponse,
  IdentityCardDataSchema,
  GetSellerIdentityCardResponseSchema,
  type GetSellerIdentityCardResponse,
} from './responses/admin.response';

// Post responses
export {
  PictureSchema,
  type PictureResponse,
  PostUserSchema,
  AlbumDataSchema,
  PostResponseSchema,
  type PostResponse,
  GetPopularAlbumsResponseSchema,
  type GetPopularAlbumsResponse,
  GetRandomAlbumsResponseSchema,
  type GetRandomAlbumsResponse,
  GetAlbumByCategoryResponseSchema,
  type GetAlbumByCategoryResponse,
  GetPostPicturesResponseSchema,
  type GetPostPicturesResponse,
  CreatePostResponseSchema,
  type CreatePostResponse,
  UpdatePostResponseSchema,
  type UpdatePostResponse,
  DeletePostResponseSchema,
  type DeletePostResponse,
  LikePostResponseSchema,
  type LikePostResponse,
  CategorySchema,
  type Category,
  GetCategoriesResponseSchema,
  type GetCategoriesResponse,
  GetSellerAlbumsResponseSchema,
  type GetSellerAlbumsResponse,
  GetAllAlbumsResponseSchema,
  type GetAllAlbumsResponse,
  PlanSchema,
  type Plan,
  GetAlbumPlanResponseSchema,
  type GetAlbumPlanResponse,
  UpdateViewsResponseSchema,
  type UpdateViewsResponse,
  UploadPostPicturesResponseSchema,
  type UploadPostPicturesResponse,
  CheckPurchaseResponseSchema,
  type CheckPurchaseResponse,
  RecordPurchaseResponseSchema,
  type RecordPurchaseResponse,
} from './responses/posts.response';

// Seller responses
export {
  SellerInfoSchema,
  type SellerInfoResponse,
  CreateSubscriptionPlansResponseSchema,
  type CreateSubscriptionPlansResponse,
  UpdatePlansResponseSchema,
  type UpdatePlansResponse,
  GetSellerInfoResponseSchema,
  type GetSellerInfoResponse,
  UpdateSellerInfoResponseSchema,
  type UpdateSellerInfoResponse,
  VerifySellerIdentityResponseSchema,
  type VerifySellerIdentityResponse,
  PayoutAccountSchema,
  type PayoutAccount,
  GetPayoutAccountsResponseSchema,
  type GetPayoutAccountsResponse,
  AddPayoutAccountResponseSchema,
  type AddPayoutAccountResponse,
  DeletePayoutAccountResponseSchema,
  type DeletePayoutAccountResponse,
  RequestWithdrawResponseSchema,
  type RequestWithdrawResponse,
  GetAllSellersResponseSchema,
  type GetAllSellersResponse,
  GetFollowersCountResponseSchema,
  type GetFollowersCountResponse,
  UploadIdentityCardResponseSchema,
  type UploadIdentityCardResponse,
  UploadSentPictureResponseSchema,
  type UploadSentPictureResponse,
} from './responses/sellers.response';

// Wallet responses
export {
  GetBalanceResponseSchema,
  type GetBalanceResponse,
  UpdateBalanceResponseSchema,
  type UpdateBalanceResponse,
  WithdrawBalanceResponseSchema,
  type WithdrawBalanceResponse,
} from './responses/wallet.response';

// Notification responses
export {
  NotificationSchema,
  type NotificationResponse,
  GetNotificationsResponseSchema,
  type GetNotificationsResponse,
  SendNotificationResponseSchema,
  type SendNotificationResponse,
  DeleteNotificationResponseSchema,
  type DeleteNotificationResponse,
} from './responses/notifications.response';
