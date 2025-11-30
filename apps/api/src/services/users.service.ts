/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { hash } from 'bcrypt';
import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import otpGenerator from 'otp-generator';
import crypto from 'crypto';
import { RolesEnum } from '@/enums/RolesEnums';
import path from 'node:path';
import OpenAi from 'openai';
import { render } from '@react-email/render';
import type { Resend } from 'resend';
import type Stripe from 'stripe';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/plugins/error.plugin';
import { VerifyOtpTemplate } from '@/emails/verify-otp';
import pino from 'pino';
import { Tneo4j } from '@/plugins/neo4j.plugin';
import { UserRepository } from '@/domain/repositories/user.repository';
import type { UserDataResponse } from '@feetflight/shared-types';

/**
 * Helper function to convert Neo4j Integer to string or number
 */
function convertInteger(value: unknown): string | number {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as any).toNumber();
  }
  return String(value);
}

/**
 * JWT Payload Interface (matches auth.plugin.ts)
 */
export interface JWTPayload {
  id: string;
  refresh?: boolean;
  email?: boolean;
}

export interface TokenData {
  token: string;
  expiresIn: string;
  maxAgeSeconds: number;
}

export interface UserServiceDeps {
  auth: {
    signAccessToken: (userId: string) => Promise<TokenData>;
    signRefreshToken: (userId: string) => Promise<TokenData>;
    signEmailToken: (userId: string) => Promise<TokenData>;
    createCookie: (tokenData: TokenData) => string;
    emailJwt: {
      verify: (token: string) => Promise<JWTPayload | null>;
    };
  };
  neo4j: Tneo4j;
  log: pino.Logger;
  stripe?: Stripe;
  resend?: Resend;
}

export async function findUserById(
  userId: string,
  deps: UserServiceDeps
): Promise<UserDataResponse> {
  const userRepo = new UserRepository({ neo4j: deps.neo4j, log: deps.log });

  try {
    const user = await userRepo.findByIdOrFail(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      userName: user.userName,
      avatar: user.avatar,
      confirmed: user.confirmed,
      verified: user.verified,
      desactivated: user.desactivated,
      createdAt: String(convertInteger(user.createdAt)),
      followers: user.followers,
      followings: user.followings,
      phone: user.phone,
    };
  } catch (error) {
    deps.log?.error({ error, userId }, 'Find user by ID failed');
    throw error instanceof NotFoundError ? error : new InternalServerError('Failed to find user');
  }
}

