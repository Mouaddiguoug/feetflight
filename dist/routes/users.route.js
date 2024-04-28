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
const _express = require("express");
const _userscontroller = /*#__PURE__*/ _interop_require_default(require("../controllers/users.controller"));
const _multer = /*#__PURE__*/ _interop_require_default(require("multer"));
const _fileValidationmiddleware = /*#__PURE__*/ _interop_require_default(require("../middlewares/fileValidation.middleware"));
const _authmiddleware = /*#__PURE__*/ _interop_require_default(require("../middlewares/auth.middleware"));
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
let UsersRoute = class UsersRoute {
    initializeRoutes() {
        this.router.get(`${this.path}/:id`, _authmiddleware.default, this.usersController.getUserById);
        this.router.get(`${this.path}`, _authmiddleware.default, this.usersController.getUsers);
        this.router.post(`${this.path}/buy/:id`, _authmiddleware.default, this.usersController.buyPost);
        this.router.post(`${this.path}/subscribe/:id`, _authmiddleware.default, this.usersController.subscribe);
        this.router.post(`${this.path}/buy/sent/:id`, _authmiddleware.default, this.usersController.unlockSentPicture);
        this.router.post(`${this.path}/unsubscribe/:id/:sellerId`, _authmiddleware.default, this.usersController.cancelSubscription);
        this.router.get(`${this.path}/confirmation/:token`, this.usersController.emailConfirming);
        this.router.get(`${this.path}/:email`, _authmiddleware.default, this.usersController.changePassword);
        this.router.get(`${this.path}/plans/:id`, _authmiddleware.default, this.usersController.getSellerPlans);
        this.router.get(`${this.path}/ai/generatePictures`, this.usersController.generateAiPictures);
        this.router.put(`${this.path}/:id`, _authmiddleware.default, this.usersController.updateUser);
        this.router.post(`${this.path}/generateOtp/:email`, this.usersController.generateOtp);
        this.router.post(`${this.path}/verifyOtp/:email`, this.usersController.verifyOtp);
        this.router.post(`${this.path}/signout/:id`, this.usersController.signOut);
        this.router.get(`${this.path}/verify/checkForSale/:userId/:postId/:plan`, this.usersController.checkForSale);
        this.router.post(`${this.path}/devices/token/:id`, _authmiddleware.default, this.usersController.uploadDeviceToken);
        this.router.post(`${this.path}/desactivate/:id`, this.usersController.desactivateUser);
        this.router.get(`${this.path}/followed/:id/:role`, this.usersController.getFollowedSellers);
        this.router.post(`${this.path}/upload/avatar/:id`, _authmiddleware.default, (0, _multer.default)().single('avatar'), _fileValidationmiddleware.default, this.usersController.uploadAvatar);
    }
    constructor(){
        _define_property(this, "path", '/users');
        _define_property(this, "router", (0, _express.Router)());
        _define_property(this, "usersController", new _userscontroller.default());
        this.initializeRoutes();
    }
};
const _default = UsersRoute;

//# sourceMappingURL=users.route.js.map