import { initializeDbConnection, stripe } from '@/app';
import { Buffer } from 'node:buffer';
import { writeFile } from 'node:fs';
import path from 'node:path';
import moment from 'moment';

class sellerService {
  
  public prices = [];

  public async createSubscribePlans(userId: string, subscriptionPlansData: any[]) {
    try {
      const createdSubscriptionPlans = subscriptionPlansData.data.subscriptionPlans.map(subscriptionPlan => {
        return this.createSubscribePlan(subscriptionPlan.subscriptionPlanPrice, subscriptionPlan.subscriptionPlanTitle, userId);
      });

      const subscriptionPlans = await Promise.all(createdSubscriptionPlans);

      return subscriptionPlans;
    } catch (error) {
      console.log(error);
    }
  }

  public async changePlans(plans: any[]) {
    try {
      const updatedPlans = plans.map(async plan => {
        const oldPrice = await stripe.prices.retrieve(plan.id);
        
        await stripe.products.update(oldPrice.product.toString(), {
          name: plan.name,
        })
        
        const newPrice = await stripe.prices.create({
          currency: "EUR",
          product: oldPrice.product.toString(),
          recurring: {
            interval: "month",
            interval_count: 1,
          },
          unit_amount: plan.price * 100
        });
        await stripe.prices.update(oldPrice.id, {
          active: false
        })
        
        return this.changePlansInDb(plan.id, newPrice.id, plan.name, plan.price);
      })

      return updatedPlans.length > 0 ? {"message": "plans were updated successfully"} : {"message": "Something went wrong"};
    } catch (error) {
      console.log(error);
    }
  }

  public async changePlansInDb(oldPlanId: string, newPlanId: string, name: string, price: number) {
    const changePlanSession = initializeDbConnection().session();
    try {
      const updatedPlan = await changePlanSession.executeWrite(tx =>
        tx.run('match (plan:plan {id: $planId}) set plan.id = $newPlanId, plan.name = $name, plan.price = $price', {
          planId: oldPlanId,
          newPlanId: newPlanId,
          name: name,
          price: price
        }),
      );
      

      return updatedPlan;
    } catch (error) {
      console.log(error);
    }
  }

  public async getSubscriptiionPlans(userId: string) {
    try {
      const getSubscriptionPlansSession = initializeDbConnection().session();

      const subscriptionPlans = await getSubscriptionPlansSession.executeWrite(tx =>
        tx.run('match (user {id: $userId})-[:IS_A]->(s:seller)-[:HAS_A]->(subscriptionPlan:subscriptionPlan) return subscriptionPlan', {
          userId: userId,
        }),
      );

      return subscriptionPlans.records.map(record => record.get('subscriptionPlan').properties);
    } catch (error) {
      console.log(error);
    }
  }

  public async getAllSellers() {
    try {
      const getAllSellersSession = initializeDbConnection().session();

      const allSellers = await getAllSellersSession.executeRead(tx =>
        tx.run('match (u:user)-[:IS_A]-(s:seller) where exists((u)-[:IS_A]-(s)) return u'),
      );

      return allSellers.records.map(record => record.get('u').properties);
    } catch (error) {
      console.log(error);
    }
  }

  public createSubscribePlan = async (subscriptionPlanPrice: number, subscriptionPlanTitle: string, userId: string) => {
    const createSubscribePlansSession = initializeDbConnection().session();
    try {
      const product = await stripe.products.create({
        name: subscriptionPlanTitle,
      });

      const price = await this.stripe.prices.create({
        unit_amount: subscriptionPlanPrice * 100,
        currency: 'eur',
        recurring: { interval: 'month' },
        metadata: {
          sellerId: userId,
        },
        product: product.id,
      });

      const createdPlans = await createSubscribePlansSession.executeWrite(tx =>
        tx.run(
          'match (user {id: $userId})-[:IS_A]->(s:seller) create (s)-[:HAS_A]->(subscriptionPlan:subscriptionPlan {id: $subscriptionPlanId, price: $subscriptionPlanPrice, title: $subscriptionPlanTitle}) return subscriptionPlan',
          {
            subscriptionPlanPrice: subscriptionPlanPrice,
            subscriptionPlanTitle: subscriptionPlanTitle,
            userId: userId,
            subscriptionPlanId: price.id,
          },
        ),
      );

      return createdPlans.records.map(record => record.get('subscriptionPlan').properties);
    } catch (error) {
      console.log(error);
    } finally {
      createSubscribePlansSession.close();
    }
  };

  public getFollowersCount = async (sellerId: string) => {
    const getFlowwersSession = initializeDbConnection().session();
    try {
      const followersCount = await getFlowwersSession.executeWrite(tx =>
        tx.run('match (u:user)-[s:SUBSCRIBED_TO]->(seller {id: $sellerId}) return count(s) as followersCount', {
          sellerId: sellerId,
        }),
      );
      
      return followersCount.records.map(record => record.get("followersCount"))[0].low;
    } catch (error) {
      console.log(error);
    } finally {
      getFlowwersSession.close();
    }
  };

  public uploadIdentityCard = async (identityCardData: any, userId: string) => {
    try {
      for (let key in identityCardData) {
        console.log(identityCardData[key][0]);
        
        const filecontent = Buffer.from(identityCardData[key][0].buffer, 'binary');

        writeFile(path.join(__dirname, "../../public/files/identity_cards", `${moment().format("ssMMyyyy")}${userId}${identityCardData[key][0].originalname.replace(".", "")}`), filecontent, (err) => {
          if (err) return console.log(err);
          this.uploadIdentityCardToDb(`/public/files/identity_cards/${moment().format("ssMMyyyy")}${userId}${identityCardData[key][0].originalname.replace(".", "")}`, userId, identityCardData[key].fieldname);
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  public uploadSentPicture = async (sentPictureData: any, userId: string) => {
    try {
      const filecontent = Buffer.from(sentPictureData.buffer, 'binary');
      let sentPicturePath = [];
      writeFile(
        path.join(__dirname, '../../public/files/sent', `sent${userId}${moment().format("ssMMyyyy")}.${sentPictureData.mimetype.split("/")[1]}`),
        filecontent,
        async err => {
          if (err) return console.log(err);
          sentPicturePath.push(`/public/files/sent/sent${userId}${moment().format("ssMMyyyy")}.${sentPictureData.mimetype.split("/")[1]}`) ;
        },
      );
      return `/public/files/sent/sent${userId}${moment().format("ssMMyyyy")}.${sentPictureData.mimetype.split("/")[1]}`;
    } catch (error) {
      console.log(error);
    }
  };

  public uploadIdentityCardToDb = async (location: string, userId: string, side: string) => {
    const uploadIdentityCardSession = initializeDbConnection().session();
    try {
      switch (side) {
        case 'frontSide':
          await uploadIdentityCardSession.executeWrite(tx =>
            tx.run('match (user {id: $userId})-[:IS_A]->(s:seller) set s.frontIdentityCard = $frontIdentityCard', {
              userId: userId,
              frontIdentityCard: location,
            }),
          );
          break;
        case 'backSide':
          await uploadIdentityCardSession.executeWrite(tx =>
            tx.run('match (user {id: $userId})-[:IS_A]->(s:seller) set s.backtIdentityCard = $backIdentityCard', {
              userId: userId,
              backIdentityCard: location,
            }),
          );
          break;
        default:
          break;
      }
    } catch (error) {
      console.log(error);
    } finally {
      uploadIdentityCardSession.close();
    }
  };

  
}

export default sellerService;
