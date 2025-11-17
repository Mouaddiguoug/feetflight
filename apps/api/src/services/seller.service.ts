import { InternalServerError, NotFoundError } from '@/plugins/error.plugin';
import { Buffer } from 'node:buffer';
import { writeFile } from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import moment from 'moment';
import { uid } from 'uid';
import type Stripe from 'stripe';
import { Tneo4j } from '@/plugins/neo4j.plugin';
import { Logger } from 'pino';

const writeFileAsync = promisify(writeFile);
export interface SellerServiceDeps {
  neo4j: Tneo4j;
  log?: Logger;
  stripe?: Stripe;
}

export async function createSubscribePlans(
  userId: string,
  subscriptionPlansData: any,
  deps: SellerServiceDeps
): Promise<any[]> {
  try {
    if (!deps.stripe) {
      throw new InternalServerError('Stripe is not configured');
    }

    const createdSubscriptionPlans = subscriptionPlansData.data.subscriptionPlans.map(
      (subscriptionPlan: any) => {
        return createSubscribePlan(
          subscriptionPlan.subscriptionPlanPrice,
          subscriptionPlan.subscriptionPlanTitle,
          userId,
          deps
        );
      }
    );

    const subscriptionPlans = await Promise.all(createdSubscriptionPlans);

    return subscriptionPlans;
  } catch (error) {
    deps.log?.error({ error, userId }, 'Create subscription plans failed');
    if (error instanceof InternalServerError) {
      throw error;
    }
    throw new InternalServerError('Failed to create subscription plans');
  }
}

export async function changePlans(
  plans: any[],
  deps: SellerServiceDeps
): Promise<{ message: string }> {
  try {
    if (!deps.stripe) {
      throw new InternalServerError('Stripe is not configured');
    }

    const updatedPlans = plans.map(async (plan) => {
      const oldPrice = await deps.stripe!.prices.retrieve(plan.id);

      await deps.stripe!.products.update(oldPrice.product.toString(), {
        name: plan.name,
      });

      const newPrice = await deps.stripe!.prices.create({
        currency: 'EUR',
        product: oldPrice.product.toString(),
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
        unit_amount: plan.price * 100,
      });

      await deps.stripe!.prices.update(oldPrice.id, {
        active: false,
      });

      return changePlansInDb(plan.id, newPrice.id, plan.name, plan.price, deps);
    });

    await Promise.all(updatedPlans);

    return updatedPlans.length > 0
      ? { message: 'plans were updated successfully' }
      : { message: 'Something went wrong' };
  } catch (error) {
    deps.log?.error({ error, plans }, 'Change plans failed');
    throw new InternalServerError('Failed to update plans');
  }
}

export async function changePlansInDb(
  oldPlanId: string,
  newPlanId: string,
  name: string,
  price: number,
  deps: SellerServiceDeps
): Promise<any> {
  try {
    const updatedPlan = await deps.neo4j.withSession(async (session) => {
      return await session.executeWrite((tx) =>
        tx.run(
          'match (subscriptionPlan:subscriptionPlan {id: $planId}) set subscriptionPlan.id = $newPlanId, subscriptionPlan.title = $name, subscriptionPlan.price = $price',
          {
            planId: oldPlanId,
            newPlanId: newPlanId,
            name: name,
            price: price,
          }
        )
      );
    });

    return updatedPlan;
  } catch (error) {
    deps.log?.error({ error, oldPlanId, newPlanId }, 'Change plans in DB failed');
    throw new InternalServerError('Failed to update plans in database');
  }
}

export async function getPayoutAccounts(userId: string, deps: SellerServiceDeps): Promise<any[]> {
  try {
    const payoutAccounts = await deps.neo4j.withSession(async (session) => {
      return await session.executeRead((tx) =>
        tx.run(
          'match (u:user {id: $userId})-[:IS_A]->(seller)-[:GETS_PAID]->(p:payoutAccount) return p',
          {
            userId: userId,
          }
        )
      );
    });

    return payoutAccounts.records.map((record) => record.get('p').properties);
  } catch (error) {
    deps.log?.error({ error, userId }, 'Get payout accounts failed');
    throw new InternalServerError('Failed to retrieve payout accounts');
  }
}

