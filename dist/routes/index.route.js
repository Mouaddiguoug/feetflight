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
const _indexcontroller = /*#__PURE__*/ _interop_require_default(require("../controllers/index.controller"));
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
let IndexRoute = class IndexRoute {
    initializeRoutes() {
        this.router.get(`${this.path}`, this.indexController.index);
    }
    constructor(){
        _define_property(this, "path", '/');
        _define_property(this, "router", (0, _express.Router)());
        _define_property(this, "indexController", new _indexcontroller.default());
        this.initializeRoutes();
    }
};
const _default = IndexRoute;

//# sourceMappingURL=index.route.js.map