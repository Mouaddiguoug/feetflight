import { initializeDbConnection } from '@/app';
import { uid } from 'uid';
import aws from 'aws-sdk';
import path from "path";
import moment from 'moment';
import { writeFile } from 'node:fs';
import { Buffer } from 'node:buffer';
import Stripe from 'stripe';
import NotificationService from './notification.service';
import { String } from 'aws-sdk/clients/codebuild';

class postService {
  private stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });
  private notificationsService = new NotificationService();

  public async getPopularAlbums(userId: String) {
    const popularPostsSessio = initializeDbConnection().session({ database: 'neo4j' });
    try {
      console.log(userId);
      
      const popularPosts = await popularPostsSessio.executeRead(tx =>
        tx.run(
          'match (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)-[:IS_A]-(user:user) where user.id <> $userId WITH post, collect(picture) AS pictures, user AS user return post{post, user, pictures} order by post.views DESC limit 20',
          {
            userId: userId
          }
        ),
      );

      return popularPosts.records.map(
        (record: any) =>
          record._fields.map((field: any) => {
            return {
              albumData: field.post.properties,
              user: field.user.properties,
              pictres: field.pictures.map(picture => {
                return picture.properties;
              }),
            };
          })[0],
      );
    } catch (error) {
      console.log(error);
    } finally {
      popularPostsSessio.close();
    }
  }

  public async getRandomAlbums(page: Number, userId: String) {
    const subscribedPostsSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const popularPosts = await subscribedPostsSession.executeRead(tx =>
        tx.run(
          'match (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)-[:IS_A]-(user:user) where user.id <> $userId WITH post, collect(picture) AS pictures, user AS user return post{post, user, pictures} order by post.likes DESC skip toInteger($skip) limit 20',
          {
            skip: Number(`${page}0`),
            userId: userId
          }
        ),
      );

      return popularPosts.records.map(
        (record: any) =>
          record._fields.map((field: any) => {
            return {
              albumData: field.post.properties,
              user: field.user.properties,
              pictres: field.pictures.map(picture => {
                return picture.properties;
              }),
            };
          })[0],
      );
    } catch (error) {
      console.log(error);
    } finally {
      subscribedPostsSession.close();
    }
  }

  public async getAlbumByCategory(categoryId: string) {
    const getAlbumsByCategorySession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const AlbumByCategory = await getAlbumsByCategorySession.executeRead(tx =>
        tx.run(
          'match (category {id: $categoryId})<-[:OF_A]-(post:post)-[:HAS_A]-(:seller)-[:IS_A]-(user:user) WITH post, user AS user return post{post, user} order by post.createdAt DESC ',
          {
            categoryId: categoryId,
          },
        ),
      );

      const albumPromise = AlbumByCategory.records.map(
        (record: any) =>
          record._fields.map(async (field: any) => {
            return {
              albumData: field.post.properties,
              user: field.user.properties,
              pictres: await this.getPostPictures(field.post.properties.id)
            };
          })[0],
      );

      const album = await Promise.all(albumPromise);

      return album;
    } catch (error) {
      console.log(error);
    } finally {
      getAlbumsByCategorySession.close();
    }
  }

  public async getCategories() {
    const recentCategoriesSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const categories = await recentCategoriesSession.executeRead(tx => tx.run('match (category:category) return category'));
      
      return categories.records.map(record => record.get('category').properties);
    } catch (error) {
      console.log(error);
    } finally {
      recentCategoriesSession.close();
    }
  }

  public async getAlbumPlan(albumId: String) {
    const getPostPlanSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const plan = await getPostPlanSession.executeRead(tx => tx.run('match (plan:plan)<-[IS_OF]-(p:post {id: $albumId}) return plan', {
        albumId: albumId
      }));
      
      return plan.records.map(record => record.get('plan').properties)[0];
    } catch (error) {
      console.log(error);
    } finally {
      getPostPlanSession.close();
    }
  }

  public async getAllAlbums(userId: String) {
    const getAllAlbumsSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const allAlbums = await getAllAlbumsSession.executeRead(tx =>
        tx.run(
          'match (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)-[:IS_A]-(user:user) where user.id <> $userId WITH post, collect(picture) AS pictures, user AS user return post{post, user, pictures} order by post.views DESC',
          {
            userId: userId
          }
        ),
      );

      return allAlbums.records.map(
        (record: any) =>
          record._fields.map((field: any) => {
            return {
              albumData: field.post.properties,
              user: field.user.properties,
              pictres: field.pictures.map(picture => {
                return picture.properties;
              }),
            };
          })[0],
      );
    } catch (error) {
      console.log(error);
    } finally {
      getAllAlbumsSession.close();
    }
  }

  public async getSellerAlbums(userId: String) {
    const getAllAlbumsSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const allAlbums = await getAllAlbumsSession.executeRead(tx =>
        tx.run(
          'match (picture:picture)<-[:HAS_A]-(:collection)<-[:HAS_A]-(post:post)<-[:HAS_A]-(s:seller)-[:IS_A]-(user:user) where user.id = $userId WITH post, collect(picture) AS pictures, user as user return post{post, user, pictures} order by post.views DESC',
          {
            userId: userId
          }
        ),
      );

      return allAlbums.records.map(
        (record: any) =>
          record._fields.map((field: any) => {
            return {
              albumData: field.post.properties,
              user: field.user.properties,
              pictres: field.pictures.map(picture => {
                return picture.properties;
              }),
            };
          })[0],
      );
    } catch (error) {
      console.log(error);
    } finally {
      getAllAlbumsSession.close();
    }
  }

  public async getPostPictures(postId: string) {
    const getPostPicturesSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const pictures = await getPostPicturesSession.executeWrite(tx =>
        tx.run('match (post {id: $postId})-[:HAS_A]->(collection)-[:HAS_A]->(pct:picture) return pct', {
          postId: postId,
        }),
      );

      return pictures.records.map(record => record.get('pct').properties);
    } catch (error) {
      console.log(error);
    } finally {
      getPostPicturesSession.close();
    }
  }

  public async UpdateViews(postId: string) {
    const updateViewsSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const newViews = await updateViewsSession.executeWrite(tx =>
        tx.run('match (p:post {id: $postId}) set p.views = p.views + 1 return p.views', {
          postId: postId,
        }),
      );
      return newViews.records[0]._fields[0].low;
    } catch (error) {
      console.log(error);
    } finally {
      updateViewsSession.close();
    }
  }

  public async createPost(userId: string, postData: any) {
    const createPostSession = initializeDbConnection().session({ database: 'neo4j' });
    const linkCategorySession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const findUser = await createPostSession.executeRead(tx => tx.run('match (u:user {id: $userId}) return u', { userId: userId }));
      if (findUser.records.length == 0) return { message: `This user doesn't exist` };
      if (!postData.data.postTitle || !postData.data.postDescription || !postData.data.price)
        return { message: `missing data` };
      const createdCollection = await createPostSession.executeWrite(tx =>
        tx.run(
          'match (u:user {id: $userId})-[IS_A]-(s:seller)-[:HAS_A]-(plan:plan {id: $planId}) create (s)-[h: HAS_A]->(p:post {id: $postId, description: $description, title: $title, price: $price, createdAt: $createdAt, views: 0, likes: 0, categoryId: $categoryId})-[:HAS_A]->(c:collection {id: $collectionId}) create (p)-[:IS_OF]->(plan) return c, p, u, s',
          {
            userId: userId,
            postId: uid(40),
            createdAt: moment().format('MMMM DD, YYYY'),
            title: postData.data.postTitle,
            description: postData.data.postDescription,
            price: postData.data.price,
            collectionId: uid(40),
            planId: postData.data.planId,
            categoryId: postData.data.categoryId,
          },
        ),
      );
      
      await this.stripe.products.create({
        id: createdCollection.records.map(record => record.get('p').properties.id)[0],
        name: postData.data.postTitle,
        metadata: {
          sellerId: createdCollection.records.map(record => record.get('s').properties.id)[0].toString(),
        },
        description: postData.data.postDescription,
        default_price_data: {
          currency: 'EUR',
          unit_amount: postData.data.price * 100,
        },
      });

      await linkCategorySession.executeWrite(tx =>
        tx.run('match (ca:category {id: $categoryId}), (p:post {id: $postId}) create (p)-[:OF_A]->(ca)', {
          postId: createdCollection.records.map(record => record.get('p').properties.id)[0],
          categoryId: postData.data.categoryId,
        }),
      );

      return {
        post: createdCollection.records.map(record => record.get('p').properties)[0],
        collection: createdCollection.records.map(record => record.get('c').properties)[0],
      };
    } catch (error) {
      console.log(error);
    } finally {
      createPostSession.close();
      linkCategorySession.close();
    }
  }

  public async likePost(albumId: string, userId: string) {
    const likePostSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const data = await likePostSession.executeWrite(tx =>
        tx.run('match (p:post {id: $postId})<-[:HAS_A]-(seller:seller), (user:user {id: $userId}) create (user)-[:liked]->(p) set p.likes = p.likes + 1 return seller, user', {
          postId: albumId,
          userId: userId
        }),
      );
      
      const sellerId = data.records.map(record => record.get("seller").properties.id)[0];
      const name = data.records.map(record => record.get("user").properties.name)[0];
      const title = "Like";
      const body = `${name} just liked your post`;

      this.notificationsService.pushSellerNotificatons(sellerId, title, body);
    } catch (error) {
      console.log(error);
    } finally {
      likePostSession.close();
    }
  }

  public async uploadPostPictures(pictureFiles: any, collectionId: string) {
    const createPicturesSession = initializeDbConnection().session({ database: 'neo4j' });

    try {
      for (let key in pictureFiles) {
        const filecontent = Buffer.from(pictureFiles[key].buffer, 'binary');
        
        writeFile(path.join(__dirname, "../../public/files/albums", `${pictureFiles[key].fieldname.replace(".", "")}${collectionId}${moment().format("ssMMyyyy")}.${pictureFiles[key].mimetype.split("/")[1]}`), filecontent, async (err) => {
          if (err) return console.log(err);
          await this.createPictures(pictureFiles[key].fieldname, `/public/files/albums/${pictureFiles[key].fieldname.replace(".", "")}${collectionId}${moment().format("ssMMyyyy")}.${pictureFiles[key].mimetype.split("/")[1]}`, collectionId);
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      createPicturesSession.close();
    }
  }

  public async createPictures(pictureDescription: string, value: string, collectionId: string) {
    const createPicturesSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      await createPicturesSession.executeWrite(tx =>
        tx.run(
          'match (c:collection {id: $collectionId}) create (c)-[r: HAS_A]->(p: picture {id: $pictureId, value: $value, description: $description})',
          {
            description: pictureDescription,
            pictureId: uid(40),
            value: value,
            collectionId: collectionId,
          },
        ),
      );
    } catch (error) {
      console.log(error);
    } finally {
      createPicturesSession.close();
    }
  }
}

export default postService;
