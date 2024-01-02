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
const _admincontroller = /*#__PURE__*/ _interop_require_default(require("../controllers/admin.controller"));
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
let AdminRoute = class AdminRoute {
    initializeRoutes() {
        this.router.get(`${this.path}/identityCard/:id`, this.AdminController.getSellerIdentityCardSession);
    }
    constructor(){
        _define_property(this, "path", '/admin');
        _define_property(this, "router", (0, _express.Router)());
        _define_property(this, "AdminController", new _admincontroller.default());
        this.initializeRoutes();
    }
};
const _default = AdminRoute;

//# sourceMappingURL=admin.route.js.map