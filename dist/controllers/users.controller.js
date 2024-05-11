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
const _usersservice = /*#__PURE__*/ _interop_require_default(require("../services/users.service"));
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
let UsersController = class UsersController {
    constructor(){
        _define_property(this, "userService", new _usersservice.default());
        _define_property(this, "getUsers", async (req, res, next)=>{
            try {
                const findAllUsersData = await this.userService.findAllUser();
                res.status(200).json({
                    data: findAllUsersData,
                    message: 'findAll'
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getUserById", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const findOneUserData = await this.userService.findUserById(userId);
                res.status(200).json(findOneUserData);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "generateAiPictures", async (req, res, next)=>{
            try {
                const color = req.body.color;
                const category = req.body.category;
                const generatedPictures = await this.userService.generateAiPictures(color, category);
                res.status(200).json(generatedPictures);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "checkForSale", async (req, res, next)=>{
            try {
                const postId = String(req.params.postId);
                const userId = String(req.params.userId);
                const plan = String(req.params.plan);
                const checkedFOrSale = await this.userService.checkForSale(userId, postId);
                const checkForSubscription = await this.userService.checkForSubscriptionbyUserId(userId, postId, plan);
                console.log(checkForSubscription);
                res.status(200).json(checkedFOrSale || checkForSubscription);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getSellerPlans", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const sellerPlans = await this.userService.getSellerPlans(userId);
                res.status(200).json({
                    data: sellerPlans
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getFollowedSellers", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const role = String(req.params.role);
                const followedSellers = await this.userService.getFollowedSellers(userId, role);
                res.status(200).json(followedSellers);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "changePassword", async (req, res, next)=>{
            try {
                const email = String(req.params.email);
                const userData = req.body;
                const findOneUserData = await this.userService.changePassword(email, userData);
                res.status(200).json({
                    data: findOneUserData,
                    message: 'findOne'
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "emailConfirming", async (req, res, next)=>{
            try {
                const token = String(req.params.token);
                const confirmed = await this.userService.emailConfirming(token);
                res.status(201).redirect("/public/views/success_pages/verifyEmailSuccess.html");
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "buyPost", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const saleData = req.body;
                const boughtPost = await this.userService.buyPosts(userId, saleData);
                res.status(200).json({
                    url: boughtPost
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "subscribe", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const subscriptionData = req.body;
                const subscribeSssion = await this.userService.subscribe(userId, subscriptionData);
                res.status(200).json(subscribeSssion);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "unlockSentPicture", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const unlockSentPictureData = req.body;
                const unlockSentPictureSession = await this.userService.unlockSentPicture(userId, unlockSentPictureData);
                res.status(200).json(unlockSentPictureSession);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "generateOtp", async (req, res, next)=>{
            try {
                const email = String(req.params.email);
                const generatedHash = await this.userService.generateOtp(email);
                res.status(200).json(generatedHash);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "verifyOtp", async (req, res, next)=>{
            try {
                const email = String(req.params.email);
                const otpSettings = req.body;
                const result = await this.userService.verifyOtp(otpSettings, email);
                res.status(result.message == "success" ? 200 : 400).json(result);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "signOut", async (req, res, next)=>{
            try {
                const id = String(req.params.id);
                const result = await this.userService.signOut(id);
                res.status(result ? 200 : 400).json({
                    message: result ? "You have loged out successfully" : "Something went wrong"
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "contact", async (req, res, next)=>{
            try {
                const contactData = req.body;
                console.log(contactData);
                await this.userService.contact(contactData);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "cancelSubscription", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const sellerId = String(req.params.sellerId);
                const canceledSubscription = await this.userService.cancelSubscription(userId, sellerId);
                res.status(200).json({
                    canceledSubscription: canceledSubscription
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "checkForSubscribtion", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const postId = req.body.data.postId;
                const isSubscribed = await this.userService.checkForSubscription(userId, postId);
                res.status(200).json({
                    data: isSubscribed
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "updateUser", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const userData = req.body;
                const updateUserData = await this.userService.updateUser(userId, userData);
                res.status(200).json({
                    data: updateUserData,
                    message: 'updated'
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "uploadDeviceToken", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const token = req.body.token;
                await this.userService.uploadDeviceToken(userId, token);
                res.status(200).json({
                    message: 'token uploaded succcessfully'
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "desactivateUser", async (req, res, next)=>{
            try {
                const userId = Number(req.params.id);
                const desactivatedUser = await this.userService.desactivateUser(userId);
                res.status(200).json({
                    data: desactivatedUser
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "uploadAvatar", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const avatarData = req.file;
                await this.userService.uploadAvatar(avatarData, userId);
                res.status(201).json({
                    messazge: "avatar has been uploaded successfully"
                });
            } catch (error) {
                next(error);
            }
        });
    }
};
const _default = UsersController;

//# sourceMappingURL=users.controller.js.map