export async function generateAiPictures(
  color: string,
  category: string,
  deps: UserServiceDeps
): Promise<any> {
  try {
    const openai = new OpenAi({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const result = await openai.images.generate({
      prompt: `attractive feet with ${color} nailpolish and ${category}`,
      n: 5,
      size: '256x256',
    });

    return result.data;
  } catch (error) {
    deps.log?.error({ error, color, category }, 'AI picture generation failed');
    throw new InternalServerError('Failed to generate AI pictures');
  }
}

export async function changePassword(
  email: string,
  userData: any,
  deps: UserServiceDeps,
  requesterId?: string
): Promise<UserDataResponse> {
  const userRepo = new UserRepository({ neo4j: deps.neo4j, log: deps.log });

  try {
    if (!userData?.data) {
      throw new BadRequestError('userData is empty');
    }

    // Find user by email
    const user = await userRepo.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate ownership if requesterId is provided
    if (requesterId && user.id !== requesterId) {
      throw new ForbiddenError('You are not authorized to change this password');
    }

    // Hash new password
    const hashedPassword = await hash(userData.data.password, 10);

    // Update password using repository
    const updatedUser = await userRepo.update(user.id, { password: hashedPassword });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      userName: updatedUser.userName,
      avatar: updatedUser.avatar,
      confirmed: updatedUser.confirmed,
      verified: updatedUser.verified,
      desactivated: updatedUser.desactivated,
      createdAt: String(convertInteger(updatedUser.createdAt)),
      followers: updatedUser.followers,
      followings: updatedUser.followings,
      phone: updatedUser.phone,
    };
  } catch (error) {
    deps.log?.error({ error, email }, 'Change password failed');
    if (
      error instanceof BadRequestError ||
      error instanceof NotFoundError ||
      error instanceof ForbiddenError
    ) {
      throw error;
    }
    throw new InternalServerError('Failed to change password');
  }
}

export async function emailConfirming(token: string, deps: UserServiceDeps): Promise<any> {
  try {
    const tokenData = deps.auth.emailJwt.verify(token);

    return await deps.neo4j.withSession(async (session) => {
      const jwtPayloadData = await tokenData;
      const checkConfirmation = await session.executeRead((tx) =>
        tx.run('match (u:user {id: $userId}) return u', {
          userId: jwtPayloadData?.id,
        })
      );

      if (checkConfirmation.records.map((record) => record.get('u').properties.confirmed)[0]) {
        throw new BadRequestError('This account is already confirmed');
      }

      const confirmed = await session.executeWrite((tx) =>
        tx.run('match (u:user {id: $userId}) set u.confirmed = true return u', {
          userId: jwtPayloadData?.id,
        })
      );

      return confirmed.records.map((record) => record.get('u').properties.confirmed)[0];
    });
  } catch (error) {
    deps.log?.error({ error, token }, 'Email confirmation failed');
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new InternalServerError('Failed to confirm email');
  }
}

export async function updateUser(
  userId: string,
  userData: any,
  deps: UserServiceDeps
): Promise<any> {
  try {
    const existUser = await findUserById(userId, deps);

    return await deps.neo4j.withSession(async (session) => {
      const updatedUser = await session.executeWrite((tx) =>
        tx.run('match (u:user {id: $userId}) set u.name = $name, u.userName = $userName return u', {
          userId: userId,
          name: userData.data.name ? userData.data.name : existUser.name,
          userName: userData.data.userName ? userData.data.userName : existUser.userName,
        })
      );

      return updatedUser.records.map((record) => record.get('u').properties)[0];
    });
  } catch (error) {
    deps.log?.error({ error, userId }, 'Update user failed');
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new InternalServerError('Failed to update user');
  }
}

export async function buyPosts(
  userId: string,
  saleData: any,
  deps: UserServiceDeps
): Promise<string> {
  if (!deps.stripe) {
    throw new InternalServerError('Stripe is not configured');
  }

  try {
    const pricesPromises = await saleData.data.posts.map((post: { id: string }) => {
      return checkForSale(userId, post.id, deps).then((exists) => {
        if (exists) return null;
        return deps.stripe?.prices
          .list({
            product: post.id,
          })
          .then((price) => {
            return { price: price.data[0]?.id, quantity: 1 };
          });
      });
    });

    const prices = await Promise.all(pricesPromises);

    if (prices.filter((price) => price != null).length === 0) {
      throw new ConflictError('All posts selected have already been bought by this user');
    }

    const sellersPromises = await saleData.data.posts.map((post: { id: string }) => {
      return deps?.stripe?.products.retrieve(post.id).then((product) => {
        return deps?.stripe?.prices
          .list({
            product: post.id,
          })
          .then((price) => {
            return {
              sellerId: product.metadata.sellerId,
              productId: post.id,
              amount: price.data[0]?.unit_amount,
            };
          });
      });
    });

    const sellers = await Promise.all(sellersPromises);

    const session = await deps.stripe.checkout.sessions.create({
      success_url: process.env.STRIPE_SUCCESS_URL || 'https://example.com/success',
      line_items: prices.filter((price) => price != null),
      mode: 'payment',
      customer: userId,
      metadata: {
        sellersIds: sellers
          .map((record) => {
            return `sellerId:${record.sellerId}.postId:${record.productId}.amount:${record.amount * 0.01}`;
          })
          .toString(),
      },
    });

    return session.url!;
  } catch (error) {
    deps.log?.error({ error, userId }, 'Buy posts failed');
    if (error instanceof ConflictError) {
      throw error;
    }
    throw new InternalServerError('Failed to create checkout session');
  }
}

export async function getSellersByPostId(postId: string, deps: UserServiceDeps): Promise<any> {
  try {
    return await deps.neo4j.withSession(async (session) => {
      const sellers = await session.executeWrite((tx) =>
        tx.run('match (p:post {id: $postId})-[:HAS_A]-(s:seller) return s', {
          postId: postId,
        })
      );
      return sellers.records.map((record) => record.get('s').properties);
    });
  } catch (error) {
    deps.log?.error({ error, postId }, 'Get sellers by post ID failed');
    throw new InternalServerError('Failed to get sellers');
  }
}

export async function generateOtp(email: string, deps: UserServiceDeps): Promise<string> {
  if (!deps.resend) {
    throw new InternalServerError('Resend is not configured');
  }

  try {
    const otp = otpGenerator.generate(4, {
      digits: true,
      specialChars: false,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
    });

    const timeLeft = 2 * 60 * 1000;
    const expiresIn = Date.now() + timeLeft;
    const data = `${email}.${otp}.${expiresIn}`;
    const hashValue = crypto
      .createHmac('sha256', process.env.SECRET_KEY!)
      .update(data)
      .digest('hex');
    const secondLayer = `${hashValue}.${expiresIn}`;

    const html = await render(VerifyOtpTemplate({ otp }));

    await deps.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      subject: 'OTP Verification Email',
      html,
    });

    deps.log?.info({ email }, 'OTP email sent successfully');

    return secondLayer;
  } catch (error) {
    deps.log?.error({ error, email }, 'Generate OTP failed');
    throw new InternalServerError('Failed to generate and send OTP');
  }
}

