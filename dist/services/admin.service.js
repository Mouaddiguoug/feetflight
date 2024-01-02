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
let adminService = class adminService {
    async getUnverifiedSellers() {
        const getSellerIdentityCardSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const seller = await getSellerIdentityCardSession.executeRead((tx)=>tx.run('match (s:seller {verified: false}) return s'));
            return seller.records.map((record)=>record.get("s").properties);
        } catch (error) {
            console.log(error);
        } finally{
            getSellerIdentityCardSession.close();
        }
    }
    async getSellerIdentityCard(userid) {
        const getSellerIdentityCardSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const seller = await getSellerIdentityCardSession.executeRead((tx)=>tx.run('match (user {id: $userid})-[:IS_A]-(s:seller) return s', {
                    userid: userid
                }));
            return {
                frontSide: seller.records.map((record)=>record.get("s").properties.frontIdentityCard)[0],
                backSide: seller.records.map((record)=>record.get("s").properties.backtIdentityCard)[0]
            };
        } catch (error) {
            console.log(error);
        } finally{
            getSellerIdentityCardSession.close();
        }
    }
    constructor(){
        _define_property(this, "stripe", new _stripe.default(process.env.STRIPE_TEST_KEY, {
            apiVersion: '2022-11-15'
        }));
    }
};
const _default = adminService;

//# sourceMappingURL=admin.service.js.map