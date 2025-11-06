import { t } from 'elysia';
import { Static } from '@sinclair/typebox';

/**
 * CreatePostSchema
 * Use for POST /posts route validation
 * Validates post/album creation with title, description, pricing, and category
 */
export const CreatePostSchema = t.Object({
  data: t.Object({
    postTitle: t.String({
      minLength: 3,
      maxLength: 100,
      error: 'Post title must be between 3 and 100 characters',
    }),
    postDescription: t.String({
      minLength: 10,
      maxLength: 1000,
      error: 'Post description must be between 10 and 1000 characters',
    }),
    price: t.Numeric({
      minimum: 0,
      error: 'Price must be a positive number',
    }),
    isWithPreview: t.Union([t.Boolean(), t.String({ enum: ['true', 'false'] })], {
      error: 'Preview flag is required (boolean or "true"/"false" string)',
    }),
    planId: t.String({
      error: 'Plan ID is required',
    }),
    categoryId: t.String({
      error: 'Category ID is required',
    }),
  }),
});

export type CreatePostDTO = Static<typeof CreatePostSchema>;

/**
 * LikePostSchema
 * Use for POST /posts/:postId/like route validation
 * Validates post like action
 */
export const LikePostSchema = t.Object({
  userId: t.String({
    error: 'User ID is required',
  }),
});

export type LikePostDTO = Static<typeof LikePostSchema>;

/**
 * GetRandomAlbumsParamSchema
 * Use for GET /albums/random/:page/:id route validation
 * Validates pagination parameters for random album fetching
 */
export const GetRandomAlbumsParamSchema = t.Object({
  page: t.Numeric({
    minimum: 0,
    error: 'Page must be a non-negative number',
  }),
  id: t.String({
    error: 'User ID is required',
  }),
});

export type GetRandomAlbumsParamDTO = Static<typeof GetRandomAlbumsParamSchema>;

/**
 * CheckForSaleParamSchema
 * Use for GET /posts/check-sale/:postId/:userId/:plan route validation
 * Validates sale check parameters
 */
export const CheckForSaleParamSchema = t.Object({
  postId: t.String({
    error: 'Post ID is required',
  }),
  userId: t.String({
    error: 'User ID is required',
  }),
  plan: t.String({
    error: 'Plan is required',
  }),
});

export type CheckForSaleParamDTO = Static<typeof CheckForSaleParamSchema>;
