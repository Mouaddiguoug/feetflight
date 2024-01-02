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
const _authservice = /*#__PURE__*/ _interop_require_default(require("../services/auth.service"));
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
let AuthController = class AuthController {
    constructor(){
        _define_property(this, "authService", new _authservice.default());
        _define_property(this, "signUp", async (req, res, next)=>{
            try {
                const userData = req.body;
                const signUpUserData = await this.authService.signup(userData);
                signUpUserData.message ? res.status(400).json(signUpUserData) : res.status(201).json(signUpUserData);
            } catch (error) {
                console.log(error);
            }
        });
        _define_property(this, "logIn", async (req, res, next)=>{
            try {
                const userData = req.body;
                const loggedInData = await this.authService.login(userData);
                loggedInData.message ? res.status(403).json(loggedInData) : res.status(200).json(loggedInData);
            } catch (error) {
                console.log(error);
            }
        });
        _define_property(this, "changePassword", async (req, res, next)=>{
            try {
                const userData = req.body;
                const email = String(req.params.email);
                const chengedData = await this.authService.changePassword(email, userData);
                console.log(chengedData.message);
                res.status(200).json(chengedData);
            } catch (error) {
                console.log(error);
            }
        });
        _define_property(this, "generateRefreshToken", async (req, res, next)=>{
            try {
                const id = req.body.id;
                const loggedInData = await this.authService.refreshToken(id);
                res.status(200).json(loggedInData);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "logOut", async (req, res, next)=>{
            try {
                const userData = req.user;
                const logOutUserData = await this.authService.logout(userData);
                res.setHeader('Set-Cookie', [
                    'Authorization=; Max-age=0'
                ]);
                res.status(200).json({
                    data: logOutUserData,
                    message: 'logout'
                });
            } catch (error) {
                next(error);
            }
        });
    }
};
const _default = AuthController;

//# sourceMappingURL=auth.controller.js.map