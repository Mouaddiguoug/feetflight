import { t } from 'elysia';
import { Static } from '@sinclair/typebox';

/**
 * PictureSchema
 * Represents a single picture in a post
 */
export const PictureSchema = t.Object({
  id: t.String({
    description: 'Picture unique identifier',
  }),
  url: t.String({
    description: 'Picture URL',
  }),
  order: t.Number({
    description: 'Picture order in the collection',
    minimum: 0,
  }),
});

export type PictureResponse = Static<typeof PictureSchema>;

/**
 * PostUserSchema
 * Represents user info in a post response
 */
export const PostUserSchema = t.Object({
  id: t.String({
    description: 'User ID',
  }),
  name: t.String({
    description: 'User name',
  }),
  email: t.String({
    format: 'email',
    description: 'User email',
  }),
  avatar: t.String({
    description: 'User avatar URL',
  }),
  followers: t.Number({
    description: 'Follower count',
    minimum: 0,
  }),
  followings: t.Number({
    description: 'Following count',
    minimum: 0,
  }),
});

/**
 * AlbumDataSchema
 * Represents album/post data
 */
export const AlbumDataSchema = t.Object({
  id: t.String({
    description: 'Album unique identifier',
  }),
  title: t.String({
    description: 'Album title',
  }),
  description: t.Optional(
    t.String({
      description: 'Album description',
    }),
  ),
  price: t.Number({
    description: 'Album price',
    minimum: 0,
  }),
  views: t.Number({
    description: 'View count',
    minimum: 0,
  }),
  likes: t.Number({
    description: 'Like count',
    minimum: 0,
  }),
  createdAt: t.String({
    description: 'Creation timestamp',
  }),
});

/**
 * PostResponseSchema
 * Full post/album response with pictures and user info
 */
export const PostResponseSchema = t.Object({
  albumData: AlbumDataSchema,
  user: PostUserSchema,
  pictures: t.Array(PictureSchema, {
    description: 'Array of pictures in the post',
  }),
});

export type PostResponse = Static<typeof PostResponseSchema>;

/**
 * GetPopularAlbumsResponseSchema
 * Response for GET /posts/popular
 */
export const GetPopularAlbumsResponseSchema = t.Object({
  albums: t.Array(PostResponseSchema, {
    description: 'Array of popular albums',
  }),
  total: t.Number({
    description: 'Total count of albums',
    minimum: 0,
  }),
});

export type GetPopularAlbumsResponse = Static<typeof GetPopularAlbumsResponseSchema>;

/**
 * GetRandomAlbumsResponseSchema
 * Response for GET /posts/random
 */
export const GetRandomAlbumsResponseSchema = t.Object({
  albums: t.Array(PostResponseSchema, {
    description: 'Array of random albums',
  }),
  page: t.Number({
    description: 'Current page number',
    minimum: 0,
  }),
  hasMore: t.Boolean({
    description: 'Whether there are more albums',
  }),
});

export type GetRandomAlbumsResponse = Static<typeof GetRandomAlbumsResponseSchema>;

/**
 * GetAlbumByCategoryResponseSchema
 * Response for GET /posts/category/:categoryId
 */
export const GetAlbumByCategoryResponseSchema = t.Object({
  albums: t.Array(PostResponseSchema, {
    description: 'Array of albums in category',
  }),
  categoryId: t.String({
    description: 'Category ID',
  }),
  total: t.Number({
    description: 'Total count of albums in category',
    minimum: 0,
  }),
});

export type GetAlbumByCategoryResponse = Static<typeof GetAlbumByCategoryResponseSchema>;

/**
 * GetPostPicturesResponseSchema
 * Response for GET /posts/:postId/pictures
 */
export const GetPostPicturesResponseSchema = t.Object({
  pictures: t.Array(PictureSchema, {
    description: 'Array of pictures',
  }),
  postId: t.String({
    description: 'Post ID',
  }),
});

export type GetPostPicturesResponse = Static<typeof GetPostPicturesResponseSchema>;

/**
 * CreatePostResponseSchema
 * Response for POST /posts
 */
export const CreatePostResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  post: PostResponseSchema,
});

export type CreatePostResponse = Static<typeof CreatePostResponseSchema>;

/**
 * UpdatePostResponseSchema
 * Response for PATCH /posts/:postId
 */
export const UpdatePostResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  post: PostResponseSchema,
});

export type UpdatePostResponse = Static<typeof UpdatePostResponseSchema>;

/**
 * DeletePostResponseSchema
 * Response for DELETE /posts/:postId
 */
export const DeletePostResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  deletedPostId: t.String({
    description: 'Deleted post ID',
  }),
});

export type DeletePostResponse = Static<typeof DeletePostResponseSchema>;

