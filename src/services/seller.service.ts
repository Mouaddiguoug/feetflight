import { initializeDbConnection } from '@/app';
import Stripe from 'stripe';
import aws from 'aws-sdk';

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
        tx.run('match (user {id: $userId})-[:IS_A]->(s:seller)-[:HAS_A]->(subscriptionPlan:subscriptionPlan) return subscriptionPlan', {
          userId: userId,
        }),
      );

      return subscriptionPlans.records.map(record => record.get('subscriptionPlan').properties);
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

      return createdPlans.records.map(record => record.get('subscriptionPlan').properties);
    } catch (error) {
      console.log(error);
    } finally {
      createSubscribePlansSession.close();
    }
  };

  public uploadIdentityCard = async (identityCardData: any, userId: string) => {
    try {
      console.log(process.env.AWS_ACCESS_KEY_ID);
      
      identityCardData.data.identityCard.map(picture => {
        aws.config.update({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: 'us-east-2',
        });
        const filecontent = Buffer.from(picture.value, 'binary');
        const s3 = new aws.S3();

        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: picture.side,
          Body: filecontent,
        };

        s3.upload(params, (err, data) => {
          if (err) return console.log(err);
          this.uploadIdentityCardToDb(data.Location, userId, data.Key);
        });
      });
    } catch (error) {
      console.log(error);
    }
  };

  public uploadIdentityCardToDb = async (location: string, userId: string, side: string) => {
    const uploadIdentityCardSession = initializeDbConnection().session();
    try {
      switch (side) {
        case 'FRONT_SIDE':
          await uploadIdentityCardSession.executeWrite(tx =>
            tx.run('match (user {id: $userId})-[:IS_A]->(s:seller) set s.frontIdentityCard = $frontIdentityCard', {
              userId: userId,
              frontIdentityCard: location,
            }),
          );
          break;
        case 'BACK_SIDE':
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