export async function verifyOtp(
  otpSettings: any,
  email: string,
  deps: UserServiceDeps
): Promise<any> {
  try {
    const [hashedValue, expiresIn] = otpSettings.hash.split('.');

    const now = Date.now();

    if (now > parseInt(expiresIn)) {
      throw new BadRequestError('OTP has expired');
    }

    const data = `${email}.${otpSettings.otp}.${expiresIn}`;
    const hashValue = crypto
      .createHmac('sha256', process.env.SECRET_KEY!)
      .update(data)
      .digest('hex');

    if (hashValue !== hashedValue) {
      throw new BadRequestError('Invalid OTP');
    }

    return await deps.neo4j.withSession(async (session) => {
      const user = await session.executeRead((tx) =>
        tx.run('match (u:user {email: $email})-[:IS_A]->(b:buyer) return u, b', {
          email: email,
        })
      );

      const tokenData = await deps.auth.signAccessToken(
        user.records.map((record) => record.get('u').properties.id)[0]
      );

      return {
        message: 'success',
        tokenData,
        data: user.records.map((record) => record.get('u').properties)[0],
        role:
          user.records.map((record) => record.get('b').properties).length === 0
            ? 'Seller'
            : 'Buyer',
      };
    });
  } catch (error) {
    deps.log?.error({ error, email }, 'Verify OTP failed');
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new InternalServerError('Failed to verify OTP');
  }
}

export async function buyPost(
  postId: string,
  userId: string,
  deps: UserServiceDeps
): Promise<void> {
  try {
    await deps.neo4j.withSession(async (session) => {
      await session.executeWrite((tx) =>
        tx.run(
          'match (u:user {id: $userId}), (p:post {id: $postId}) create (u)-[bought:BOUGHT_A]->(p) return bought',
          {
            userId: userId,
            postId: postId,
          }
        )
      );
    });
  } catch (error) {
    deps.log?.error({ error, postId, userId }, 'Buy post failed');
    throw new InternalServerError('Failed to buy post');
  }
}

export async function subscribe(
  userId: string,
  subscriptionData: any,
  deps: UserServiceDeps
): Promise<any> {
  if (!deps.stripe) {
    throw new InternalServerError('Stripe is not configured');
  }

  try {
    const sellerId = await deps.neo4j.withSession(async (session) => {
      const seller = await session.executeWrite((tx) =>
        tx.run('match (user {id: $userId})-[:IS_A]-(s:seller) return s', {
          userId: subscriptionData.data.sellerId,
        })
      );

      return seller.records.map((record) => record.get('s').properties.id)[0];
    });

    if (await checkForSubscription(userId, sellerId, deps)) {
      throw new ConflictError('Already subscribed to this seller');
    }

    const session = await deps.stripe.checkout.sessions.create({
      success_url: process.env.STRIPE_SUCCESS_URL || 'https://example.com/success',
      line_items: [{ price: subscriptionData.data.subscriptionPlanId, quantity: 1 }],
      mode: 'subscription',
      currency: 'EUR',
      customer: userId,
      metadata: {
        sellerId: sellerId,
        subscriptionPlanTitle: subscriptionData.data.subscriptionPlanTitle,
        subscriptionPlanPrice: subscriptionData.data.subscriptionPlanPrice,
      },
    });

    return session;
  } catch (error) {
    deps.log?.error({ error, userId }, 'Subscribe failed');
    if (error instanceof ConflictError) {
      throw error;
    }
    throw new InternalServerError('Failed to create subscription');
  }
}

