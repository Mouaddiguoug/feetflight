import { initializeDbConnection } from '@/app';
import { uid } from 'uid';
import aws from 'aws-sdk';
import moment from 'moment';

class postService {
  public async getPopularPosts(categoryId) {
    const popularPostsSessio = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const popularPosts = await popularPostsSessio.executeRead(tx =>
        tx.run(
          'match (category {id: $categoryId})<-[:OF_A]-(p:post)<-[:HAS_A]-(s:seller)-[:IS_A]-(u:user) return u ,p order by p.views DESC limit 20',
          {
            categoryId: categoryId,
          },
        ),
      );

      console.log(categoryId);

      const posts = popularPosts.records.map(record => record.get('p').properties);

      posts.map((post, i) => {
        const user = popularPosts.records.map(record => record.get('u').properties)[i];
        post['user'] = user;
        return post;
      });
      return posts;
    } catch (error) {
      console.log(error);
    } finally {
      popularPostsSessio.close();
    }
  }

  public async getRecentPosts(categoryId) {
    const recentPostsSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const popularPosts = await recentPostsSession.executeRead(tx =>
        tx.run(
          'match (category {id: $categoryId})<-[:OF_A]-(p:post)-[:HAS_A]-(s:seller)-[:IS_A]-(u:user) return u, p order by p.createdAt DESC limit 20',
          {
            categoryId: categoryId,
          },
        ),
      );
      const posts = popularPosts.records.map(record => record.get('p').properties);
      posts.map((post, i) => {
        const user = popularPosts.records.map(record => record.get('u').properties)[i];
        return (post['user'] = user);
      });
      return posts;
    } catch (error) {
      console.log(error);
    } finally {
      recentPostsSession.close();
    }
  }

  public async getPostPictures(postId) {
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

  public async UpdateViews(postId) {
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

  public async createPost(userId, postData) {
    const createPostSession = initializeDbConnection().session({ database: 'neo4j' });
    const linkCategorySession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const findUser = await createPostSession.executeRead(tx => tx.run('match (u:user {id: $userId}) return u', { userId: userId }));
      if (findUser.records.length == 0) return { message: `This user doesn't exist` };
      if (!postData.data.postTitle || !postData.data.postDescription || !postData.data.price || !postData.data.preview || !postData.data.pictures)
        return { message: `missing data` };
      const createdCollection = await createPostSession.executeWrite(tx =>
        tx.run(
          'match (u:user {id: $userId})-[IS_A]-(s:seller) create (s)-[h: HAS_A]->(p:post {id: $postId, description: $description, title: $title, price: $price, createdAt: $createdAt, views: 0, likes: 0})-[:HAS_A]->(c:collection {id: $collectionId, preview: $preview}) return c, p',
          {
            userId: userId,
            postId: uid(40),
            createdAt: moment().format('MMMM DD, YYYY'),
            title: postData.data.postTitle,
            description: postData.data.postDescription,
            price: postData.data.price,
            collectionId: uid(40),
            preview: postData.data.preview,
          },
        ),
      );

      postData.data.pictures.map(picture => {
        aws.config.update({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: 'us-east-2',
        });
        const filecontent = Buffer.from(picture.value, 'binary');
        const s3 = new aws.S3();

        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: picture.description,
          Body: filecontent,
        };

        s3.upload(params, (err, data) => {
          if (err) return console.log(err);
          this.createPictures(picture.description, data.Location, createdCollection.records.map(record => record.get('c').properties.id)[0]);
        });
      });

      await linkCategorySession.executeWrite(tx =>
        tx.run('match (ca:category {id: $categoryId}), (p:post {id: $postId}) create (p)-[:OF_A]->(ca)', {
          postId: createdCollection.records.map(record => record.get('p').properties.id)[0],
          categoryId: postData.data.categoryId,
        }),
      );

      return createdCollection.records.map(record => record.get('p').properties)[0];
    } catch (error) {
      console.log(error);
    } finally {
      createPostSession.close();
      linkCategorySession.close();
    }
  }

  public async likePost(postId) {
    const likePostSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const likes = await likePostSession.executeWrite(tx =>
        tx.run('match (p:post {id: $postId}) set p.likes = p.likes + 1 return p', {
          postId: postId,
        }),
      );

      return likes.records.map(record => record.get('p').properties.likes.low)[0];
    } catch (error) {
      console.log(error);
    } finally {
      likePostSession.close();
    }
  }

  public async createPictures(pictureDescription, value, collectionId) {
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
