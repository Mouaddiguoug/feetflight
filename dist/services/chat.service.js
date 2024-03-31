"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _stripe = /*#__PURE__*/ _interop_require_default(require("stripe"));
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
let chatService = class chatService {
    constructor(){
        _define_property(this, "stripe", new _stripe.default(process.env.STRIPE_TEST_KEY, {
            apiVersion: '2022-11-15'
        }));
    }
};

//# sourceMappingURL=chat.service.js.map