export async function unlockSentPicture(
  userId: string,
  unlockSentPictureData: any,
  deps: UserServiceDeps
): Promise<string> {
  if (!deps.stripe) {
    throw new InternalServerError('Stripe is not configured');
  }

  try {
    return await deps.neo4j.withSession(async (session) => {
      const seller = await session.executeWrite((tx) =>
        tx.run('match (user {id: $userId})-[:IS_A]-(s:seller) return s', {
          userId: userId,
        })
      );

      const sellerId = seller.records.map((record) => record.get('s').properties.id)[0];
      const price = await deps.stripe?.prices
        .list({
          product: unlockSentPictureData.pictureId,
        })
        .then((price) => {
          return { price: price.data[0]?.id, quantity: 1 };
        });

      const stripeSession = await deps.stripe?.checkout.sessions.create({
        success_url: process.env.STRIPE_SUCCESS_URL || 'https://example.com/success',
        line_items: [price!],
        mode: 'payment',
        currency: 'EUR',
        customer: userId,
        metadata: {
          sellerId: sellerId,
          messageId: unlockSentPictureData.messageId,
          pictureId: unlockSentPictureData.pictureId,
          amount: unlockSentPictureData.tipAmount,
          chatRoomId: unlockSentPictureData.chatRoomId,
          comingFrom: 'sentPicturePayment',
        },
      });

      return stripeSession?.url!;
    });
  } catch (error) {
    deps.log?.error({ error, userId }, 'Unlock sent picture failed');
    throw new InternalServerError('Failed to unlock sent picture');
  }
}

export async function signOut(userId: string, deps: UserServiceDeps): Promise<boolean> {
  try {
    await deps.neo4j.withSession(async (session) => {
      await session.executeWrite((tx) =>
        tx.run(
          'match (d:device)<-[:GOT_DEVICE]-(u:user {id: $userId}) set d.token="" return true',
          {
            userId: userId,
          }
        )
      );
    });

    return true;
  } catch (error) {
    deps.log?.error({ error, userId }, 'Sign out failed');
    throw new InternalServerError('Failed to sign out');
  }
}

export async function createSubscriptioninDb(
  subscriptionId: string,
  userId: string,
  sellerId: string,
  subscriptionPlanTitle: string,
  subscriptionPlanPrice: number,
  deps: UserServiceDeps
): Promise<void> {
  try {
    if (await checkForSubscription(userId, sellerId, deps)) {
      throw new ConflictError('Already subscribed');
    }

    await deps.neo4j.withSession(async (session) => {
      await session.executeWrite((tx) =>
        tx.run(
          'match (u:user {id: $userId}), (s:seller {id: $sellerId})<-[:IS_A]-(user:user) create (u)-[:SUBSCRIBED_TO {id: $subscriptionId, subscriptionPlanTitle: $subscriptionPlanTitle, subscriptionPlanPrice: $subscriptionPlanPrice}]->(s) set user.followers = user.followers + 1 set u.followings = u.followings + 1 return s',
          {
            userId: userId,
            sellerId: sellerId,
            subscriptionPlanTitle: subscriptionPlanTitle,
            subscriptionPlanPrice: subscriptionPlanPrice,
            subscriptionId: subscriptionId,
          }
        )
      );
    });
  } catch (error) {
    deps.log?.error({ error, userId, sellerId }, 'Create subscription in DB failed');
    if (error instanceof ConflictError) {
      throw error;
    }
    throw new InternalServerError('Failed to create subscription');
  }
}

export async function cancelSubscription(
  userId: string,
  sellerId: string,
  deps: UserServiceDeps
): Promise<any> {
  if (!deps.stripe) {
    throw new InternalServerError('Stripe is not configured');
  }

  try {
    if (!(await checkForSubscription(userId, sellerId, deps))) {
      throw new NotFoundError('No active subscription found');
    }

    return await deps.neo4j.withSession(async (session) => {
      const subscription = await session.executeWrite((tx) =>
        tx.run(
          'match (u:user {id: $userId})-[subscribed:SUBSCRIBED_TO]->(s:seller {id: $sellerId}) return subscribed',
          {
            userId: userId,
            sellerId: sellerId,
          }
        )
      );

      const subscriptionId = subscription.records.map(
        (record) => record.get('subscribed').properties.id
      )[0];

      await session.executeWrite((tx) =>
        tx.run(
          'match (u:user {id: $userId})-[sub:SUBSCRIBED_TO]->(s:seller {id: $sellerId}) detach delete sub',
          {
            userId: userId,
            sellerId: sellerId,
          }
        )
      );

      await deps.stripe?.subscriptions.cancel(subscriptionId);

      return { message: 'subscription was canceled successfully' };
    });
  } catch (error) {
    deps.log?.error({ error, userId, sellerId }, 'Cancel subscription failed');
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new InternalServerError('Failed to cancel subscription');
  }
}

