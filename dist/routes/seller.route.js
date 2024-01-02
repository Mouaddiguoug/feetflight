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
const _sellercontroller = /*#__PURE__*/ _interop_require_default(require("../controllers/seller.controller"));
const _multer = /*#__PURE__*/ _interop_require_default(require("multer"));
const _fileValidationmiddleware = /*#__PURE__*/ _interop_require_default(require("../middlewares/fileValidation.middleware"));
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
let sellerRoute = class sellerRoute {
    initializeRoutes() {
        this.router.post(`${this.path}/plans/:id`, this.sellerController.createSubscribePlans);
        this.router.get(`${this.path}/plans/:id`, this.sellerController.getSubscriptionPlans);
        this.router.get(`${this.path}/followers/:id`, this.sellerController.getFollowersCount);
        this.router.post(`${this.path}/upload/identitycard/:id`, (0, _multer.default)().fields([
            {
                name: 'frontSide',
                maxCount: 1
            },
            {
                name: 'backSide',
                maxCount: 1
            }
        ]), _fileValidationmiddleware.default, this.sellerController.uploadIdentityCard);
    }
    constructor(){
        _define_property(this, "path", '/sellers');
        _define_property(this, "router", (0, _express.Router)());
        _define_property(this, "sellerController", new _sellercontroller.default());
        this.initializeRoutes();
    }
};
const _default = sellerRoute;

//# sourceMappingURL=seller.route.js.map