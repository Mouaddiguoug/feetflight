import { uid } from 'uid';
import path from 'path';
import moment from 'moment';
import { writeFile } from 'node:fs';
import { promisify } from 'util';
import { Buffer } from 'node:buffer';
import type Stripe from 'stripe';
import type { Session } from 'neo4j-driver';
import { BadRequestError, InternalServerError, NotFoundError } from '@/plugins/error.plugin';
import { Tneo4j } from '@/plugins/neo4j.plugin';
import { Logger } from 'pino';
import { PostRepository } from '@/domain/repositories/post.repository';
import type {
  GetPopularAlbumsResponse,
  GetRandomAlbumsResponse,
  GetAlbumByCategoryResponse,
  DeletePostResponse,
  GetCategoriesResponse,
  GetSellerAlbumsResponse,
  GetAllAlbumsResponse,
  GetAlbumPlanResponse,
  GetPostPicturesResponse,
  UpdateViewsResponse,
  UploadPostPicturesResponse,
  LikePostResponse,
} from '@feetflight/shared-types';

export interface PostServiceDeps {
  neo4j: Tneo4j;
  log: Logger;
  stripe?: Stripe;
}

const writeFileAsync = promisify(writeFile);

export async function getPopularAlbums(
  userId: string,
  deps: PostServiceDeps
): Promise<GetPopularAlbumsResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    const albums = await postRepo.findPopular(userId);
    return {
      albums,
      total: albums.length,
    };
  } catch (error) {
    log?.error({ error, userId }, 'Get popular albums failed');
    throw new InternalServerError(
      `Failed to get popular albums: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getRandomAlbums(
  page: number,
  userId: string,
  deps: PostServiceDeps
): Promise<GetRandomAlbumsResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    const albums = await postRepo.findRandom(page, userId);
    // Assuming 20 per page (based on repository LIMIT 20)
    const hasMore = albums.length === 20;
    return {
      albums,
      page,
      hasMore,
    };
  } catch (error) {
    log?.error({ error, page, userId }, 'Get random albums failed');
    throw new InternalServerError(
      `Failed to get random albums: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getAlbumByCategory(
  categoryId: string,
  deps: PostServiceDeps
): Promise<GetAlbumByCategoryResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    const albums = await postRepo.findByCategory(categoryId);
    return {
      albums,
      categoryId,
      total: albums.length,
    };
  } catch (error) {
    log?.error({ error, categoryId }, 'Get album by category failed');
    throw new InternalServerError(
      `Failed to get album by category: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function deleteAlbum(
  albumId: string,
  deps: PostServiceDeps
): Promise<DeletePostResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    await postRepo.delete(albumId);
    return {
      message: 'Album deleted successfully',
      deletedPostId: albumId,
    };
  } catch (error) {
    log?.error({ error, albumId }, 'Delete album failed');
    throw new InternalServerError(
      `Failed to delete album: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getCategories(deps: PostServiceDeps): Promise<GetCategoriesResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    const categories = await postRepo.findAllCategories();
    return {
      categories,
      total: categories.length,
    };
  } catch (error) {
    log?.error({ error }, 'Get categories failed');
    throw new InternalServerError(
      `Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getAlbumPlan(
  albumId: string,
  deps: PostServiceDeps
): Promise<GetAlbumPlanResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    const plan = await postRepo.getPlanForAlbum(albumId);
    return {
      plan,
      albumId,
    };
  } catch (error) {
    log?.error({ error, albumId }, 'Get album plan failed');

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new InternalServerError(
      `Failed to get album plan: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getAllAlbums(
  userId: string,
  deps: PostServiceDeps
): Promise<GetAllAlbumsResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    const albums = await postRepo.findAllExcludingUser(userId);
    return {
      albums,
      total: albums.length,
    };
  } catch (error) {
    log?.error({ error, userId }, 'Get all albums failed');
    throw new InternalServerError(
      `Failed to get all albums: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getSellerAlbums(
  userId: string,
  deps: PostServiceDeps
): Promise<GetSellerAlbumsResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    const albums = await postRepo.findBySeller(userId);
    return {
      albums,
      sellerId: userId,
      total: albums.length,
    };
  } catch (error) {
    log?.error({ error, userId }, 'Get seller albums failed');
    throw new InternalServerError(
      `Failed to get seller albums: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getPostPictures(
  postId: string,
  deps: PostServiceDeps
): Promise<GetPostPicturesResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    const pictures = await postRepo.getPictures(postId);
    return {
      pictures,
      postId,
    };
  } catch (error) {
    log?.error({ error, postId }, 'Get post pictures failed');
    throw new InternalServerError(
      `Failed to get post pictures: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function updateViews(
  postId: string,
  deps: PostServiceDeps
): Promise<UpdateViewsResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    await postRepo.incrementViews(postId);
    const post = await postRepo.findByIdOrFail(postId);
    return {
      message: 'Views updated successfully',
      views: post.views,
      postId,
    };
  } catch (error) {
    log?.error({ error, postId }, 'Update views failed');
    throw new InternalServerError(
      `Failed to update views: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function createPost(
  userId: string,
  postData: any,
  deps: PostServiceDeps
): Promise<{ post: any; collection: any }> {
  const { neo4j, log, stripe } = deps;

  if (!stripe) {
    throw new InternalServerError('Stripe client not available');
  }

  // Validate Stripe configuration
  if (!process.env.STRIPE_TEST_KEY && !Bun.env.STRIPE_TEST_KEY) {
    throw new InternalServerError(
      'STRIPE_TEST_KEY environment variable is not set. ' +
        'Please add it to your .env file. ' +
        'Get your API key from: https://dashboard.stripe.com/apikeys'
    );
  }

  try {
    // Perform all database operations in single session
    const result = await neo4j.withSession(async (session: Session) => {
      // Find user
      const findUser = await session.executeRead((tx) =>
        tx.run('match (u:user {id: $userId}) return u', { userId: userId })
      );

      if (findUser.records.length === 0) {
        throw new NotFoundError(`This user doesn't exist`);
      }

      // Validate required fields
      if (!postData.data.postTitle || !postData.data.postDescription || !postData.data.price) {
        throw new BadRequestError(`Missing required fields: postTitle, postDescription, or price`);
      }

      // Create post, collection, and link to seller and plan
      const createdCollection = await session.executeWrite((tx) =>
        tx.run(
          'match (u:user {id: $userId})-[IS_A]-(s:seller)-[:HAS_A]-(plan:plan {id: $planId}) create (s)-[h: HAS_A]->(p:post {id: $postId, description: $description, isWithPreview: $isWithPreview, title: $title, price: $price, createdAt: $createdAt, views: 0, likes: 0, categoryId: $categoryId})-[:HAS_A]->(c:collection {id: $collectionId}) create (p)-[:IS_OF]->(plan) return c, p, u, s',
          {
            userId: userId,
            postId: uid(40),
            createdAt: moment().format('MMMM DD, YYYY'),
            title: postData.data.postTitle,
            isWithPreview: postData.data.isWithPreview,
            description: postData.data.postDescription,
            price: postData.data.price,
            collectionId: uid(40),
            planId: postData.data.planId,
            categoryId: postData.data.categoryId,
          }
        )
      );

      // Link to category in same session
      await session.executeWrite((tx) =>
        tx.run(
          'match (ca:category {id: $categoryId}), (p:post {id: $postId}) create (p)-[:OF_A]->(ca)',
          {
            postId: createdCollection.records.map((record) => record.get('p').properties.id)[0],
            categoryId: postData.data.categoryId,
          }
        )
      );

      return createdCollection;
    });

    // Create Stripe product
    await stripe.products.create({
      id: result.records.map((record) => record.get('p').properties.id)[0],
      name: postData.data.postTitle,
      metadata: {
        sellerId: result.records.map((record) => record.get('s').properties.id)[0].toString(),
      },
      description: postData.data.postDescription,
      default_price_data: {
        currency: 'EUR',
        unit_amount: postData.data.price * 100,
      },
    });

    log?.info(
      { userId, postId: result.records[0]?.get('p').properties.id },
      'Post created successfully'
    );

    return {
      post: result.records.map((record) => record.get('p').properties)[0],
      collection: result.records.map((record) => record.get('c').properties)[0],
    };
  } catch (error) {
    log?.error({ error, userId }, 'Create post failed');

    if (
      error instanceof NotFoundError ||
      error instanceof BadRequestError ||
      error instanceof InternalServerError
    ) {
      throw error;
    }

    throw new InternalServerError(
      `Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function likePost(
  albumId: string,
  userId: string,
  deps: PostServiceDeps
): Promise<LikePostResponse> {
  const { neo4j, log } = deps;
  const postRepo = new PostRepository({ neo4j, log });

  try {
    const { liked, totalLikes } = await postRepo.like(albumId, userId);

    // Send notification if post was liked (not unliked)
    if (liked) {
      //const notificationsService = new NotificationService({ neo4j, log });
      // Note: We'd need to get seller info from the post to send notification
      // For now, skipping notification to avoid extra query
      // TODO: Add getSellerId method to PostRepository if needed
    }

    log?.info({ albumId, userId, liked, totalLikes }, 'Post like toggled successfully');

    return {
      message: liked ? 'Post liked successfully' : 'Post unliked successfully',
      liked,
      totalLikes,
    };
  } catch (error) {
    log?.error({ error, albumId, userId }, 'Like post failed');
    throw new InternalServerError(
      `Failed to like post: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function uploadPostPictures(
  pictureFiles: Array<{ buffer: Buffer; mimetype: string; fieldname: string }>,
  collectionId: string,
  deps: PostServiceDeps
): Promise<UploadPostPicturesResponse> {
  const { log } = deps;

  try {
    // Write all files in parallel
    const fileWritePromises = pictureFiles.map(async (file) => {
      const filecontent = file.buffer;
      const filename = `${file.fieldname.replace('.', '')}${collectionId}${moment().format('ssMMyyyy')}.${file.mimetype.split('/')[1]}`;
      const filepath = path.join(__dirname, '../../public/files/albums', filename);

      await writeFileAsync(filepath, filecontent);

      return {
        fieldname: file.fieldname,
        path: `/public/files/albums/${filename}`,
      };
    });

    const writtenFiles = await Promise.all(fileWritePromises);

    // Create picture nodes in database after all files are written
    await Promise.all(
      writtenFiles.map((file) => createPictures(file.fieldname, file.path, collectionId, deps))
    );

    log?.info(
      { collectionId, fileCount: writtenFiles.length },
      'Post pictures uploaded successfully'
    );

    return {
      message: 'Pictures uploaded successfully',
      uploadedCount: writtenFiles.length,
      postId: collectionId,
    };
  } catch (error) {
    log?.error({ error, collectionId }, 'Upload post pictures failed');
    throw new InternalServerError(
      `Failed to upload post pictures: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function createPictures(
  pictureDescription: string,
  value: string,
  collectionId: string,
  deps: PostServiceDeps
): Promise<void> {
  const { neo4j, log } = deps;

  try {
    await neo4j.withSession(async (session: Session) => {
      await session.executeWrite((tx) =>
        tx.run(
          'match (c:collection {id: $collectionId}) create (c)-[r: HAS_A]->(p: picture {id: $pictureId, value: $value, description: $description})',
          {
            description: pictureDescription,
            pictureId: uid(40),
            value: value,
            collectionId: collectionId,
          }
        )
      );
    });
  } catch (error) {
    log?.error({ error, collectionId, pictureDescription }, 'Create picture failed');
    throw new InternalServerError(
      `Failed to create picture: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
