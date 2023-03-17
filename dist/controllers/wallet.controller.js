"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _walletService = _interopRequireDefault(require("../services/wallet.service"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let WalletController = class WalletController {
    constructor(){
        this.walletService = new _walletService.default();
        this.updateAmount = async (req, res, next)=>{
            try {
                const sellerId = String(req.params.id);
                const walletData = req.body;
                const newAmount = await this.walletService.UpdateAmount(sellerId, walletData);
                res.status(201).json({
                    data: newAmount
                });
            } catch (error) {
                next(error);
            }
        };
        this.getAmountWallet = async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const amountWallet = await this.walletService.getAmount(userId);
                res.status(201).json({
                    data: amountWallet
                });
            } catch (error) {
                next(error);
            }
        };
        this.getPostPictures = async (req, res, next)=>{
            try {
                const postId = String(req.params.id);
                const postPictures = await this.postService.getPostPictures(postId);
                res.status(201).json({
                    data: postPictures
                });
            } catch (error) {
                next(error);
            }
        };
        this.updateViews = async (req, res, next)=>{
            try {
                const postId = String(req.params.id);
                const updatedViews = await this.postService.UpdateViews(postId);
                res.status(201).json({
                    updatedViews
                });
            } catch (error) {
                next(error);
            }
        };
        this.createPost = async (req, res, next)=>{
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
        };
    }
};
const _default = WalletController;

//# sourceMappingURL=wallet.controller.js.map