export async function getSubscriptionPlans(
  userId: string,
  deps: SellerServiceDeps
): Promise<any[]> {
  try {
    const subscriptionPlans = await deps.neo4j.withSession(async (session) => {
      return await session.executeRead((tx) =>
        tx.run(
          'match (user {id: $userId})-[:IS_A]->(s:seller)-[:HAS_A]->(subscriptionPlan:subscriptionPlan) return subscriptionPlan',
          {
            userId: userId,
          }
        )
      );
    });

    return subscriptionPlans.records.map((record) => record.get('subscriptionPlan').properties);
  } catch (error) {
    deps.log?.error({ error, userId }, 'Get subscription plans failed');
    throw new InternalServerError('Failed to retrieve subscription plans');
  }
}

export async function deletePayoutAccount(id: string, deps: SellerServiceDeps): Promise<void> {
  try {
    const result = await deps.neo4j.withSession(async (session) => {
      return await session.executeWrite((tx) =>
        tx.run('match (p:payoutAccount {id: $id}) detach delete p', {
          id: id,
        })
      );
    });

    if (result.summary.counters.updates().nodesDeleted === 0) {
      throw new NotFoundError('Payout account not found');
    }
  } catch (error) {
    deps.log?.error({ error, id }, 'Delete payout account failed');
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new InternalServerError('Failed to delete payout account');
  }
}

export async function addPayoutAccount(
  userId: string,
  bankAccountData: any,
  deps: SellerServiceDeps
): Promise<void> {
  try {
    const addedPayoutAccount = await deps.neo4j.withSession(async (session) => {
      return await session.executeWrite((tx) =>
        tx.run(
          'match (user {id: $userId})-[:IS_A]->(s:seller) create (s)-[:GETS_PAID]->(p:payoutAccount {id: $id, bankCountry: $bankCountry, city: $city, bankName: $bankName, accountNumber: $accountNumber, swift: $swift, status: $status}) return p',
          {
            userId: userId,
            id: uid(10),
            bankCountry: bankAccountData.bankCountry,
            city: bankAccountData.city,
            status: 'Pending',
            bankName: bankAccountData.bankName,
            accountNumber: bankAccountData.accountNumber,
            swift: bankAccountData.swift,
          }
        )
      );
    });

    if (!addedPayoutAccount.records.length) {
      throw new InternalServerError('Failed to create payout account');
    }
  } catch (error) {
    deps.log?.error({ error, userId }, 'Add payout account failed');
    if (error instanceof InternalServerError) {
      throw error;
    }
    throw new InternalServerError('Failed to add payout account');
  }
}

export async function requestWithdraw(
  userId: string,
  payoutAccountId: string,
  deps: SellerServiceDeps
): Promise<void> {
  try {
    const requestedWithdraw = await deps.neo4j.withSession(async (session) => {
      return await session.executeWrite((tx) =>
        tx.run(
          'match (user {id: $userId})-[:IS_A]->(s:seller), (p:payoutAccount {id: $payoutAccountId}) create (s)-[:REQUESTED_WITHDRAW]->(r:withdrawalRequest {id: $id, status: $status})-[:BY]->(p) return r',
          {
            userId: userId,
            payoutAccountId: payoutAccountId,
            status: 'Pending',
            id: uid(10),
          }
        )
      );
    });

    if (!requestedWithdraw.records.length) {
      throw new NotFoundError('Seller or payout account not found');
    }
  } catch (error) {
    deps.log?.error({ error, userId, payoutAccountId }, 'Request withdraw failed');
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new InternalServerError('Failed to request withdrawal');
  }
}

export async function getAllSellers(deps: SellerServiceDeps): Promise<any[]> {
  try {
    const allSellers = await deps.neo4j.withSession(async (session) => {
      return await session.executeRead((tx) =>
        tx.run('match (u:user)-[:IS_A]-(s:seller) where exists((u)-[:IS_A]-(s)) return u')
      );
    });

    return allSellers.records.map((record) => record.get('u').properties);
  } catch (error) {
    deps.log?.error({ error }, 'Get all sellers failed');
    throw new InternalServerError('Failed to retrieve sellers');
  }
}

