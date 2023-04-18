import { initializeDbConnection } from '@/app';
import Stripe from 'stripe';

class sellerService {
  private stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });
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

  public async getSubscriptiionPlans(userId: string) {

    try {
      
      const getSubscriptionPlansSession = initializeDbConnection().session();

      const subscriptionPlans = await getSubscriptionPlansSession.executeWrite(tx =>
        tx.run(
          'match (user {id: $userId})-[:IS_A]->(s:seller)-[:HAS_A]->(subscriptionPlan:subscriptionPlan) return subscriptionPlan',
          {
            userId: userId,
          },
        ),
      );

      return subscriptionPlans.records.map(record => record.get("subscriptionPlan").properties);
    } catch (error) {
      console.log(error);
    }
  }

  public createSubscribePlan = async (subscriptionPlanPrice: string, subscriptionPlanTitle: string, userId: string) => {
    const createSubscribePlansSession = initializeDbConnection().session();
    try {
      const createdPlans = await createSubscribePlansSession.executeWrite(tx =>
        tx.run(
          'match (user {id: $userId})-[:IS_A]->(s:seller) create (s)-[:HAS_A]->(subscriptionPlan:subscriptionPlan {subscriptionPlanPrice: $subscriptionPlanPrice, subscriptionPlanTitle: $subscriptionPlanTitle}) return subscriptionPlan, s',
          {
            subscriptionPlanPrice: subscriptionPlanPrice,
            subscriptionPlanTitle: subscriptionPlanTitle,
            userId: userId,
          },
        ),
      );

      return createdPlans.records.map(record => record.get("subscriptionPlan").properties);
    } catch (error) {
      console.log(error);
    } finally {
      createSubscribePlansSession.close();
    }
  };
}

export default sellerService;
