import { Integer, QueryResult } from 'neo4j-driver';
import { BaseRepository, NodeProps } from './base.repository';
import { NotFoundError } from '../../plugins/error.plugin';

/**
 * Post Repository - Type-Safe Implementation
 *
 * Handles all database operations related to posts (albums).
 * Posts are collections of pictures created by sellers.
 *
 * Type Safety Benefits:
 * - IntelliSense autocomplete for all properties
 * - Compile-time error detection
 * - No runtime errors from typos in property names
 * - Automatic Integer to number conversion
 */

/**
 * Post node properties as stored in Neo4j
 */
export interface PostNodeProps {
  id: string;
  title: string;
  description?: string;
  price: number;
  views: Integer;
  likes: Integer;
  createdAt: string | Integer;
}

/**
 * Post properties after Integer conversion
 */
export type PostProperties = NodeProps<PostNodeProps>;

/**
 * Picture node properties as stored in Neo4j
 */
export interface PictureNodeProps {
  id: string;
  url: string;
  order: number;
}

/**
 * Picture properties after conversion
 */
export type PictureProperties = NodeProps<PictureNodeProps>;

/**
 * Category node properties
 */
export interface CategoryNodeProps {
  id: string;
  name: string;
  description?: string;
}

/**
 * Category properties after conversion
 */
export type CategoryProperties = NodeProps<CategoryNodeProps>;

/**
 * Post with full details including user and pictures
 */
export interface PostWithDetails {
  albumData: {
    id: string;
    title: string;
    description?: string;
    price: number;
    views: number;
    likes: number;
    createdAt: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    userName: string;
    avatar: string;
    followers: number;
    followings: number;
  };
  pictures: Array<{
    id: string;
    url: string;
    order: number;
  }>;
}

/**
 * Type-safe record interfaces for query results
 */
interface PostRecord {
  post: PostNodeProps;
  [key: string]: unknown;
}

interface PostWithUserRecord {
  data: {
    post: {
      properties: PostNodeProps;
    };
    user: {
      properties: {
        id: string;
        name: string;
        email: string;
        userName: string;
        avatar: string;
        followers: number;
        followings: number;
      };
    };
    pictures: Array<{
      properties: PictureNodeProps;
    }>;
  };
  [key: string]: unknown;
}

interface PicturesRecord {
  pictures: PictureNodeProps[];
  [key: string]: unknown;
}

interface LikeResultRecord {
  liked: boolean;
  totalLikes: Integer;
  [key: string]: unknown;
}

interface PurchasedRecord {
  purchased: boolean;
  [key: string]: unknown;
}

/**
 * Input for creating a new post
 */
export interface CreatePostInput {
  title: string;
  description?: string;
  price: number;
  categoryId?: string;
}

/**
 * Input for updating a post
 */
export interface UpdatePostInput {
  title?: string;
  description?: string;
  price?: number;
}

export class PostRepository extends BaseRepository {
  /**
   * Find post by ID with full type safety
   */
  async findById(postId: string): Promise<PostProperties | null> {
    const query = `
      MATCH (post:post {id: $postId})
      RETURN post {.*} as post
    `;

    const result = await this.executeRead<PostRecord>(query, { postId });
    const postData = this.getValue<PostRecord['post']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'post'
    );

    if (!postData) {
      return null;
    }