export async function checkForSale(
  userId: string,
  postId: string,
  deps: UserServiceDeps
): Promise<boolean> {
  try {
    return await deps.neo4j.withSession(async (session) => {
      const saleAlreadyExists = await session.executeWrite((tx) =>
        tx.run(
          'match (u:user {id: $userId})-[bought:BOUGHT_A]->(p:post {id: $postId}) return bought',
          {
            userId: userId,
            postId: postId,
          }
        )
      );

      return saleAlreadyExists.records.map((record) => record.get('bought')).length > 0
        ? true
        : false;
    });
  } catch (error) {
    deps.log?.error({ error, userId, postId }, 'Check for sale failed');
    throw new InternalServerError('Failed to check for sale');
  }
}

export async function getSellerPlans(userId: string, deps: UserServiceDeps): Promise<any> {
  try {
    return await deps.neo4j.withSession(async (session) => {
      const sellerPlan = await session.executeWrite((tx) =>
        tx.run('match (u:user {id: $userId})-[:IS_A]-(seller)-[:HAS_A]-(plan:plan) return plan', {
          userId: userId,
        })
      );

      return sellerPlan.records.map((record) => record.get('plan').properties);
    });
  } catch (error) {
    deps.log?.error({ error, userId }, 'Get seller plans failed');
    throw new InternalServerError('Failed to get seller plans');
  }
}

export async function checkForSubscription(
  userId: string,
  sellerId: string,
  deps: UserServiceDeps
): Promise<boolean> {
  try {
    return await deps.neo4j.withSession(async (session) => {
      const subscriptionAlreadyExist = await session.executeWrite((tx) =>
        tx.run(
          'match (u:user {id: $userId})-[subscribed:SUBSCRIBED_TO]->(s:seller {id: $sellerId}) return subscribed',
          {
            userId: userId,
            sellerId: sellerId,
          }
        )
      );

      return subscriptionAlreadyExist.records.map((record) => record.get('subscribed')).length > 0
        ? true
        : false;
    });
  } catch (error) {
    deps.log?.error({ error, userId, sellerId }, 'Check for subscription failed');
    throw new InternalServerError('Failed to check for subscription');
  }
}

export async function contact(contactData: any, deps: UserServiceDeps): Promise<void> {
  if (!deps.resend) {
    throw new InternalServerError('Resend is not configured');
  }

  try {
    const html = `<div><h1>Feetflight</h1><h3>Welcome back</h3><p>A contacted you through contact form </p><p>name: ${contactData.name} </p><p>email: ${contactData.email}</p><p>number: ${contactData.number}</p><p>message: ${contactData.message}</p></div>`;
    if (!process.env.USER_EMAIL) {
      throw new Error('idk fix later');
    }
    await deps.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: process.env.USER_EMAIL,
      subject: 'Contact Form Submission',
      html,
    });

    deps.log?.info({ contactData }, 'Contact form email sent successfully');
  } catch (error) {
    deps.log?.error({ error, contactData }, 'Contact form submission failed');
    throw new InternalServerError('Failed to send contact form email');
  }
}

export async function checkForSubscriptionbyUserId(
  userId: string,
  postId: string,
  plan: string,
  deps: UserServiceDeps
): Promise<boolean> {
  try {
    return await deps.neo4j.withSession(async (session) => {
      const subscriptionAlreadyExist = await session.executeWrite((tx) =>
        tx.run(
          'match (u:user {id: $userId})-[subscribed:SUBSCRIBED_TO {subscriptionPlanTitle: $plan}]->(s:seller)-[:HAS_A]->(p:post {id: $postId}) return subscribed',
          {
            userId: userId,
            postId: postId,
            plan: plan,
          }
        )
      );

      return subscriptionAlreadyExist.records.map((record) => record.get('subscribed')).length > 0
        ? true
        : false;
    });
  } catch (error) {
    deps.log?.error({ error, userId, postId }, 'Check for subscription by user ID failed');
    throw new InternalServerError('Failed to check for subscription');
  }
}

