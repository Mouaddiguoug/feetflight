import { uid } from 'uid';
import path from 'path';
import moment from 'moment';
import { writeFile } from 'node:fs';
import { promisify } from 'util';
import { Buffer } from 'node:buffer';
import type Stripe from 'stripe';
import type { Session } from 'neo4j-driver';
import NotificationService from './notification.service';
import { BadRequestError, InternalServerError, NotFoundError } from '@/plugins/error.plugin';
import { Tneo4j } from '@/plugins/neo4j.plugin';
import { Logger } from 'pino';
export interface PostServiceDeps {
  neo4j: Tneo4j;
  log?: Logger;
  stripe?: Stripe;
}

const writeFileAsync = promisify(writeFile);

export async function getPopularAlbums(userId: string, deps: PostServiceDeps): Promise<any[]> {
  const { neo4j, log } = deps;

  try {
    const popularPosts = await neo4j.withSession(async (session: Session) => {
      return await session.executeRead((tx) =>
        tx.run(
          'match (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)-[:IS_A]-(user:user) where user.id <> $userId WITH post, collect(picture) AS pictures, user AS user return { post: post, user: user, pictures: pictures } as data order by post.views DESC limit 20',
          {
            userId: userId,
          }
        )
      );
    });

    return popularPosts.records.map((record: any) => {
      const data = record.get('data');
      return {
        albumData: data.post.properties,
        user: data.user.properties,
        pictres: data.pictures.map((picture: any) => picture.properties),
      };
    });
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
): Promise<any[]> {
  const { neo4j, log } = deps;

  try {
    const popularPosts = await neo4j.withSession(async (session: Session) => {
      return await session.executeRead((tx) =>
        tx.run(
          'match (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)-[:IS_A]-(user:user), (u:user {id: $userId}) where EXISTS((u)-[:SUBSCRIBED_TO]->(s)) WITH post, collect(picture) AS pictures, user AS user return { post: post, user: user, pictures: pictures } as data order by post.likes DESC skip toInteger($skip) limit 20',
          {
            skip: Number(`${page}0`),
            userId: userId,
          }
        )
      );
    });

    return popularPosts.records.map((record: any) => {
      const data = record.get('data');
      return {
        albumData: data.post.properties,
        user: data.user.properties,
        pictres: data.pictures.map((picture: any) => picture.properties),
      };
    });
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
): Promise<any[]> {
  const { neo4j, log } = deps;

  try {
    const AlbumByCategory = await neo4j.withSession(async (session: Session) => {
      return await session.executeRead((tx) =>
        tx.run(
          'match (category {id: $categoryId})<-[:OF_A]-(post:post)-[:HAS_A]-(:seller)-[:IS_A]-(user:user) WITH post, user AS user return { post: post, user: user } as data order by post.createdAt DESC ',
          {
            categoryId: categoryId,
          }
        )
      );
    });

    const albumPromise = AlbumByCategory.records.map(async (record: any) => {
      const data = record.get('data');
      return {
        albumData: data.post.properties,
        user: data.user.properties,
        pictres: await getPostPictures(data.post.properties.id, deps),
      };
    });

    const album = await Promise.all(albumPromise);

    return album;
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
): Promise<{ message: string }> {
  const { neo4j, log } = deps;

  try {
    await neo4j.withSession(async (session: Session) => {
      await session.executeWrite((tx) =>
        tx.run(
          'match (p:post {id: $albumId})-[:HAS_A]->(c:collection)-[:HAS_A]->(pi:picture) detach delete p, c, pi',
          {
            albumId: albumId,
          }
        )
      );
    });

    return { message: 'the album was delete successfully' };
  } catch (error) {
    log?.error({ error, albumId }, 'Delete album failed');
    throw new InternalServerError(
      `Failed to delete album: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getCategories(deps: PostServiceDeps): Promise<any[]> {
  const { neo4j, log } = deps;

  try {
    const categories = await neo4j.withSession(async (session: Session) => {
      return await session.executeRead((tx) => tx.run('match (category:category) return category'));
    });

    return categories.records.map((record) => record.get('category').properties);
  } catch (error) {
    log?.error({ error }, 'Get categories failed');
    throw new InternalServerError(
      `Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getAlbumPlan(albumId: string, deps: PostServiceDeps): Promise<any> {
  const { neo4j, log } = deps;

  try {
    const plan = await neo4j.withSession(async (session: Session) => {
      return await session.executeRead((tx) =>
        tx.run('match (plan:plan)<-[:IS_OF]-(p:post {id: $albumId}) return plan', {
          albumId: albumId,
        })
      );
    });

    const planData = plan.records.map((record) => record.get('plan').properties)[0];

    if (!planData) {
      throw new NotFoundError('Album plan not found');
    }

    return planData;
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

export async function getAllAlbums(userId: string, deps: PostServiceDeps): Promise<any[]> {
  const { neo4j, log } = deps;

  try {
    const allAlbums = await neo4j.withSession(async (session: Session) => {
      return await session.executeRead((tx) =>
        tx.run(
          'match (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)-[:IS_A]-(user:user) where user.id <> $userId WITH post, collect(picture) AS pictures, user AS user return { post: post, user: user, pictures: pictures } as data order by post.views DESC',
          {
            userId: userId,
          }
        )
      );
    });

    return allAlbums.records.map((record: any) => {
      const data = record.get('data');
      return {
        albumData: data.post.properties,
        user: data.user.properties,
        pictres: data.pictures.map((picture: any) => picture.properties),
      };
    });
  } catch (error) {
    log?.error({ error, userId }, 'Get all albums failed');
    throw new InternalServerError(
      `Failed to get all albums: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getSellerAlbums(userId: string, deps: PostServiceDeps): Promise<any[]> {
  const { neo4j, log } = deps;

  try {
    const allAlbums = await neo4j.withSession(async (session: Session) => {
      return await session.executeRead((tx) =>
        tx.run(
          'match (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)-[:IS_A]-(user:user) where user.id = $userId WITH post, collect(picture) AS pictures, user as user return { post: post, user: user, pictures: pictures } as data order by post.views DESC',
          {
            userId: userId,
          }
        )
      );
    });

    return allAlbums.records.map((record: any) => {
      const data = record.get('data');
      return {
        albumData: data.post.properties,
        user: data.user.properties,
        pictres: data.pictures.map((picture: any) => picture.properties),
      };
    });
  } catch (error) {
    log?.error({ error, userId }, 'Get seller albums failed');
    throw new InternalServerError(
      `Failed to get seller albums: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getPostPictures(postId: string, deps: PostServiceDeps): Promise<any[]> {
  const { neo4j, log } = deps;

  try {
    const pictures = await neo4j.withSession(async (session: Session) => {
      return await session.executeRead((tx) =>
        tx.run(
          'match (post {id: $postId})-[:HAS_A]->(collection)-[:HAS_A]->(pct:picture) return pct',
          {
            postId: postId,
          }
        )
      );
    });

    return pictures.records.map((record) => record.get('pct').properties);
  } catch (error) {
    log?.error({ error, postId }, 'Get post pictures failed');
    throw new InternalServerError(
      `Failed to get post pictures: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function updateViews(postId: string, deps: PostServiceDeps): Promise<number> {
  const { neo4j, log } = deps;

  try {
    const newViews = await neo4j.withSession(async (session: Session) => {
      return await session.executeWrite((tx) =>
        tx.run('match (p:post {id: $postId}) set p.views = p.views + 1 return p.views', {
          postId: postId,
        })
      );
    });

    const viewRecord = newViews.records[0];
    if (!viewRecord) {
      throw new InternalServerError('Failed to update views: no record returned');
    }
    const views = viewRecord.get('p.views');
    const viewsNumber =
      typeof views === 'object' && views !== null && 'toNumber' in views
        ? views.toNumber()
        : Number(views);
    return viewsNumber;
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
): Promise<void> {
  const { neo4j, log } = deps;

  try {
    const data = await neo4j.withSession(async (session: Session) => {
      return await session.executeWrite((tx) =>
        tx.run(
          'match (p:post {id: $postId})<-[:HAS_A]-(seller:seller), (user:user {id: $userId}) create (user)-[:liked]->(p) set p.likes = p.likes + 1 return seller, user',
          {
            postId: albumId,
            userId: userId,
          }
        )
      );
    });

    const sellerId = data.records.map((record) => record.get('seller').properties.id)[0];
    const name = data.records.map((record) => record.get('user').properties.name)[0];
    const title = 'Like';
    const body = `${name} just liked your post`;

    const notificationsService = new NotificationService({ neo4j, log });
    notificationsService.pushSellerNotificatons(sellerId, title, body);

    log?.info({ albumId, userId, sellerId }, 'Post liked successfully');
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
): Promise<void> {
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

/**
 * @deprecated Legacy postService class for backward compatibility with Express controller
 */
export default class postService {
  /**
   * @deprecated Use the exported getPopularAlbums() function instead
   */
  public async getPopularAlbums(userId: string): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported getRandomAlbums() function instead
   */
  public async getRandomAlbums(page: number, userId: string): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported getAlbumByCategory() function instead
   */
  public async getAlbumByCategory(categoryId: string): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported deleteAlbum() function instead
   */
  public async deleteAlbum(albumId: string): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported getCategories() function instead
   */
  public async getCategories(): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported getAlbumPlan() function instead
   */
  public async getAlbumPlan(albumId: string): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported getAllAlbums() function instead
   */
  public async getAllAlbums(userId: string): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported getSellerAlbums() function instead
   */
  public async getSellerAlbums(userId: string): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported getPostPictures() function instead
   */
  public async getPostPictures(postId: string): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported updateViews() function instead
   */
  public async UpdateViews(postId: string): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported createPost() function instead
   */
  public async createPost(userId: string, postData: any): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported likePost() function instead
   */
  public async likePost(albumId: string, userId: string): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported uploadPostPictures() function instead
   */
  public async uploadPostPictures(
    pictureFiles: Array<{ buffer: Buffer; mimetype: string; fieldname: string }>,
    collectionId: string
  ): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }

  /**
   * @deprecated Use the exported createPictures() function instead
   */
  public async createPictures(
    pictureDescription: string,
    value: string,
    collectionId: string
  ): Promise<any> {
    throw new Error(
      'postService class is deprecated. This method is non-functional. ' +
        'Use the Elysia routes in src/routes/post.route.ts instead.'
    );
  }
}
