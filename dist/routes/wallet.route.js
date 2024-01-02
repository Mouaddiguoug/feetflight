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
const _walletcontroller = /*#__PURE__*/ _interop_require_default(require("../controllers/wallet.controller"));
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
let walletRoute = class walletRoute {
    initializeRoutes() {
        this.router.put(`${this.path}/:id`, _authmiddleware.default, this.walletController.updateBalance);
        this.router.get(`${this.path}/:id`, _authmiddleware.default, this.walletController.getBalance);
    }
    constructor(){
        _define_property(this, "path", '/wallet');
        _define_property(this, "router", (0, _express.Router)());
        _define_property(this, "walletController", new _walletcontroller.default());
        this.initializeRoutes();
    }
};
const _default = walletRoute;

//# sourceMappingURL=wallet.route.js.map