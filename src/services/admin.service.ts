import { initializeDbConnection } from '@/app';
import { uid } from 'uid';
import aws from 'aws-sdk';
import moment from 'moment';
import Stripe from 'stripe';

class adminService {
  private stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });

  public async getUnverifiedSellers() {
    const getSellerIdentityCardSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const seller = await getSellerIdentityCardSession.executeRead(tx => tx.run('match (s:seller {verified: false}) return s'));
      return seller.records.map(record => record.get('s').properties);
    } catch (error) {
      console.log(error);
    } finally {
      getSellerIdentityCardSession.close();
    }
  }

  public async getSellerIdentityCard(userid: string) {
    const getSellerIdentityCardSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const seller = await getSellerIdentityCardSession.executeRead(tx =>
        tx.run('match (user {id: $userid})-[:IS_A]-(s:seller) return s', {
          userid: userid,
        }),
      );
      return {
        frontSide: seller.records.map(record => record.get('s').properties.frontIdentityCard)[0],
        backSide: seller.records.map(record => record.get('s').properties.backtIdentityCard)[0],
      };
    } catch (error) {
      console.log(error);
    } finally {
      getSellerIdentityCardSession.close();
    }
  }
}

export default adminService;
