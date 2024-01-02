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
const _notificationscontroller = /*#__PURE__*/ _interop_require_default(require("../controllers/notifications.controller"));
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
let NotificationsRoute = class NotificationsRoute {
    initializeRoutes() {
        this.router.get(`${this.path}/:id`, this.notificationsController.getNotifications);
    }
    constructor(){
        _define_property(this, "path", '/notifications');
        _define_property(this, "router", (0, _express.Router)());
        _define_property(this, "notificationsController", new _notificationscontroller.default);
        this.initializeRoutes();
    }
};
const _default = NotificationsRoute;

//# sourceMappingURL=notifications.route.js.map