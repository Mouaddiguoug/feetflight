import { hash } from 'bcrypt';
import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import { writeFile } from 'node:fs';
import { Buffer } from 'node:buffer';
import { isEmpty } from '@utils/util';
import otpGenerator from "otp-generator";
import admin from "firebase-admin";
import crypto from "crypto";
import { RolesEnum } from '@/enums/RolesEnums';
import { transporter } from '@/app';
import { initializeDbConnection, stripe } from '@/app';
import { verify } from 'jsonwebtoken';
import path from 'node:path';
import OpenAi from 'openai';
import AuthService from './auth.service';

class UserService {
  public prices = [];
  public authService = new AuthService();

  public async findUserById(userId) {
    const getUserSession = initializeDbConnection().session();
    try {
      const result = await getUserSession.executeRead(tx =>
        tx.run('match (u:user {id: $userId}) return u', {
          userId: userId,
        }),
      );

      if (result.records.length == 0) throw new HttpException(409, "User doesn't exist");

      return result.records.map(record => record.get('u').properties)[0];
    } catch (error) {
      console.log(error);
    } finally {
      getUserSession.close();
    }
  }

  public async generateAiPictures(color: String, category: String) {
    const getUserSession = initializeDbConnection().session();
    try {

      const openai = new OpenAi({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const result = await openai.images.generate({
        prompt: `attractive feet with ${color} nailpolish and ${category}`,
        n: 5,
        size: "256x256",
      })

      return result.data
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

      console.log(tokenData, token);

      const checkConfirmation = await confirmEmailSession.executeRead(tx =>
        tx.run('match (u:user {id: $userId}) return u', {
          userId: tokenData.id,
        }),
      );

      if (checkConfirmation.records.map(record => record.get('u').properties.confirmed)[0]) return 'this account is already confirmed';

      const confirmed = await confirmEmailSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}) set u.confirmed = true return u', {
          userId: tokenData.id,
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
        tx.run('match (u:user {id: $userId}) set u.name = $name, u.userName = $userName return u', {
          userId: userId,
          name: userData.data.name ? userData.data.name : existUser.name,
          userName: userData.data.userName ? userData.data.userName : existUser.userName,
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
          return stripe.prices
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
        return stripe.products.retrieve(post.id).then(product => {
          return stripe.prices
            .list({
              product: post.id,
            })
            .then(price => {
              return { sellerId: product.metadata.sellerId, productId: post.id, amount: price.data[0].unit_amount };
            });
        });
      });

      const sellers = await Promise.all(sellersPromises);

      const session = await stripe.checkout.sessions.create({
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

      return session.url;
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

  public generateOtp = async (email: string) => {
    try {
      const otp = otpGenerator.generate(4, {
        digits: true,
        specialChars: false,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false
      });

      const timeLeft = 2 * 60 * 1000;
      const expiresIn = Date.now() + timeLeft;
      const data = `${email}.${otp}.${expiresIn}`;
      const hash = crypto.createHmac("sha256", process.env.SECRET_KEY).update(data).digest("hex");
      const secondLayer = `${hash}.${expiresIn}`;


      const to = email;

      const mailOptions = {
        html: `<div<h1>Feetflight</h1><br><br><h3>Hello again</h3><br><p>We have received a request to change the password associated with your account. As part of our security measures, we have generated an OTP to verify your identity for this action.</p><br><p>Your OTP is: ${otp}</p><br><p>Please ensure that you use the OTP within the next 2 minutes.</p><br><p>Best regards,</p><br><p>Feetflight,</p></div>`,
        from: process.env.USER_EMAIL,
        to: to,
        subject: 'otp Verification Email',
        context: {
          otp: otp,
        },
      };

      transporter.sendMail(mailOptions, (error: any, data: any) => {
        if (error) console.log(error);
        if (!error) console.log('sent');
      });

      return secondLayer;
    } catch (error) {
      console.log(error);
    }
  };

  public verifyOtp = async (otpSettings: any, email: string) => {
    try {
      const getUserByEmailSession = initializeDbConnection().session();
      const [hashedValue, expiresIn] = otpSettings.hash.split(".");

      let now = Date.now();

      if (now > parseInt(expiresIn)) return { "message": "otp was expired" };

      const data = `${email}.${otpSettings.otp}.${expiresIn}`;
      const hash = crypto.createHmac("sha256", process.env.SECRET_KEY).update(data).digest("hex");

      const secondLayer = `${hash}.${expiresIn}`;

      if (hash != hashedValue) return { message: "Invalid otp" };

      const user = await getUserByEmailSession.executeRead(tx => tx.run("match (u:user {email: $email})-[:IS_A]->(b:buyer) return u, b", {
        email: email
      }));

      const tokenData = this.authService.createToken(process.env.EMAIL_SECRET, user.records.map(record => record.get('u').properties.id)[0])

      return { message: "success", tokenData, data: user.records.map(record => record.get('u').properties)[0], role: user.records.map(record => record.get('b').properties).length == 0 ? "Seller" : "Buyer" }
    } catch (error) {
      console.log(error);

    }

  }

  public buyPost = async (postId: string, userId: string, sellerId: string, amount: number) => {
    const buyPostSession = initializeDbConnection().session();
    try {
      await buyPostSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}), (p:post {id: $postId}) create (u)-[bought:BOUGHT_A]->(p) return bought', {
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

    const getSellerIdSession = initializeDbConnection().session();

    try {

      const seller = await getSellerIdSession.executeWrite(tx =>
        tx.run('match (user {id: $userId})-[:IS_A]-(s:seller) return s', {
          userId: subscriptionData.data.sellerId,
        }),
      );

      const sellerId = seller.records.map(record => record.get("s").properties.id)[0];

      if (await this.checkForSubscription(userId, sellerId, subscriptionData.data.subscriptionPlanTitle)) return { message: 'Already subscribed' };

      const session = await stripe.checkout.sessions.create({
        success_url: 'https://example.com/success',
        line_items: [{ price: subscriptionData.data.subscriptionPlanId, quantity: 1 }],
        mode: 'subscription',
        currency: "EUR",
        customer: userId,
        metadata: {
          sellerId: sellerId,
          subscriptionPlanTitle: subscriptionData.data.subscriptionPlanTitle,
          subscriptionPlanPrice: subscriptionData.data.subscriptionPlanPrice,
        },
      });

      return session;
    } catch (error) {
      console.log(error);
    }
  };

  public unlockSentPicture = async (userId: string, unlockSentPictureData: any) => {

    const getSellerIdSession = initializeDbConnection().session();

    try {
      const seller = await getSellerIdSession.executeWrite(tx =>
        tx.run('match (user {id: $userId})-[:IS_A]-(s:seller) return s', {
          userId: userId,
        }),
      );

      const sellerId = seller.records.map(record => record.get("s").properties.id)[0];
      const price = await stripe.prices
        .list({
          product: unlockSentPictureData.pictureId,
        })
        .then(price => {
          return { price: price.data[0].id, quantity: 1 };
        });

      console.log(unlockSentPictureData.chatRoomId);

      const session = await stripe.checkout.sessions.create({
        success_url: 'https://example.com/success',
        line_items: [price],
        mode: 'payment',
        customer: userId,
        metadata: {
          sellerId: sellerId,
          messageId: unlockSentPictureData.messageId,
          pictureId: unlockSentPictureData.pictureId,
          amount: unlockSentPictureData.tipAmount,
          chatRoomId: unlockSentPictureData.chatRoomId,
          comingFrom: "sentPicturePayment"
        },
      });

      return session.url;
    } catch (error) {
      console.log(error);
    } finally {
      getSellerIdSession.close();
    }
  };

  public signOut = async (userId: string) => {
    const signOutSession = initializeDbConnection().session();
    try {

      const signedOutData = await signOutSession.executeWrite(tx => {
        tx.run(
          'match (d:deviceToken)<-[:logged_in_with]-(u:user {id: $userId}) detach delete dreturn true',
          {
            userId: userId,
          },
        );
      });

      console.log(signedOutData);
       

    } catch (error) {
      console.log(error);
    } finally {
      signOutSession.close();
    }
  };
  

  public createSubscriptioninDb = async (userId: string, sellerId: string, subscriptionPlanTitle: string, subscriptionPlanPrice: number) => {
    const subscribeSession = initializeDbConnection().session();
    try {
      if (await this.checkForSubscription(userId, sellerId, subscriptionPlanTitle)) return { message: 'Already subscribed' };

      await subscribeSession.executeWrite(tx => {
        tx.run(
          'match (u:user {id: $userId}), (s:seller {id: $sellerId})<-[:IS_A]-(user:user) create (u)-[:SUBSCRIBED_TO {subscriptionPlanTitle: $subscriptionPlanTitle, subscriptionPlanPrice: $subscriptionPlanPrice}]->(s) set user.followers = user.followers + 1 set u.followings = u.followings + 1 return s',
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

  /* public cancelSubscription = async (userId: string, sellerId: string) => {

    const cancelSubscriptionSession = initializeDbConnection().session();
    try {
      if (!(await this.checkForSubscription(userId, sellerId, ))) return { message: 'no subscription' };

      await cancelSubscriptionSession.executeWrite(tx => {
        tx.run('match (u:user {id: $userId})-[sub:SUBSCRIBED_TO]->(s:seller {id: $sellerId}) detach delete sub', {
          userId: userId,
          sellerId: sellerId,
        });
      });
      return { message: 'subscription was canceled successfuly' };
    } catch (error) {
      console.log(error);
    } finally {
      cancelSubscriptionSession.close();
    }
  }; */

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

  public getSellerPlans = async (userId: string) => {
    const getSellerPlansSession = initializeDbConnection().session();
    try {
      const sellerPlan = await getSellerPlansSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId})-[:IS_A]-(seller)-[:HAS_A]-(plan:plan) return plan', {
          userId: userId,
        }),
      );

      return sellerPlan.records.map(record => record.get('plan').properties);
    } catch (error) {
      console.log(error);
    } finally {
      getSellerPlansSession.close();
    }
  };

  public checkForSubscription = async (userId: string, sellerId: string, plan: string) => {
    const checkForSubscriptionSession = initializeDbConnection().session();
    try {
      const subscriptionAlreadyExist = await checkForSubscriptionSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId})-[subscribed:SUBSCRIBED_TO {subscriptionPlanTitle: $plan}]->(s:seller {id: $sellerId}) return subscribed', {
          userId: userId,
          sellerId: sellerId,
          plan: plan
        }),
      );

