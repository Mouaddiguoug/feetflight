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
const _sellerservice = /*#__PURE__*/ _interop_require_default(require("../services/seller.service"));
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
let sellerController = class sellerController {
    constructor(){
        _define_property(this, "sellerService", new _sellerservice.default());
        _define_property(this, "getSubscriptionPlans", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const subscriptionPlans = await this.sellerService.getSubscriptiionPlans(userId);
                res.status(200).json({
                    subscriptionPlans
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "createSubscribePlans", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const subscriptionPlansData = req.body;
                const createdSubscriptionPlans = await this.sellerService.createSubscribePlans(userId, subscriptionPlansData);
                res.status(200).json({
                    createdSubscriptionPlans
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getFollowersCount", async (req, res, next)=>{
            try {
                const sellerId = String(req.params.id);
                const followersCount = await this.sellerService.getFollowersCount(sellerId);
                res.status(201).json({
                    followers: followersCount
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "updatePlans", async (req, res, next)=>{
            try {
                const plans = req.body.data;
                const result = await this.sellerService.changePlans(plans);
                res.status(201).json(result);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getAllSellers", async (req, res, next)=>{
            try {
                const result = await this.sellerService.getAllSellers();
                res.status(201).json(result);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "uploadIdentityCard", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const identityCardData = req.files;
                await this.sellerService.uploadIdentityCard(identityCardData, userId);
                res.status(201).json({
                    message: "identity card haq been uploaded successfully",
                    status: 200
                });
            } catch (error) {
                next(error);
            }
        });
    }
};
const _default = sellerController;

//# sourceMappingURL=seller.controller.js.map