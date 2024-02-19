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
const _authcontroller = /*#__PURE__*/ _interop_require_default(require("../controllers/auth.controller"));
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
let AuthRoute = class AuthRoute {
    initializeRoutes() {
        this.router.post(`${this.path}signup`, this.authController.signUp);
        this.router.post(`${this.path}login`, this.authController.logIn);
        this.router.post(`${this.path}refresh`, this.authController.generateRefreshToken);
        this.router.post(`${this.path}logout`, _authmiddleware.default, this.authController.logOut);
        this.router.post(`${this.path}changePassword/:email`, _authmiddleware.default, this.authController.changePassword);
        this.router.post(`${this.path}resendVerificationEmail/:email`, _authmiddleware.default, this.authController.resendVerificationEMail);
    }
    constructor(){
        _define_property(this, "path", '/');
        _define_property(this, "router", (0, _express.Router)());
        _define_property(this, "authController", new _authcontroller.default());
        this.initializeRoutes();
    }
};
const _default = AuthRoute;

//# sourceMappingURL=auth.route.js.map