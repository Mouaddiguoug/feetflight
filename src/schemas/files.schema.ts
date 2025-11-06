import { t , type Static} from 'elysia';


/**
 * AvatarUploadSchema
 * Use for POST /users/avatar route validation
 * Validates single avatar file upload (5MB max)
 */
export const AvatarUploadSchema = t.File({
  maxSize: 5000000, // 5MB
  type: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  error: 'Avatar must be an image file (JPEG, PNG, WebP) under 5MB',
});

export type AvatarUploadDTO = Static<typeof AvatarUploadSchema>;

/**
 * IdentityCardUploadSchema
 * Each file must be under 5MB and in JPEG, PNG, or PDF format
 */
export const IdentityCardUploadSchema = t.Object({
  frontSide: t.Files({
    maxItems: 1,
    minItems: 1,
    maxSize: 5000000, // 5MB per file
    type: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    error: 'Front side of identity card is required (JPEG, PNG, PDF under 5MB)',
  }),
  backSide: t.Files({
    maxItems: 1,
    minItems: 1,
    maxSize: 5000000, // 5MB per file
    type: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    error: 'Back side of identity card is required (JPEG, PNG, PDF under 5MB)',
  }),
});

export type IdentityCardUploadDTO = Static<typeof IdentityCardUploadSchema>;

/**
 * PostPicturesUploadSchema
 * Each file must be under 5MB
 */
export const PostPicturesUploadSchema = t.Files({
  minItems: 1,
  maxItems: 20,
  maxSize: 5000000, // 5MB per file
  type: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  error: 'Post pictures must be image files (JPEG, PNG, WebP) under 5MB each, with 1-20 images',
});

export type PostPicturesUploadDTO = Static<typeof PostPicturesUploadSchema>;

/**
 * SentPictureUploadSchema
 * Use for POST /sellers/sent-picture route validation
 * Validates single sent picture file upload (5MB max)
 */
export const SentPictureUploadSchema = t.File({
  maxSize: 5000000, // 5MB
  type: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  error: 'Sent picture must be an image file (JPEG, PNG, WebP) under 5MB',
});

export type SentPictureUploadDTO = Static<typeof SentPictureUploadSchema>;
