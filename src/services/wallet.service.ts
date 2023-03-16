import { initializeDbConnection } from '@/app';
import { int } from 'neo4j-driver';

class walletService {

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

  public async UpdateAmount(sellerId, walletData) {
    const updateAmountSession = initializeDbConnection().session();
    try {
      const updatedAmount = await updateAmountSession.executeWrite(tx =>
        tx.run('match (w)<-[:HAS_A]-(s:seller {id: $sellerId}) set w.amount = w.amount + $newAmount return w', {
          newAmount: int(walletData.data.newAmount),
          sellerId: sellerId,
        }),
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
