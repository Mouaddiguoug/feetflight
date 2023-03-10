"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _express = require("express");
const _authController = _interopRequireDefault(require("../controllers/auth.controller"));
const _authMiddleware = _interopRequireDefault(require("../middlewares/auth.middleware"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let AuthRoute = class AuthRoute {
    initializeRoutes() {
        this.router.post(`${this.path}signup`, this.authController.signUp);
        this.router.post(`${this.path}login`, this.authController.logIn);
        this.router.post(`${this.path}refresh`, this.authController.generateRefreshToken);
        this.router.post(`${this.path}logout`, _authMiddleware.default, this.authController.logOut);
    }
    constructor(){
        this.path = '/';
        this.router = (0, _express.Router)();
        this.authController = new _authController.default();
        this.initializeRoutes();
    }
};
const _default = AuthRoute;

//# sourceMappingURL=auth.route.js.map