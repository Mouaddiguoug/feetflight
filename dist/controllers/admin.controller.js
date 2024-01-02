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
const _adminservice = /*#__PURE__*/ _interop_require_default(require("../services/admin.service"));
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
let AdminController = class AdminController {
    constructor(){
        _define_property(this, "adminService", new _adminservice.default());
        _define_property(this, "getSellerIdentityCardSession", async (req, res, next)=>{
            try {
                const userid = String(req.params.id);
                const identityCard = await this.adminService.getSellerIdentityCard(userid);
                res.status(201).json({
                    identityCardData: identityCard
                });
            } catch (error) {
                console.log(error);
            }
        });
        _define_property(this, "getUnverifiedSellers", async (req, res, next)=>{
            try {
                const unverifiedSellers = await this.adminService.getUnverifiedSellers();
                res.status(201).json({
                    unverifiedSellers: unverifiedSellers
                });
            } catch (error) {
                console.log(error);
            }
        });
    }
};
const _default = AdminController;

//# sourceMappingURL=admin.controller.js.map