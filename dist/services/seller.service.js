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
const _nodebuffer = require("node:buffer");
const _nodefs = require("node:fs");
const _nodepath = /*#__PURE__*/ _interop_require_default(require("node:path"));
const _moment = /*#__PURE__*/ _interop_require_default(require("moment"));
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
let sellerService = class sellerService {
    async createSubscribePlans(userId, subscriptionPlansData) {
        try {
            const createdSubscriptionPlans = subscriptionPlansData.data.subscriptionPlans.map((subscriptionPlan)=>{
                return this.createSubscribePlan(subscriptionPlan.subscriptionPlanPrice, subscriptionPlan.subscriptionPlanTitle, userId);
            });
            const subscriptionPlans = await Promise.all(createdSubscriptionPlans);
            return subscriptionPlans;
        } catch (error) {
            console.log(error);
        }
    }
    async getSubscriptiionPlans(userId) {
        try {
            const getSubscriptionPlansSession = (0, _app.initializeDbConnection)().session();
            const subscriptionPlans = await getSubscriptionPlansSession.executeWrite((tx)=>tx.run('match (user {id: $userId})-[:IS_A]->(s:seller)-[:HAS_A]->(subscriptionPlan:subscriptionPlan) return subscriptionPlan', {
                    userId: userId
                }));
            return subscriptionPlans.records.map((record)=>record.get('subscriptionPlan').properties);
        } catch (error) {
            console.log(error);
        }
    }
    constructor(){
        _define_property(this, "stripe", new _stripe.default(process.env.STRIPE_TEST_KEY, {
            apiVersion: '2022-11-15'
        }));
        _define_property(this, "prices", []);
        _define_property(this, "createSubscribePlan", async (subscriptionPlanPrice, subscriptionPlanTitle, userId)=>{
            const createSubscribePlansSession = (0, _app.initializeDbConnection)().session();
            try {
                const product = await this.stripe.products.create({
                    name: subscriptionPlanTitle
                });
                const price = await this.stripe.prices.create({
                    unit_amount: subscriptionPlanPrice * 100,
                    currency: 'eur',
                    recurring: {
                        interval: 'month'
                    },
                    metadata: {
                        sellerId: userId
                    },
                    product: product.id
                });
                const createdPlans = await createSubscribePlansSession.executeWrite((tx)=>tx.run('match (user {id: $userId})-[:IS_A]->(s:seller) create (s)-[:HAS_A]->(subscriptionPlan:subscriptionPlan {id: $subscriptionPlanId, price: $subscriptionPlanPrice, title: $subscriptionPlanTitle}) return subscriptionPlan', {
                        subscriptionPlanPrice: subscriptionPlanPrice,
                        subscriptionPlanTitle: subscriptionPlanTitle,
                        userId: userId,
                        subscriptionPlanId: price.id
                    }));
                return createdPlans.records.map((record)=>record.get('subscriptionPlan').properties);
            } catch (error) {
                console.log(error);
            } finally{
                createSubscribePlansSession.close();
            }
        });
        _define_property(this, "getFollowersCount", async (sellerId)=>{
            const getFlowwersSession = (0, _app.initializeDbConnection)().session();
            try {
                const followersCount = await getFlowwersSession.executeWrite((tx)=>tx.run('match (u:user)-[s:SUBSCRIBED_TO]->(seller {id: $sellerId}) return count(s) as followersCount', {
                        sellerId: sellerId
                    }));
                return followersCount.records.map((record)=>record.get("followersCount"))[0].low;
            } catch (error) {
                console.log(error);
            } finally{
                getFlowwersSession.close();
            }
        });
        _define_property(this, "uploadIdentityCard", async (identityCardData, userId)=>{
            try {
                for(let key in identityCardData){
                    console.log(identityCardData[key][0]);
                    const filecontent = _nodebuffer.Buffer.from(identityCardData[key][0].buffer, 'binary');
                    (0, _nodefs.writeFile)(_nodepath.default.join(__dirname, "../../public/files/identity_cards", `${(0, _moment.default)().format("ssMMyyyy")}${userId}${identityCardData[key][0].originalname.replace(".", "")}`), filecontent, (err)=>{
                        if (err) return console.log(err);
                        this.uploadIdentityCardToDb(`/public/files/identity_cards/${(0, _moment.default)().format("ssMMyyyy")}${userId}${identityCardData[key][0].originalname.replace(".", "")}`, userId, identityCardData[key].fieldname);
                    });
                }
            } catch (error) {
                console.log(error);
            }
        });
        _define_property(this, "uploadIdentityCardToDb", async (location, userId, side)=>{
            const uploadIdentityCardSession = (0, _app.initializeDbConnection)().session();
            try {
                switch(side){
                    case 'frontSide':
                        await uploadIdentityCardSession.executeWrite((tx)=>tx.run('match (user {id: $userId})-[:IS_A]->(s:seller) set s.frontIdentityCard = $frontIdentityCard', {
                                userId: userId,
                                frontIdentityCard: location
                            }));
                        break;
                    case 'backSide':
                        await uploadIdentityCardSession.executeWrite((tx)=>tx.run('match (user {id: $userId})-[:IS_A]->(s:seller) set s.backtIdentityCard = $backIdentityCard', {
                                userId: userId,
                                backIdentityCard: location
                            }));
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.log(error);
            } finally{
                uploadIdentityCardSession.close();
            }
        });
    }
};
const _default = sellerService;

//# sourceMappingURL=seller.service.js.map