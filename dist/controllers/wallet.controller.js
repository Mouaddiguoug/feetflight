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
const _walletservice = /*#__PURE__*/ _interop_require_default(require("../services/wallet.service"));
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
let WalletController = class WalletController {
    constructor(){
        _define_property(this, "walletService", new _walletservice.default());
        _define_property(this, "updateBalance", async (req, res, next)=>{
            try {
                const sellerId = String(req.params.id);
                const balanceData = req.body;
                const newAmount = await this.walletService.UpdateBalance(sellerId, balanceData);
                res.status(201).json({
                    data: newAmount
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getBalance", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const amountWallet = await this.walletService.getBalance(userId);
                res.status(201).json({
                    data: amountWallet
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getPostPictures", async (req, res, next)=>{
            try {
                const postId = String(req.params.id);
                const postPictures = await this.postService.getPostPictures(postId);
                res.status(201).json({
                    data: postPictures
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "updateViews", async (req, res, next)=>{
            try {
                const postId = String(req.params.id);
                const updatedViews = await this.postService.UpdateViews(postId);
                res.status(201).json({
                    updatedViews
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "createPost", async (req, res, next)=>{
            try {
                const postData = req.body;
                const userId = String(req.params.id);
                const createdPost = await this.postService.createPost(userId, postData);
                res.status(201).json({
                    data: createdPost
                });
            } catch (error) {
                next(error);
            }
        });
    }
};
const _default = WalletController;

//# sourceMappingURL=wallet.controller.js.map