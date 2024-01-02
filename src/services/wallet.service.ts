import { initializeDbConnection } from '@/app';
import { int } from 'neo4j-driver';
import Stripe from 'stripe';

class walletService {
  private stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });

  public async getBalance(userId: string) {
    const getAmountSession = initializeDbConnection().session();
    try {
      const walletAmount = await getAmountSession.executeRead(tx =>
        tx.run('match (w:wallet)<-[:HAS_A]-(s:seller)<-[:IS_A]-(:user {id: $userId}) return w', {
          userId: userId,
        }),
      );

      return walletAmount.records.map(record => record.get('w').properties.amount)[0];
    } catch (error) {
      console.log(error);
    } finally {
      getAmountSession.close();
    }
  }

  public async UpdateBalanceForPayment(sellerId: string, balanceAmount: any) {
    const updateAmountSession = initializeDbConnection().session();
    try {
      await updateAmountSession.executeWrite(tx =>
        tx.run('match (w:wallet)<-[:HAS_A]-(s:seller {id: $sellerId}) set w.amount = w.amount + $newAmount return w, s', {
          newAmount: int(balanceAmount),
          sellerId: sellerId,
        }),
      );
    } catch (error) {
      console.log(error);
    } finally {
      updateAmountSession.close();
    }
  }

  public async UpdateBalanceForSubscription(sellerId: string, balanceAmount: any) {
    const updateAmountSession = initializeDbConnection().session();
    try {
      console.log(sellerId);
      const updatedAmount = await updateAmountSession.executeWrite(tx =>
        tx.run('match (w:wallet)<-[:HAS_A]-(s:seller)-[:IS_A]-(u:user) set w.amount = w.amount + $newAmount return w, u', {
          newAmount: int(balanceAmount),
          sellerId: sellerId,
        }),
      );

      console.log(updatedAmount.records);
      

      return updatedAmount.records.map(record => record.get('w').properties.amount)[0].low; 
    } catch (error) {
      console.log(error);
    } finally {
      updateAmountSession.close();
    }
  }
}

export default walletService;