/**
 * LikePostResponseSchema
 * Response for POST /posts/:postId/like
 */
export const LikePostResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  liked: t.Boolean({
    description: 'Whether post is now liked (true) or unliked (false)',
  }),
  totalLikes: t.Number({
    description: 'Updated like count',
    minimum: 0,
  }),
});

export type LikePostResponse = Static<typeof LikePostResponseSchema>;

/**
 * CategorySchema
 * Represents a single category
 */
export const CategorySchema = t.Object({
  id: t.String({
    description: 'Category ID',
  }),
  name: t.String({
    description: 'Category name',
  }),
  description: t.Optional(
    t.String({
      description: 'Category description',
    }),
  ),
});

export type Category = Static<typeof CategorySchema>;

/**
 * GetCategoriesResponseSchema
 * Response for GET /albums/all-categories
 */
export const GetCategoriesResponseSchema = t.Object({
  categories: t.Array(CategorySchema, {
    description: 'Array of categories',
  }),
  total: t.Number({
    description: 'Total category count',
    minimum: 0,
  }),
});

export type GetCategoriesResponse = Static<typeof GetCategoriesResponseSchema>;

/**
 * GetSellerAlbumsResponseSchema
 * Response for GET /albums/seller/:sellerId
 */
export const GetSellerAlbumsResponseSchema = t.Object({
  albums: t.Array(PostResponseSchema, {
    description: 'Seller albums',
  }),
  sellerId: t.String({
    description: 'Seller ID',
  }),
  total: t.Number({
    description: 'Total album count',
    minimum: 0,
  }),
});

export type GetSellerAlbumsResponse = Static<typeof GetSellerAlbumsResponseSchema>;

/**
 * GetAllAlbumsResponseSchema
 * Response for GET /albums/:userId
 */
export const GetAllAlbumsResponseSchema = t.Object({
  albums: t.Array(PostResponseSchema, {
    description: 'All albums',
  }),
  total: t.Number({
    description: 'Total album count',
    minimum: 0,
  }),
});

export type GetAllAlbumsResponse = Static<typeof GetAllAlbumsResponseSchema>;

/**
 * PlanSchema
 * Represents a subscription plan
 */
export const PlanSchema = t.Object({
  id: t.String({
    description: 'Plan ID',
  }),
  name: t.String({
    description: 'Plan name',
  }),
  price: t.Number({
    description: 'Plan price',
    minimum: 0,
  }),
  interval: t.String({
    description: 'Billing interval (month/year)',
  }),
});

export type Plan = Static<typeof PlanSchema>;

/**
 * GetAlbumPlanResponseSchema
 * Response for GET /albums/plan/:albumId
 */
export const GetAlbumPlanResponseSchema = t.Object({
  plan: PlanSchema,
  albumId: t.String({
    description: 'Album ID',
  }),
});

export type GetAlbumPlanResponse = Static<typeof GetAlbumPlanResponseSchema>;

/**
 * UpdateViewsResponseSchema
 * Response for PUT /albums/views/:postId
 */
export const UpdateViewsResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  views: t.Number({
    description: 'Updated view count',
    minimum: 0,
  }),
  postId: t.String({
    description: 'Post ID',
  }),
});

export type UpdateViewsResponse = Static<typeof UpdateViewsResponseSchema>;

/**
 * UploadPostPicturesResponseSchema
 * Response for POST /albums/upload/:postId
 */
export const UploadPostPicturesResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  uploadedCount: t.Number({
    description: 'Number of pictures uploaded',
    minimum: 0,
  }),
  postId: t.String({
    description: 'Post ID',
  }),
});

export type UploadPostPicturesResponse = Static<typeof UploadPostPicturesResponseSchema>;

/**
 * CheckPurchaseResponseSchema
 * Response for checking if user purchased an album
 */
export const CheckPurchaseResponseSchema = t.Object({
  purchased: t.Boolean({
    description: 'Whether the user has purchased the album',
  }),
  userId: t.String({
    description: 'User ID',
  }),
  albumId: t.String({
    description: 'Album ID',
  }),
});

export type CheckPurchaseResponse = Static<typeof CheckPurchaseResponseSchema>;

/**
 * RecordPurchaseResponseSchema
 * Response for recording a purchase
 */
export const RecordPurchaseResponseSchema = t.Object({
  message: t.String({
    description: 'Success message',
  }),
  purchaseId: t.String({
    description: 'Purchase record ID',
  }),
  userId: t.String({
    description: 'User ID',
  }),
  albumId: t.String({
    description: 'Album ID',
  }),
});

export type RecordPurchaseResponse = Static<typeof RecordPurchaseResponseSchema>;
