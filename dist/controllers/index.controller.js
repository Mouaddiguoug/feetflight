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
let IndexController = class IndexController {
    constructor(){
        _define_property(this, "index", (req, res, next)=>{
            try {
                res.sendStatus(200);
            } catch (error) {
                next(error);
            }
        });
    }
};
const _default = IndexController;

//# sourceMappingURL=index.controller.js.map