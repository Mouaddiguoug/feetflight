import { Elysia, t } from 'elysia';
import {
  CreatePostSchema,
  LikePostSchema,
  GetRandomAlbumsParamSchema,
  PostPicturesUploadSchema,
  IdParamSchema,
} from '@feetflight/shared-types';
import { authGuard } from '@/plugins/auth.plugin';
import { sellerGuard } from '@/plugins/seller.plugin';
import { stripe } from '@/utils/stripe';
import {
  getPopularAlbums,
  getRandomAlbums,
  getSellerAlbums,
  getAlbumByCategory,
  getPostPictures,
  getCategories,
  getAllAlbums,
  deleteAlbum,
  getAlbumPlan,
  createPost,
  likePost,
  updateViews,
  uploadPostPictures,
} from '@/services/post.service';
import { loggerPlugin, neo4jPlugin } from '@/plugins';

export function postRoutes() {
  return new Elysia({ name: 'routes.post' }).group('/albums', (app) =>
    app
      .use(loggerPlugin())
      .use(neo4jPlugin())
      .get(
        '/random/:page/:id',
        async ({ params, neo4j, log, set }) => {
          const randomAlbums = await getRandomAlbums(params.page, params.id, { neo4j, log });
          set.status = 201;
          return randomAlbums;
        },
        {
          params: GetRandomAlbumsParamSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Get Random Albums',
            description:
              'Retrieves random albums from subscribed sellers with pagination support. Returns albums sorted by likes.',
          },
        }
      )

      /**
       * GET /albums/seller/:id - Get Seller Albums
       * Returns all albums belonging to a specific seller
       * Public endpoint (no authentication required)
       */
      .get(
        '/seller/:id',
        async ({ params, neo4j, log, set }) => {
          const sellerAlbums = await getSellerAlbums(params.id, { neo4j, log });
          set.status = 201;
          return sellerAlbums;
        },
        {
          params: IdParamSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Get Seller Albums',
            description:
              'Retrieves all albums created by a specific seller, sorted by views in descending order.',
          },
        }
      )

      /**
       * GET /albums/plan/:id - Get Album Plan
       * Returns the subscription plan associated with an album
       * Public endpoint (no authentication required)
       */
      .get(
        '/plan/:id',
        async ({ params, neo4j, log, set }) => {
          const plan = await getAlbumPlan(params.id, { neo4j, log });
          set.status = 200;
          return plan;
        },
        {
          params: IdParamSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Get Album Plan',
            description:
              'Retrieves the subscription plan details associated with a specific album/post.',
          },
        }
      )

      /**
       * POST /albums/likes/:id - Like Post
       * Creates a like relationship and sends notification to seller
       * Public endpoint (no authentication required)
       */
      .post(
        '/likes/:id',
        async ({ params, body, neo4j, log, set }) => {
          await likePost(params.id, body.userId, { neo4j, log });
          set.status = 201;
          return { message: 'post liked successfully' };
        },
        {
          params: IdParamSchema,
          body: LikePostSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Like Post',
            description:
              'Creates a like relationship between user and post, increments like count, and sends push notification to seller.',
          },
        }
      )

      /**
       * POST /albums/upload/:id - Upload Post Pictures
       * Uploads multiple picture files for a post collection
       * Public endpoint (NO AUTHENTICATION - matches original implementation)
       * WARNING: Security issue - consider adding authGuard + sellerGuard for production
       */
      .post(
        '/upload/:id',
        async ({ params, body, neo4j, log, set }) => {
          // Elysia's multipart parser returns File objects in body.pictures
          const pictures = body.pictures;

          // Convert Elysia File objects to array format for service
          const fileObjects = await Promise.all(
            pictures.map(async (file: File) => {
              const buffer = Buffer.from(await file.arrayBuffer());
              return {
                buffer,
                mimetype: file.type,
                fieldname: file.name,
              };
            })
          );

          await uploadPostPictures(fileObjects, params.id, { neo4j, log });

          set.status = 201;
          return { message: 'post pictures have been uploaded successfully' };
        },
        {
          params: IdParamSchema,
          body: t.Object({
            pictures: PostPicturesUploadSchema,
          }),
          detail: {
            tags: ['Albums'],
            summary: 'Upload Post Pictures',
            description:
              'Uploads multiple picture files (1-20 images, max 5MB each) for a post collection. Public endpoint with NO authentication (security issue from original implementation). Consider adding authGuard + sellerGuard for production use.',
          },
        }
      )

      // ==================== AUTHENTICATED ROUTES (authGuard applied) ====================

      /**
       * GET /albums/popular/:id - Get Popular Albums
       * Returns popular albums sorted by views
       * Requires authentication
       */
      .use(authGuard())
      .get(
        '/popular/:id',
        async ({ params, neo4j, log, set }) => {
          const popularPosts = await getPopularAlbums(params.id, { neo4j, log });
          set.status = 201;
          return { popularPosts };
        },
        {
          params: IdParamSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Get Popular Albums',
            description:
              'Retrieves popular albums sorted by views in descending order (up to 20 albums). Requires authentication.',
          },
        }
      )

      /**
       * GET /albums/category/:id - Get Albums by Category
       * Returns all albums in a specific category
       * Requires authentication
       */
      .get(
        '/category/:id',
        async ({ params, neo4j, log, set }) => {
          const AlbumByCategory = await getAlbumByCategory(params.id, { neo4j, log });
          set.status = 201;
          return { AlbumByCategory };
        },
        {
          params: IdParamSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Get Albums by Category',
            description:
              'Retrieves all albums belonging to a specific category, sorted by creation date. Requires authentication.',
          },
        }
      )

      /**
       * GET /albums/pictures/:id - Get Post Pictures
       * Returns all pictures associated with a post
       * Requires authentication
       */
      .get(
        '/pictures/:id',
        async ({ params, neo4j, log, set }) => {
          const postPictures = await getPostPictures(params.id, { neo4j, log });
          set.status = 201;
          return { data: postPictures };
        },
        {
          params: IdParamSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Get Post Pictures',
            description:
              'Retrieves all picture nodes associated with a specific post/album. Requires authentication.',
          },
        }
      )

      /**
       * GET /albums/all-categories - Get All Categories
       * Returns all available categories
       * Requires authentication
       */
      .get(
        '/all-categories',
        async ({ neo4j, log, set }) => {
          const categories = await getCategories({ neo4j, log });
          set.status = 201;
          return { categories };
        },
        {
          detail: {
            tags: ['Albums'],
            summary: 'Get All Categories',
            description:
              'Retrieves all available album categories from the database. Requires authentication.',
          },
        }
      )

      /**
       * GET /albums/:id - Get All Albums
       * Returns all albums excluding those from a specific user
       * Requires authentication
       * Note: Fixed param name bug from original (was using userId instead of id)
       */
      .get(
        '/:id',
        async ({ params, neo4j, log, set }) => {
          const allAlbums = await getAllAlbums(params.id, { neo4j, log });
          set.status = 201;
          return { allAlbums };
        },
        {
          params: IdParamSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Get All Albums',
            description:
              'Retrieves all albums excluding those from the specified user, sorted by views. Requires authentication. (Fixed param name bug: now uses :id instead of :userId)',
          },
        }
      )

      /**
       * DELETE /albums/:id - Delete Album
       * Deletes an album with its collection and pictures
       * Requires authentication
       */
      .delete(
        '/:id',
        async ({ params, neo4j, log, set }) => {
          const deletedAlbum = await deleteAlbum(params.id, { neo4j, log });
          set.status = 201;
          return deletedAlbum;
        },
        {
          params: IdParamSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Delete Album',
            description:
              'Deletes an album/post along with its collection and all associated pictures using DETACH DELETE. Requires authentication.',
          },
        }
      )

      /**
       * PUT /albums/views/:id - Update Views
       * Increments the view count for a post
       * Requires authentication
       */
      .put(
        '/views/:id',
        async ({ params, neo4j, log, set }) => {
          const updatedViews = await updateViews(params.id, { neo4j, log });
          set.status = 201;
          return { updatedViews };
        },
        {
          params: IdParamSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Update Views',
            description:
              'Increments the view count for a specific post/album by 1. Requires authentication.',
          },
        }
      )

      // ==================== SELLER-ONLY ROUTES (authGuard + sellerGuard) ====================

      /**
       * POST /albums/:id - Create Post
       * Creates a new post/album with Stripe product integration
       * Requires authentication and seller verification
       */
      .use(sellerGuard())
      .post(
        '/:id',
        async ({ params, body, neo4j, log, set }) => {
          const createdPost = await createPost(params.id, body, { neo4j, log, stripe });
          set.status = 201;
          return { data: createdPost };
        },
        {
          params: IdParamSchema,
          body: CreatePostSchema,
          detail: {
            tags: ['Albums'],
            summary: 'Create Post',
            description:
              'Creates a new post/album with associated collection and Stripe product. Links post to seller, plan, and category. Requires authentication and verified seller status.',
          },
        }
      )
  );
}
