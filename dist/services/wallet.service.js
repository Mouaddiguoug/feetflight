"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _app = require("../app");
const _neo4JDriver = require("neo4j-driver");
let walletService = class walletService {
    async getAmount(sellerId) {
        const getAmountSession = (0, _app.initializeDbConnection)().session();
        try {
            const walletAmount = await getAmountSession.executeRead((tx)=>tx.run('match (w)<-[:HAS_A]-(s:seller {id: $sellerId}) return w', {
                    sellerId: sellerId
                }));
            return walletAmount.records.map((record)=>record.get('w').properties.amount)[0];
        } catch (error) {
            console.log(error);
        } finally{
            getAmountSession.close();
        }
    }
    async UpdateAmount(sellerId, walletData) {
        const updateAmountSession = (0, _app.initializeDbConnection)().session();
        try {
            const updatedAmount = await updateAmountSession.executeWrite((tx)=>tx.run('match (w)<-[:HAS_A]-(s:seller {id: $sellerId}) set w.amount = w.amount + $newAmount return w', {
                    newAmount: (0, _neo4JDriver.int)(walletData.data.newAmount),
                    sellerId: sellerId
                }));
            return updatedAmount.records.map((record)=>record.get('w').properties)[0];
        } catch (error) {
            console.log(error);
        } finally{
            updateAmountSession.close();
        }
    }
};
const _default = walletService;

//# sourceMappingURL=wallet.service.js.map