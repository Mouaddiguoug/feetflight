"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _app = require("../app");
const _neo4jdriver = require("neo4j-driver");
const _stripe = /*#__PURE__*/ _interop_require_default(require("stripe"));
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let walletService = class walletService {
    async getBalance(userId) {
        const getAmountSession = (0, _app.initializeDbConnection)().session();
        try {
            const walletAmount = await getAmountSession.executeRead((tx)=>tx.run('match (w:wallet)<-[:HAS_A]-(s:seller)<-[:IS_A]-(:user {id: $userId}) return w', {
                    userId: userId
                }));
            return walletAmount.records.map((record)=>record.get('w').properties.amount)[0];
        } catch (error) {
            console.log(error);
        } finally{
            getAmountSession.close();
        }
    }
    async UpdateBalanceForPayment(sellerId, balanceAmount) {
        const updateAmountSession = (0, _app.initializeDbConnection)().session();
        try {
            await updateAmountSession.executeWrite((tx)=>tx.run('match (w:wallet)<-[:HAS_A]-(s:seller {id: $sellerId}) set w.amount = w.amount + $newAmount return w, s', {
                    newAmount: (0, _neo4jdriver.int)(balanceAmount),
                    sellerId: sellerId
                }));
        } catch (error) {
            console.log(error);
        } finally{
            updateAmountSession.close();
        }
    }
    async UpdateBalanceForSubscription(sellerId, balanceAmount) {
        const updateAmountSession = (0, _app.initializeDbConnection)().session();
        try {
            console.log(sellerId);
            const updatedAmount = await updateAmountSession.executeWrite((tx)=>tx.run('match (w:wallet)<-[:HAS_A]-(s:seller)-[:IS_A]-(u:user) set w.amount = w.amount + $newAmount return w, u', {
                    newAmount: (0, _neo4jdriver.int)(balanceAmount),
                    sellerId: sellerId
                }));
            console.log(updatedAmount.records);
            return updatedAmount.records.map((record)=>record.get('w').properties.amount)[0].low;
        } catch (error) {
            console.log(error);
        } finally{
            updateAmountSession.close();
        }
    }
    constructor(){
        _define_property(this, "stripe", new _stripe.default(process.env.STRIPE_TEST_KEY, {
            apiVersion: '2022-11-15'
        }));
    }
};
const _default = walletService;

//# sourceMappingURL=wallet.service.js.map