/**
 * Get all subscriptions for a user
 */
export async function getAllSubscriptionsForUser(
  userId: string,
  deps: UserServiceDeps
): Promise<
  Array<{ sellerId: string; subscriptionId: string; planName: string; planPrice: number }>
> {
  try {
    return await deps.neo4j.withSession(async (session) => {
      const result = await session.executeRead((tx) =>
        tx.run(
          'match (u:user {id: $userId})-[subscribed:SUBSCRIBED_TO]->(s:seller) match (s)-[:HAS_A]->(p:subscription_plan {id: subscribed.subscriptionPlanId}) return s.id as sellerId, subscribed.subscriptionId as subscriptionId, p.name as planName, p.price as planPrice',
          { userId }
        )
      );

      return result.records.map((record) => ({
        sellerId: record.get('sellerId'),
        subscriptionId: record.get('subscriptionId'),
        planName: record.get('planName'),
        planPrice: record.get('planPrice'),
      }));
    });
  } catch (error) {
    deps.log?.error({ error, userId }, 'Get all subscriptions failed');
    throw new InternalServerError('Failed to retrieve subscriptions');
  }
}

export async function getFollowedSellers(
  userId: string,
  role: string,
  deps: UserServiceDeps
): Promise<any> {
  try {
    return await deps.neo4j.withSession(async (session) => {
      let followedSellers: any = {};
      if (role === RolesEnum.BUYER) {
        followedSellers = await session.executeRead((tx) =>
          tx.run(
            'match (u:user {id: $userId})-[:SUBSCRIBED_TO]->(s:seller) match (seller {id: s.id})<-[:IS_A]-(user:user) return user',
            {
              userId: userId,
            }
          )
        );
      } else {
        followedSellers = await session.executeRead((tx) =>
          tx.run(
            'match (user {id: $userId})-[:IS_A]->(s:seller) match (s)-[:SUBSCRIBED_TO]-(buyerUser:user) return buyerUser',
            {
              userId: userId,
            }
          )
        );
      }

      return role === RolesEnum.BUYER
        ? followedSellers.records.map(
            (record: { get: (arg0: string) => { (): any; new (): any; properties: any } }) =>
              record.get('user').properties
          )
        : followedSellers.records.map(
            (record: { get: (arg0: string) => { (): any; new (): any; properties: any } }) =>
              record.get('buyerUser').properties
          );
    });
  } catch (error) {
    deps.log?.error({ error, userId, role }, 'Get followed sellers failed');
    throw new InternalServerError('Failed to get followed sellers');
  }
}

