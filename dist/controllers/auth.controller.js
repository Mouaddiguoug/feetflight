"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _authService = _interopRequireDefault(require("../services/auth.service"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let AuthController = class AuthController {
    constructor(){
        this.authService = new _authService.default();
        this.signUp = async (req, res, next)=>{
            try {
                const userData = req.body;
                const signUpUserData = await this.authService.signup(userData);
                signUpUserData.message ? res.status(201).json(signUpUserData) : res.status(302).json(signUpUserData);
            } catch (error) {
                console.log(error);
            }
        };
        this.logIn = async (req, res, next)=>{
            try {
                const userData = req.body;
                const loggedInData = await this.authService.login(userData);
                res.status(200).json(loggedInData);
            } catch (error) {
                console.log(error);
            }
        };
        this.generateRefreshToken = async (req, res, next)=>{
            try {
                const token = req.body.data.token;
                const loggedInData = await this.authService.refreshToken(token);
                res.status(200).json(loggedInData);
            } catch (error) {
                next(error);
            }
        };
        this.logOut = async (req, res, next)=>{
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
        };
    }
};
const _default = AuthController;

//# sourceMappingURL=auth.controller.js.map