    return {
      id: postData.id,
      title: postData.title,
      description: postData.description,
      price: postData.price,
      views: this.toNumber(postData.views),
      likes: this.toNumber(postData.likes),
      createdAt:
        typeof postData.createdAt === 'string' ? postData.createdAt : postData.createdAt.toString(),
    };
  }

  /**
   * Find post by ID or throw error
   */
  async findByIdOrFail(postId: string): Promise<PostProperties> {
    const post = await this.findById(postId);

    if (!post) {
      throw new NotFoundError(`Post with ID ${postId} not found`);
    }

    return post;
  }

  /**
   * Get popular posts with user and pictures
   */
  async findPopular(userId?: string): Promise<PostWithDetails[]> {
    const query = `
      MATCH (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)<-[:IS_A]-(user:user)
      ${userId ? 'WHERE user.id <> $userId' : ''}
      WITH post, collect(picture) AS pictures, user AS user,
           size((user)<-[:FOLLOWS]-()) as followers,
           size((user)-[:FOLLOWS]->()) as followings
      RETURN {
        post: post,
        user: user {.*, followers: followers, followings: followings},
        pictures: pictures
      } as data
      ORDER BY post.views DESC
      LIMIT 20
    `;

    const result = await this.executeRead<PostWithUserRecord>(query, userId ? { userId } : {});

    return result.records.map((record) => {
      const data = record.get('data') as PostWithUserRecord['data'];
      return {
        albumData: {
          id: data.post.properties.id,
          title: data.post.properties.title,
          description: data.post.properties.description,
          price: data.post.properties.price,
          views: this.toNumber(data.post.properties.views),
          likes: this.toNumber(data.post.properties.likes),
          createdAt:
            typeof data.post.properties.createdAt === 'string'
              ? data.post.properties.createdAt
              : data.post.properties.createdAt.toString(),
        },
        user: {
          id: data.user.properties.id,
          name: data.user.properties.name,
          email: data.user.properties.email,
          userName: data.user.properties.userName,
          avatar: data.user.properties.avatar,
          followers: data.user.properties.followers,
          followings: data.user.properties.followings,
        },
        pictures: data.pictures.map((pic) => ({
          id: pic.properties.id,
          url: pic.properties.url,
          order: pic.properties.order,
        })),
      };
    });
  }

  /**
   * Get random posts for subscribed sellers
   */
  async findRandom(page: number, userId: string): Promise<PostWithDetails[]> {
    const query = `
      MATCH (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)<-[:IS_A]-(user:user),
            (u:user {id: $userId})
      WHERE EXISTS((u)-[:SUBSCRIBED_TO]->(s))
      WITH post, collect(picture) AS pictures, user AS user,
           size((user)<-[:FOLLOWS]-()) as followers,
           size((user)-[:FOLLOWS]->()) as followings
      RETURN {
        post: post,
        user: user {.*, followers: followers, followings: followings},
        pictures: pictures
      } as data
      ORDER BY post.likes DESC
      SKIP toInteger($skip)
      LIMIT 20
    `;

    const result = await this.executeRead<PostWithUserRecord>(query, {
      skip: Number(`${page}0`),
      userId,
    });

    return result.records.map((record) => {
      const data = record.get('data') as PostWithUserRecord['data'];
      return {
        albumData: {
          id: data.post.properties.id,
          title: data.post.properties.title,
          description: data.post.properties.description,
          price: data.post.properties.price,
          views: this.toNumber(data.post.properties.views),
          likes: this.toNumber(data.post.properties.likes),
          createdAt:
            typeof data.post.properties.createdAt === 'string'
              ? data.post.properties.createdAt
              : data.post.properties.createdAt.toString(),
        },
        user: {
          id: data.user.properties.id,
          name: data.user.properties.name,
          email: data.user.properties.email,
          userName: data.user.properties.userName,
          avatar: data.user.properties.avatar,
          followers: data.user.properties.followers,
          followings: data.user.properties.followings,
        },
        pictures: data.pictures.map((pic) => ({
          id: pic.properties.id,
          url: pic.properties.url,
          order: pic.properties.order,
        })),
      };
    });
  }

  /**
   * Get posts by category
   */
  async findByCategory(categoryId: string): Promise<PostWithDetails[]> {
    const query = `
      MATCH (category {id: $categoryId})<-[:OF_A]-(post:post)<-[:HAS_A]-(s:seller)<-[:IS_A]-(user:user)
      OPTIONAL MATCH (post)-[:HAS_A]->(collection:collection)-[:HAS_A]->(picture:picture)
      WITH post, user, collect(picture) AS pictures,
           size((user)<-[:FOLLOWS]-()) as followers,
           size((user)-[:FOLLOWS]->()) as followings
      RETURN {
        post: post,
        user: user {.*, followers: followers, followings: followings},
        pictures: pictures
      } as data
      ORDER BY post.createdAt DESC
    `;

    const result = await this.executeRead<PostWithUserRecord>(query, { categoryId });

    return result.records.map((record) => {
      const data = record.get('data') as PostWithUserRecord['data'];
      return {
        albumData: {
          id: data.post.properties.id,
          title: data.post.properties.title,
          description: data.post.properties.description,
          price: data.post.properties.price,
          views: this.toNumber(data.post.properties.views),
          likes: this.toNumber(data.post.properties.likes),
          createdAt:
            typeof data.post.properties.createdAt === 'string'
              ? data.post.properties.createdAt
              : data.post.properties.createdAt.toString(),
        },
        user: {
          id: data.user.properties.id,
          name: data.user.properties.name,
          email: data.user.properties.email,
          userName: data.user.properties.userName,
          avatar: data.user.properties.avatar,
          followers: data.user.properties.followers,
          followings: data.user.properties.followings,
        },
        pictures: data.pictures.map((pic) => ({
          id: pic.properties.id,
          url: pic.properties.url,
          order: pic.properties.order,
        })),
      };
    });
  }

  /**
   * Get pictures for a post
   */
  async getPictures(postId: string): Promise<PictureProperties[]> {
    const query = `
      MATCH (post:post {id: $postId})-[:HAS_A]->(collection:collection)-[:HAS_A]->(picture:picture)
      RETURN collect(picture {.*}) as pictures
      ORDER BY picture.order
    `;

    const result = await this.executeRead<PicturesRecord>(query, { postId });
    const pictures = this.getValue<PicturesRecord['pictures']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'pictures'
    );

    return (pictures ?? []).map((pic) => ({
      id: pic.id,
      url: pic.url,
      order: pic.order,
    }));
  }

  /**
   * Create a new post
   */
  async create(userId: string, input: CreatePostInput): Promise<PostProperties> {
    const postId = `post_${Date.now()}`;

    const query = `
      MATCH (user:user {id: $userId})-[:IS_A]->(seller:seller)
      CREATE (post:post {
        id: $postId,
        title: $title,
        description: $description,
        price: $price,
        views: 0,
        likes: 0,
        createdAt: datetime().epochMillis
      })
      CREATE (seller)-[:HAS_A]->(post)
      ${input.categoryId ? 'WITH post MATCH (category:category {id: $categoryId}) CREATE (post)-[:OF_A]->(category)' : ''}
      RETURN post {.*} as post
    `;

    const params = {
      userId,
      postId,
      title: input.title,
      description: input.description || null,
      price: input.price,
      ...(input.categoryId && { categoryId: input.categoryId }),
    };

    const result = await this.executeWrite<PostRecord>(query, params);
    const postData = this.getValue<PostRecord['post']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'post'
    );

    if (!postData) {
      throw new Error('Failed to create post');
    }

    return {
      id: postData.id,
      title: postData.title,
      description: postData.description,
      price: postData.price,
      views: this.toNumber(postData.views),
      likes: this.toNumber(postData.likes),
      createdAt:
        typeof postData.createdAt === 'string' ? postData.createdAt : postData.createdAt.toString(),
    };
  }

  /**
   * Update post properties
   */
  async update(postId: string, input: UpdatePostInput): Promise<PostProperties> {
    const setFields: string[] = [];
    const params: Record<string, unknown> = { postId };

    if (input.title !== undefined) {
      setFields.push('post.title = $title');
      params.title = input.title;
    }
    if (input.description !== undefined) {
      setFields.push('post.description = $description');
      params.description = input.description;
    }
    if (input.price !== undefined) {
      setFields.push('post.price = $price');
      params.price = input.price;
    }

    if (setFields.length === 0) {
      return this.findByIdOrFail(postId);
    }

    const query = `
      MATCH (post:post {id: $postId})
      SET ${setFields.join(', ')}
      RETURN post {.*} as post
    `;

    const result = await this.executeWrite<PostRecord>(query, params);
    const postData = this.getValue<PostRecord['post']>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'post'
    );

    if (!postData) {
      throw new NotFoundError(`Post with ID ${postId} not found`);
    }

    return {
      id: postData.id,
      title: postData.title,
      description: postData.description,
      price: postData.price,
      views: this.toNumber(postData.views),
      likes: this.toNumber(postData.likes),
      createdAt:
        typeof postData.createdAt === 'string' ? postData.createdAt : postData.createdAt.toString(),
    };
  }

  /**
   * Delete post and all related data
   */
  async delete(postId: string): Promise<void> {
    const query = `
      MATCH (post:post {id: $postId})
      DETACH DELETE post
    `;

    await this.executeWrite(query, { postId });
  }

  /**
   * Toggle like on a post
   */
  async like(postId: string, userId: string): Promise<{ liked: boolean; totalLikes: number }> {
    const query = `
      MATCH (post:post {id: $postId}), (user:user {id: $userId})
      OPTIONAL MATCH (user)-[like:LIKED]->(post)
      WITH post, user, like,
           CASE WHEN like IS NULL THEN true ELSE false END as shouldLike
      FOREACH (_ IN CASE WHEN shouldLike THEN [1] ELSE [] END |
        CREATE (user)-[:LIKED]->(post)
        SET post.likes = post.likes + 1
      )
      FOREACH (_ IN CASE WHEN NOT shouldLike THEN [1] ELSE [] END |
        DELETE like
        SET post.likes = post.likes - 1
      )
      RETURN shouldLike as liked, post.likes as totalLikes
    `;

    const result = await this.executeWrite<LikeResultRecord>(query, { postId, userId });
    const data = this.getValue<{ liked: boolean; totalLikes: Integer }>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'liked'
    );

    if (!data) {
      throw new Error('Failed to toggle like');
    }

    const liked =
      this.getValue<boolean>(result as unknown as QueryResult<Record<string, unknown>>, 'liked') ??
      false;
    const totalLikes =
      this.getValue<Integer>(
        result as unknown as QueryResult<Record<string, unknown>>,
        'totalLikes'
      ) ?? 0;

    return {
      liked,
      totalLikes: this.toNumber(totalLikes),
    };
  }

  /**
   * Check if user has purchased a post
   */
  async checkUserPurchased(userId: string, postId: string): Promise<boolean> {
    const query = `
      MATCH (user:user {id: $userId})-[r:PURCHASED]->(post:post {id: $postId})
      RETURN count(r) > 0 as purchased
    `;

    const result = await this.executeRead<PurchasedRecord>(query, { userId, postId });
    return (
      this.getValue<boolean>(
        result as unknown as QueryResult<Record<string, unknown>>,
        'purchased'
      ) ?? false
    );
  }

  /**
   * Record post purchase
   */
  async recordPurchase(userId: string, postId: string): Promise<void> {
    const query = `
      MATCH (user:user {id: $userId}), (post:post {id: $postId})
      MERGE (user)-[:PURCHASED]->(post)
    `;

    await this.executeWrite(query, { userId, postId });
  }

  /**
   * Increment post views
   */
  async incrementViews(postId: string): Promise<void> {
    const query = `
      MATCH (post:post {id: $postId})
      SET post.views = post.views + 1
    `;

    await this.executeWrite(query, { postId });
  }

  /**
   * Get all categories
   */
  async findAllCategories(): Promise<CategoryProperties[]> {
    const query = `
      MATCH (category:category)
      RETURN category {.*} as category
      ORDER BY category.name
    `;

    const result = await this.executeRead<{ category: CategoryNodeProps }>(query, {});

    return result.records.map((record) => {
      const cat = record.get('category') as CategoryNodeProps;
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
      };
    });
  }

  /**
   * Find posts by seller ID
   */
  async findBySeller(sellerId: string): Promise<PostWithDetails[]> {
    const query = `
      MATCH (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)<-[:IS_A]-(user:user)
      WHERE user.id = $sellerId
      WITH post, collect(picture) AS pictures, user AS user,
           size((user)<-[:FOLLOWS]-()) as followers,
           size((user)-[:FOLLOWS]->()) as followings
      RETURN {
        post: post,
        user: user {.*, followers: followers, followings: followings},
        pictures: pictures
      } as data
      ORDER BY post.views DESC
    `;

    const result = await this.executeRead<PostWithUserRecord>(query, { sellerId });

    return result.records.map((record) => {
      const data = record.get('data') as PostWithUserRecord['data'];
      return {
        albumData: {
          id: data.post.properties.id,
          title: data.post.properties.title,
          description: data.post.properties.description,
          price: data.post.properties.price,
          views: this.toNumber(data.post.properties.views),
          likes: this.toNumber(data.post.properties.likes),
          createdAt:
            typeof data.post.properties.createdAt === 'string'
              ? data.post.properties.createdAt
              : data.post.properties.createdAt.toString(),
        },
        user: {
          id: data.user.properties.id,
          name: data.user.properties.name,
          email: data.user.properties.email,
          userName: data.user.properties.userName,
          avatar: data.user.properties.avatar,
          followers: data.user.properties.followers,
          followings: data.user.properties.followings,
        },
        pictures: data.pictures.map((pic) => ({
          id: pic.properties.id,
          url: pic.properties.url,
          order: pic.properties.order,
        })),
      };
    });
  }

  /**
   * Find all albums excluding a specific user
   */
  async findAllExcludingUser(userId: string): Promise<PostWithDetails[]> {
    const query = `
      MATCH (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)<-[:IS_A]-(user:user)
      WHERE user.id <> $userId
      WITH post, collect(picture) AS pictures, user AS user,
           size((user)<-[:FOLLOWS]-()) as followers,
           size((user)-[:FOLLOWS]->()) as followings
      RETURN {
        post: post,
        user: user {.*, followers: followers, followings: followings},
        pictures: pictures
      } as data
      ORDER BY post.views DESC
    `;

    const result = await this.executeRead<PostWithUserRecord>(query, { userId });

    return result.records.map((record) => {
      const data = record.get('data') as PostWithUserRecord['data'];
      return {
        albumData: {
          id: data.post.properties.id,
          title: data.post.properties.title,
          description: data.post.properties.description,
          price: data.post.properties.price,
          views: this.toNumber(data.post.properties.views),
          likes: this.toNumber(data.post.properties.likes),
          createdAt:
            typeof data.post.properties.createdAt === 'string'
              ? data.post.properties.createdAt
              : data.post.properties.createdAt.toString(),
        },
        user: {
          id: data.user.properties.id,
          name: data.user.properties.name,
          email: data.user.properties.email,
          userName: data.user.properties.userName,
          avatar: data.user.properties.avatar,
          followers: data.user.properties.followers,
          followings: data.user.properties.followings,
        },
        pictures: data.pictures.map((pic) => ({
          id: pic.properties.id,
          url: pic.properties.url,
          order: pic.properties.order,
        })),
      };
    });
  }

  /**
   * Get plan for a specific album
   */
  async getPlanForAlbum(
    albumId: string
  ): Promise<{ id: string; name: string; price: number; interval: string }> {
    const query = `
      MATCH (plan:plan)<-[:IS_OF]-(post:post {id: $albumId})
      RETURN plan {.*} as plan
    `;

    const result = await this.executeRead<{
      plan: { id: string; name: string; price: number; interval: string };
    }>(query, { albumId });
    const plan = this.getValue<{ id: string; name: string; price: number; interval: string }>(
      result as unknown as QueryResult<Record<string, unknown>>,
      'plan'
    );

    if (!plan) {
      throw new NotFoundError(`Plan for album ${albumId} not found`);
    }

    return plan;
  }
}
