import { initializeDbConnection } from '@/app';
import { int } from 'neo4j-driver';
import Stripe from 'stripe';

class walletService {
  private stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });

  public async getAmount(sellerId) {
    const getAmountSession = initializeDbConnection().session();
    try {
      const walletAmount = await getAmountSession.executeRead(tx =>
        tx.run('match (w)<-[:HAS_A]-(s:seller {id: $sellerId}) return w', {
          sellerId: sellerId,
        }),
      );

      return walletAmount.records.map(record => record.get('w').properties.amount)[0];
    } catch (error) {
      console.log(error);
    } finally {
      getAmountSession.close();
    }
  }

  public async UpdateSellerBalance(userId, newAmount) {
    const updateAmountSession = initializeDbConnection().session();
    try {
      const updatedAmount = await updateAmountSession.executeWrite(tx =>
        tx.run('match (w)<-[:HAS_A]-(s:seller)<-[:IS_A]-(:user {id: $userId}) set w.amount = w.amount + $newAmount return w', {
          newAmount: int(newAmount),
          userId: userId,
        }),
      );

      await this.stripe.customers.createBalanceTransaction(
        userId,
        {amount: newAmount*100, currency: 'eur'}
      );

      return updatedAmount.records.map(record => record.get('w').properties)[0];
    } catch (error) {
      console.log(error);
    } finally {
      updateAmountSession.close();
    }
  }
}

export default walletService;
