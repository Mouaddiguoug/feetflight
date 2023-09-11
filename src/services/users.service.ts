import { hash } from 'bcrypt';
import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import { writeFile } from 'node:fs';
import { Buffer } from 'node:buffer';
import { isEmpty } from '@utils/util';
import { initializeDbConnection } from '@/app';
import { verify } from 'jsonwebtoken';
import path from 'node:path';
import Stripe from 'stripe';

class UserService {
  private stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });
  public prices = [];

  public async findUserById(userId) {
    const getUserSession = initializeDbConnection().session();
    try {
      const result = await getUserSession.executeRead(tx =>
        tx.run('match (u:user {id: $userId}) return u', {
          userId: userId,
        }),
      );

      if (!result.records.map(record => record.get('u').properties)) throw new HttpException(409, "User doesn't exist");

      return result.records.map(record => record.get('u').properties)[0];
    } catch (error) {
      console.log(error);
    } finally {
      getUserSession.close();
    }
  }

  public async changePassword(email, userData) {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');
    const hashedPassword = await hash(userData.data.password, 10);
    const changePasswordSession = initializeDbConnection().session();
    try {
      const updatedUser = await changePasswordSession.executeWrite(tx =>
        tx.run('match (u:user {email: $email}) set u.password: $password return u', {
          email: email,
          password: hashedPassword,
        }),
      );
      if (!updatedUser.records.map(record => record.get('u').properties)) throw new HttpException(409, "User doesn't exist");
      return updatedUser.records.map(record => record.get('u').properties);
    } catch (error) {
      console.log(error);
    } finally {
      changePasswordSession.close();
    }
  }

  public async emailConfirming(token) {
    const confirmEmailSession = initializeDbConnection().session();
    try {
      const tokenData: any = verify(token, process.env.EMAIL_SECRET);

      const checkConfirmation = await confirmEmailSession.executeRead(tx =>
        tx.run('match (u:user {id: $userId}) return u', {
          userId: tokenData.data,
        }),
      );

      if (checkConfirmation.records.map(record => record.get('u').properties.confirmed)[0]) return 'this account is already confirmed';

      const confirmed = await confirmEmailSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}) set u.confirmed = true return u', {
          userId: tokenData.data,
        }),
      );

      return confirmed.records.map(record => record.get('u').properties.confirmed)[0];
    } catch (error) {
      console.log(error);
    } finally {
      confirmEmailSession.close();
    }
  }

  public async updateUser(userId: string, userData: any): Promise<User[]> {
    const updateUserSession = initializeDbConnection().session();
    try {
      const existUser = await this.findUserById(userId);

      const updatedUser = await updateUserSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}) set u.name = $name, u.avatar = $avatar, u.username = $username,  return u', {
          userId: userId,
          name: userData.data.name ? userData.data.name : existUser.name,
          userName: userData.data.userName ? userData.data.userName : existUser.userName,
          avatar: userData.data.avatar ? userData.data.avatar : existUser.avatar,
        }),
      );

      return updatedUser.records.map(record => record.get('u').properties)[0];
    } catch (error) {
      console.log(error);
    } finally {
      updateUserSession.close();
    }
  }

  public async buyPosts(userId: string, saleData: any) {
    try {
      const pricesPromises = await saleData.data.posts.map(post => {
        return this.checkForSale(userId, post.id).then(exists => {
          if (exists) return null;
          return this.stripe.prices
            .list({
              product: post.id,
            })
            .then(price => {
              return { price: price.data[0].id, quantity: 1 };
            });
        });
      });

      const prices = await Promise.all(pricesPromises);

      if (prices.filter(price => price != null).length == 0) return { message: 'all posts selected have already been bought by this user' };

      const sellersPromises = await saleData.data.posts.map(post => {
        return this.stripe.products.retrieve(post.id).then(product => {
          return this.stripe.prices
            .list({
              product: post.id,
            })
            .then(price => {
              return { sellerId: product.metadata.sellerId, productId: post.id, amount: price.data[0].unit_amount };
            });
        });
      });

      const sellers = await Promise.all(sellersPromises);

      const session = await this.stripe.checkout.sessions.create({
        success_url: 'https://example.com/success',
        line_items: prices.filter(price => price != null),
        mode: 'payment',
        customer: userId,
        metadata: {
          sellersIds: sellers
            .map(record => {
              return `sellerId:${record.sellerId}.postId:${record.productId}.amount:${record.amount * 0.01}`;
            })
            .toString(),
        },
      });

      return { message: 'posts has been successfully bought', session };
    } catch (error) {
      console.log(error);
    }
  }

  public getSellersByPostId = async (postId: string) => {
    const getSellersByPostIdSession = initializeDbConnection().session();
    try {
      const sellers = await getSellersByPostIdSession.executeWrite(tx =>
        tx.run('match (p:post {id: $postId})-[:HAS_A]-(s:seller) return s', {
          postId: postId,
        }),
      );
      return sellers.records.map(record => record.get('s').properties);
    } catch (error) {
      console.log(error);
    } finally {
      getSellersByPostIdSession.close();
    }
  };

  public buyPost = async (postId: string, userId: string, sellerId: string, amount: number) => {
    const buyPostSession = initializeDbConnection().session();
    try {
      await this.stripe.transfers.create({
        currency: 'EUR',
        destination: sellerId,
        amount: amount,
      });
      await buyPostSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}), (s:seller)-[:HAS_A]->(p:post {id: $postId}) create (u)-[bought:BOUGHT_A]->(p)', {
          userId: userId,
          postId: postId,
        }),
      );
    } catch (error) {
      console.log(error);
    } finally {
      buyPostSession.close();
    }
  };

  public subscribe = async (userId: string, subscriptionData: any) => {
    try {
      if (await this.checkForSubscription(userId, subscriptionData.data.sellerId)) return { message: 'Already subscribed' };

      const session = await this.stripe.checkout.sessions.create({
        success_url: 'https://example.com/success',
        line_items: [{ price: subscriptionData.data.subscriptionPlanId, quantity: 1 }],
        mode: 'subscription',
        customer: userId,
        metadata: {
          sellerId: subscriptionData.data.sellerId,
          subscriptionPlanTitle: subscriptionData.data.subscriptionPlanTitle,
          subscriptionPlanPrice: subscriptionData.data.subscriptionPlanPrice,
        },
      });

      return { message: 'subscription added successfully', session };
    } catch (error) {
      console.log(error);
    }
  };

  public createSubscriptioninDb = async (userId: string, sellerId: string, subscriptionPlanTitle: string, subscriptionPlanPrice: number) => {
    const subscribeSession = initializeDbConnection().session();
    try {
      if (await this.checkForSubscription(userId, sellerId)) return { message: 'Already subscribed' };

      await subscribeSession.executeWrite(tx => {
        tx.run(
          'match (u:user {id: $userId}), (s:seller {id: $sellerId}) create (u)-[:SUBSCRIBED_TO {subscriptionPlanTitle: $subscriptionPlanTitle, subscriptionPlanPrice: $subscriptionPlanPrice}]->(s) return s',
          {
            userId: userId,
            sellerId: sellerId,
            subscriptionPlanTitle: subscriptionPlanTitle,
            subscriptionPlanPrice: subscriptionPlanPrice,
          },
        );
      });
    } catch (error) {
      console.log(error);
    } finally {
      subscribeSession.close();
    }
  };

  public cancelSubscription = async (userId: string, sellerId: string) => {

    const cancelSubscriptionSession = initializeDbConnection().session();
    try {
      if (!(await this.checkForSubscription(userId, sellerId))) return { message: 'no subscription' };

      await cancelSubscriptionSession.executeWrite(tx => {
        tx.run('match (u:user {id: $userId})-[sub:SUBSCRIBED_TO]->(s:seller {id: $sellerId}) detach delete sub', {
          userId: userId,
          sellerId: sellerId,
        });
      });
      return {message: 'subscription was canceled successfuly'};
    } catch (error) {
      console.log(error);
    } finally {
      cancelSubscriptionSession.close();
    }
  };

  public checkForSale = async (userId: string, postId: string) => {
    const checkForExistingRelationship = initializeDbConnection().session();
    try {
      const saleAlreadyExists = await checkForExistingRelationship.executeWrite(tx =>
        tx.run('match (u:user {id: $userId})-[bought:BOUGHT_A]->(p:post {id: $postId}) return bought', {
          userId: userId,
          postId: postId,
        }),
      );

      return saleAlreadyExists.records.map(record => record.get('bought')).length > 0 ? true : false;
    } catch (error) {
      console.log(error);
    } finally {
      checkForExistingRelationship.close();
    }
  };

  public checkForSubscription = async (userId: string, sellerId: string) => {
    const checkForSubscriptionSession = initializeDbConnection().session();
    try {
      const subscriptionAlreadyExist = await checkForSubscriptionSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId})-[subscribed:SUBSCRIBED_TO]->(s:seller {id: $sellerId}) return subscribed', {
          userId: userId,
          sellerId: sellerId,
        }),
      );

      return subscriptionAlreadyExist.records.map(record => record.get('subscribed')).length > 0 ? true : false;
    } catch (error) {
      console.log(error);
    } finally {
      checkForSubscriptionSession.close();
    }
  };

  public uploadAvatar = async (avatarData: any, userId: string) => {
    try {
      /* aws.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: 'us-east-2',
      });
      const filecontent = Buffer.from(avatarData.buffer, 'binary');
      const s3 = new aws.S3();

      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${avatarData.fieldname}avatar${userId}.${avatarData.mimetype.split('/')[1]}`,
        Body: filecontent,
      };

      s3.upload(params, (err, data) => {
        if (err) return console.log(err);
        this.uploadAvatarToDb(data.Location, userId);
      }); */

      const filecontent = Buffer.from(avatarData.buffer, 'binary');

      writeFile(
        path.join(__dirname, '../../public/files/avatars', `${avatarData.originalname.replace('.', '')}.mimetype.split("/")[1]}`),
        filecontent,
        err => {
          if (err) return console.log(err);
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  public uploadAvatarToDb = async (location: string, userId: string) => {
    const uploadAvatarToDbSession = initializeDbConnection().session();
    try {
      await uploadAvatarToDbSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}) set u.avatar = $avatar', {
          userId: userId,
          avatar: location,
        }),
      );
    } catch (error) {
      console.log(error);
    } finally {
      uploadAvatarToDbSession.close();
    }
  };

  public async desactivateUser(userId: number): Promise<User[]> {
    const desactivateUserSession = initializeDbConnection().session();
    try {
      const desactivatedUser = await desactivateUserSession.executeWrite(tx => tx.run('match (u:user {id: $userId}) set u.desactivated = true'));
      return desactivatedUser.records.map(record => record.get('u').properties)[0];
    } catch (error) {
      console.log(error);
    }
  }
}

export default UserService;
