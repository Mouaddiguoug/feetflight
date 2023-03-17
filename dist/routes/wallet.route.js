"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _express = require("express");
const _walletController = _interopRequireDefault(require("../controllers/wallet.controller"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let walletRoute = class walletRoute {
    initializeRoutes() {
        this.router.post(`${this.path}/:id`, this.walletController.updateAmount);
    }
    constructor(){
        this.path = '/wallet';
        this.router = (0, _express.Router)();
        this.walletController = new _walletController.default();
        this.initializeRoutes();
    }
};
const _default = walletRoute;

//# sourceMappingURL=wallet.route.js.map