      return subscriptionAlreadyExist.records.map(record => record.get('subscribed')).length > 0 ? true : false;;
    } catch (error) {
      console.log(error);
    } finally {
      checkForSubscriptionSession.close();
    }
  };

  public checkForSubscriptionbyUserId = async (userId: string, postId: string, plan: string) => {
    const checkForSubscriptionSession = initializeDbConnection().session();
    try {

      const subscriptionAlreadyExist = await checkForSubscriptionSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId})-[subscribed:SUBSCRIBED_TO {subscriptionPlanTitle: $plan}]->(s:seller)-[:HAS_A]->(p:post {id: $postId}) return subscribed', {
          userId: userId,
          postId: postId,
          plan: plan
        }),
      );


      return subscriptionAlreadyExist.records.map(record => record.get('subscribed')).length > 0 ? true : false;
    } catch (error) {
      console.log(error);
    } finally {
      checkForSubscriptionSession.close();
    }
  };

  public getFollowedSellers = async (userId: string, role: string) => {
    const getFollowedSellersession = initializeDbConnection().session();
    try {

      const followedSellers = role == RolesEnum.BUYER ? await getFollowedSellersession.executeRead(tx =>
        tx.run('match (u:user {id: $userId})-[:SUBSCRIBED_TO]->(s:seller) match (seller {id: s.id})<-[:IS_A]-(user:user) return user', {
          userId: userId,
        }),
      ) : await getFollowedSellersession.executeRead(tx =>
        tx.run('match (sellerUser:user {id: $userId})-[:IS_A]->(seller)<-[:SUBSCRIBED_TO]-(buyerUser:user) return buyerUser', {
          userId: userId,
        }),
      );

      return role == RolesEnum.BUYER ? followedSellers.records.map(record => record.get('user').properties) : followedSellers.records.map(record => record.get('buyerUser').properties);
    } catch (error) {
      console.log(error);
    } finally {
      getFollowedSellersession.close();
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

      console.log(filecontent);


      writeFile(
        path.join(__dirname, '../../public/files/avatars', `avatar${userId}.${avatarData.mimetype.split("/")[1]}`),
        filecontent,
        async err => {
          if (err) return console.log(err);
          await this.uploadAvatarToDb(`/public/files/avatars/avatar${userId}.${avatarData.mimetype.split("/")[1]}`, userId);
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

  public async uploadDeviceToken(userId: string, token: string): Promise<void> {
    const uploadDeviceTokenSession = initializeDbConnection().session();
    try {
      await uploadDeviceTokenSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}) create (u)-[:GOT_DEVICE]->(:device {token: $token})', {
          userId: userId,
          token: token,
        }),
      );
    } catch (error) {
      console.log(error);
    } finally {
      uploadDeviceTokenSession.close();
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