export async function createSubscribePlan(
  subscriptionPlanPrice: number,
  subscriptionPlanTitle: string,
  userId: string,
  deps: SellerServiceDeps
): Promise<any> {
  try {
    if (!deps.stripe) {
      throw new InternalServerError('Stripe is not configured');
    }

    const product = await deps.stripe.products.create({
      name: subscriptionPlanTitle,
    });

    const price = await deps.stripe.prices.create({
      unit_amount: subscriptionPlanPrice * 100,
      currency: 'eur',
      recurring: { interval: 'month' },
      metadata: {
        sellerId: userId,
      },
      product: product.id,
    });

    const createdPlans = await deps.neo4j.withSession(async (session) => {
      return await session.executeWrite((tx) =>
        tx.run(
          'match (user {id: $userId})-[:IS_A]->(s:seller) create (s)-[:HAS_A]->(subscriptionPlan:subscriptionPlan {id: $subscriptionPlanId, price: $subscriptionPlanPrice, title: $subscriptionPlanTitle}) return subscriptionPlan',
          {
            subscriptionPlanPrice: subscriptionPlanPrice,
            subscriptionPlanTitle: subscriptionPlanTitle,
            userId: userId,
            subscriptionPlanId: price.id,
          }
        )
      );
    });

    return createdPlans.records.map((record) => record.get('subscriptionPlan').properties);
  } catch (error) {
    deps.log?.error({ error, userId, subscriptionPlanTitle }, 'Create subscription plan failed');
    if (error instanceof InternalServerError) {
      throw error;
    }
    throw new InternalServerError('Failed to create subscription plan');
  }
}

export async function getFollowersCount(
  sellerId: string,
  deps: SellerServiceDeps
): Promise<number> {
  try {
    const followersCount = await deps.neo4j.withSession(async (session) => {
      return await session.executeRead((tx) =>
        tx.run(
          'match (u:user)-[s:SUBSCRIBED_TO]->(seller {id: $sellerId}) return count(s) as followersCount',
          {
            sellerId: sellerId,
          }
        )
      );
    });

    const count = followersCount.records.map((record) => record.get('followersCount'))[0];
    return count?.low ?? 0;
  } catch (error) {
    deps.log?.error({ error, sellerId }, 'Get followers count failed');
    throw new InternalServerError('Failed to retrieve followers count');
  }
}

export async function uploadIdentityCard(
  identityCardData: any,
  userId: string,
  deps: SellerServiceDeps
): Promise<void> {
  try {
    for (const key in identityCardData) {
      const file = identityCardData[key][0];
      if (!file) continue;

      const filecontent = Buffer.from(file.buffer, 'binary');

      const filename = `${moment().format('ssMMyyyy')}${userId}${file.originalname.replace('.', '')}`;
      const filePath = path.join(__dirname, '../../public/files/identity_cards', filename);

      await writeFileAsync(filePath, filecontent);

      const location = `/public/files/identity_cards/${filename}`;
      await uploadIdentityCardToDb(location, userId, file.fieldname, deps);
    }
  } catch (error) {
    deps.log?.error({ error, userId }, 'Identity card upload failed');
    throw new InternalServerError('Failed to upload identity card');
  }
}

export async function uploadSentPicture(
  sentPictureData: any,
  userId: string,
  tipAmount: string,
  receiverId: string,
  deps: SellerServiceDeps
): Promise<{ pictureId: string; path: string }> {
  try {
    if (!deps.stripe) {
      throw new InternalServerError('Stripe is not configured');
    }

    // Generate filename and IDs
    const encryptionDate = moment().format('ssMMyyyy');
    const pictureId = `${userId}PictureSent${encryptionDate}${uid(10)}`;
    const extension = sentPictureData.mimetype.split('/')[1];
    const filename = `sent${userId}${encryptionDate}.${extension}`;
    const filePath = path.join(__dirname, '../../public/files/sent', filename);
    const publicPath = `/public/files/sent/${filename}`;

    // Extract buffer and write file (promisified for proper async/await)
    const filecontent = Buffer.from(sentPictureData.buffer, 'binary');
    await writeFileAsync(filePath, filecontent);

    // Create Neo4j picture node
    await deps.neo4j.withSession(async (session) => {
      return await session.executeWrite((tx) =>
        tx.run(
          'match (u:user {id: $userId})-[:IS_A]->(s:seller), (buyerUser:user {id: $receiverId}) create (s)-[:SENT]->(p:picture {id: $pictureId, tipAmount: $tipAmount, isPaid: $isPaid})-[:TO]->(buyerUser) return p, buyerUser, s',
          {
            userId: userId,
            receiverId: receiverId,
            tipAmount: tipAmount,
            pictureId: pictureId,
            isPaid: Number(tipAmount) == 0 ? false : true,
          }
        )
      );
    });

    // Create Stripe product
    await deps.stripe.products.create({
      name: 'Private sent photo',
      metadata: {
        pictureId: pictureId,
      },
      default_price_data: {
        currency: 'EUR',
        unit_amount: Number(tipAmount) * 100,
      },
    });

    return { pictureId, path: publicPath };
  } catch (error) {
    deps.log?.error({ error, userId, receiverId }, 'Upload sent picture failed');
    if (error instanceof InternalServerError) {
      throw error;
    }
    throw new InternalServerError('Failed to upload sent picture');
  }
}