export async function uploadAvatar(
  avatarData: any,
  userId: string,
  deps: UserServiceDeps
): Promise<void> {
  try {
    /* AWS S3 code (commented for reference)
    aws.config.update({
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
    const location = `/public/files/avatars/avatar${userId}.${avatarData.mimetype.split('/')[1]}`;
    const filePath = path.join(
      __dirname,
      '../../public/files/avatars',
      `avatar${userId}.${avatarData.mimetype.split('/')[1]}`
    );

    await writeFile(filePath, filecontent);
    await uploadAvatarToDb(location, userId, deps);
  } catch (error) {
    deps.log?.error({ error, userId }, 'Upload avatar failed');
    throw new InternalServerError('Failed to upload avatar');
  }
}

export async function uploadAvatarToDb(
  location: string,
  userId: string,
  deps: UserServiceDeps
): Promise<void> {
  try {
    await deps.neo4j.withSession(async (session) => {
      await session.executeWrite((tx) =>
        tx.run('match (u:user {id: $userId}) set u.avatar = $avatar', {
          userId: userId,
          avatar: location,
        })
      );
    });
  } catch (error) {
    deps.log?.error({ error, userId, location }, 'Upload avatar to DB failed');
    throw new InternalServerError('Failed to update avatar in database');
  }
}

export async function uploadDeviceToken(
  userId: string,
  token: string,
  deps: UserServiceDeps
): Promise<void> {
  try {
    await deps.neo4j.withSession(async (session) => {
      await session.executeWrite((tx) =>
        tx.run('match (u:user {id: $userId}) create (u)-[:GOT_DEVICE]->(:device {token: $token})', {
          userId: userId,
          token: token,
        })
      );
    });
  } catch (error) {
    deps.log?.error({ error, userId }, 'Upload device token failed');
    throw new InternalServerError('Failed to upload device token');
  }
}

export async function desactivateUser(userId: string, deps: UserServiceDeps): Promise<any> {
  try {
    return await deps.neo4j.withSession(async (session) => {
      const desactivatedUser = await session.executeWrite((tx) =>
        tx.run('match (u:user {id: $userId}) set u.desactivated = true return u', {
          userId: userId,
        })
      );
      return desactivatedUser.records.map((record) => record.get('u').properties)[0];
    });
  } catch (error) {
    deps.log?.error({ error, userId }, 'Deactivate user failed');
    throw new InternalServerError('Failed to deactivate user');
  }
}

/**
 * @deprecated UserService class is deprecated. Use Elysia route handlers with injected service functions instead.
 */
class UserService {
  public prices = [];
  public authService: any;

  public async findUserById() {
    throw new Error(
      'UserService class is deprecated. Use findUserById function with Elysia routes in src/routes/users.route.ts'
    );
  }

  public async generateAiPictures() {
    throw new Error(
      'UserService class is deprecated. Use generateAiPictures function with Elysia routes in src/routes/users.route.ts'
    );
  }

  public async changePassword() {
    throw new Error(
      'UserService class is deprecated. Use changePassword function with Elysia routes in src/routes/users.route.ts'
    );
  }

  public async emailConfirming() {
    throw new Error(
      'UserService class is deprecated. Use emailConfirming function with Elysia routes in src/routes/users.route.ts'
    );
  }

  public async updateUser() {
    throw new Error(
      'UserService class is deprecated. Use updateUser function with Elysia routes in src/routes/users.route.ts'
    );
  }

  public async buyPosts() {
    throw new Error(
      'UserService class is deprecated. Use buyPosts function with Elysia routes in src/routes/users.route.ts'
    );
  }

  public getSellersByPostId = async () => {
    throw new Error(
      'UserService class is deprecated. Use getSellersByPostId function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public generateOtp = async () => {
    throw new Error(
      'UserService class is deprecated. Use generateOtp function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public verifyOtp = async () => {
    throw new Error(
      'UserService class is deprecated. Use verifyOtp function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public buyPost = async () => {
    throw new Error(
      'UserService class is deprecated. Use buyPost function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public subscribe = async () => {
    throw new Error(
      'UserService class is deprecated. Use subscribe function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public unlockSentPicture = async () => {
    throw new Error(
      'UserService class is deprecated. Use unlockSentPicture function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public signOut = async () => {
    throw new Error(
      'UserService class is deprecated. Use signOut function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public createSubscriptioninDb = async () => {
    throw new Error(
      'UserService class is deprecated. Use createSubscriptioninDb function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public cancelSubscription = async () => {
    throw new Error(
      'UserService class is deprecated. Use cancelSubscription function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public checkForSale = async () => {
    throw new Error(
      'UserService class is deprecated. Use checkForSale function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public getSellerPlans = async () => {
    throw new Error(
      'UserService class is deprecated. Use getSellerPlans function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public checkForSubscription = async () => {
    throw new Error(
      'UserService class is deprecated. Use checkForSubscription function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public async contact() {
    throw new Error(
      'UserService class is deprecated. Use contact function with Elysia routes in src/routes/users.route.ts'
    );
  }

  public checkForSubscriptionbyUserId = async () => {
    throw new Error(
      'UserService class is deprecated. Use checkForSubscriptionbyUserId function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public getFollowedSellers = async () => {
    throw new Error(
      'UserService class is deprecated. Use getFollowedSellers function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public uploadAvatar = async () => {
    throw new Error(
      'UserService class is deprecated. Use uploadAvatar function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public uploadAvatarToDb = async () => {
    throw new Error(
      'UserService class is deprecated. Use uploadAvatarToDb function with Elysia routes in src/routes/users.route.ts'
    );
  };

  public async uploadDeviceToken() {
    throw new Error(
      'UserService class is deprecated. Use uploadDeviceToken function with Elysia routes in src/routes/users.route.ts'
    );
  }

  public async desactivateUser() {
    throw new Error(
      'UserService class is deprecated. Use desactivateUser function with Elysia routes in src/routes/users.route.ts'
    );
  }
}

export default UserService;
