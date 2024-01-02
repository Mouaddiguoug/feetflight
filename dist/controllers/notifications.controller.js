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
const _notificationservice = /*#__PURE__*/ _interop_require_default(require("../services/notification.service"));
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
let NotificationController = class NotificationController {
    constructor(){
        _define_property(this, "notificationService", new _notificationservice.default());
        _define_property(this, "getNotifications", async (req, res, next)=>{
            const userId = req.params.id;
            try {
                const notifications = await this.notificationService.getNotofications(userId);
                res.status(201).json(notifications);
            } catch (error) {
                console.log(error);
            }
        });
    }
};
const _default = NotificationController;

//# sourceMappingURL=notifications.controller.js.map