export async function uploadIdentityCardToDb(
  location: string,
  userId: string,
  side: string,
  deps: SellerServiceDeps
): Promise<void> {
  try {
    await deps.neo4j.withSession(async (session) => {
      switch (side) {
        case 'frontSide':
          return await session.executeWrite((tx) =>
            tx.run(
              'match (user {id: $userId})-[:IS_A]->(s:seller) set s.frontIdentityCard = $frontIdentityCard',
              {
                userId: userId,
                frontIdentityCard: location,
              }
            )
          );
        case 'backSide':
          return await session.executeWrite((tx) =>
            tx.run(
              'match (user {id: $userId})-[:IS_A]->(s:seller) set s.backIdentityCard = $backIdentityCard',
              {
                userId: userId,
                backIdentityCard: location,
              }
            )
          );
        default:
          return;
      }
    });
  } catch (error) {
    deps.log?.error({ error, userId, side }, 'Upload identity card to DB failed');
    throw new InternalServerError('Failed to update identity card in database');
  }
}

/**
 * @deprecated This Express-based seller service class is deprecated and will be removed.
 * All methods have been migrated to plain exported functions with dependency injection.
 */
class sellerService {
  public prices = [];

  public async createSubscribePlans() {
    throw new Error(
      'This method is deprecated. Use Elysia seller routes at POST /sellers/plans/:id instead.'
    );
  }

  public async changePlans() {
    throw new Error(
      'This method is deprecated. Use Elysia seller routes at PUT /sellers/plans instead.'
    );
  }

  public async changePlansInDb() {
    throw new Error(
      'This method is deprecated. Use the exported changePlansInDb function with dependency injection.'
    );
  }

  public async getPayoutAccounts() {
    throw new Error(
      'This method is deprecated. Use Elysia seller routes at GET /sellers/payout/:id instead.'
    );
  }

  public async getSubscriptiionPlans() {
    throw new Error(
      'This method is deprecated. Use Elysia seller routes at GET /sellers/plans/:id instead.'
    );
  }

  public async deletePayoutAccount() {
    throw new Error(
      'This method is deprecated. Use Elysia seller routes at POST /sellers/payout/:id/:payoutAccountId instead.'
    );
  }

  public async addPayoutAccount() {
    throw new Error(
      'This method is deprecated. Use Elysia seller routes at POST /sellers/payout/:id instead.'
    );
  }

  public async requestWithdraw() {
    throw new Error(
      'This method is deprecated. Use Elysia seller routes at POST /sellers/withdrawal/:id/:payoutAccountId instead.'
    );
  }

  public async getAllSellers() {
    throw new Error('This method is deprecated. Use Elysia seller routes at GET /sellers instead.');
  }

  public createSubscribePlan() {
    throw new Error(
      'This method is deprecated. Use the exported createSubscribePlan function with dependency injection.'
    );
  }

  public getFollowersCount() {
    throw new Error(
      'This method is deprecated. Use Elysia seller routes at GET /sellers/followers/:id instead.'
    );
  }

  public uploadIdentityCard() {
    throw new Error(
      'This method is deprecated. Use Elysia seller routes at POST /sellers/upload/identitycard/:id instead.'
    );
  }

  public uploadSentPicture() {
    throw new Error(
      'This method is deprecated. Use Elysia seller routes at POST /sellers/upload/sent/picture/:id/:tipAmount/:receiverId instead.'
    );
  }

  public uploadIdentityCardToDb() {
    throw new Error(
      'This method is deprecated. Use the exported uploadIdentityCardToDb function with dependency injection.'
    );
  }
}

export default sellerService;
