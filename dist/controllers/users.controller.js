"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _usersService = _interopRequireDefault(require("../services/users.service"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let UsersController = class UsersController {
    constructor(){
        this.userService = new _usersService.default();
        this.getUsers = async (req, res, next)=>{
            try {
                const findAllUsersData = await this.userService.findAllUser();
                res.status(200).json({
                    data: findAllUsersData,
                    message: 'findAll'
                });
            } catch (error) {
                next(error);
            }
        };
        this.getUserById = async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const findOneUserData = await this.userService.findUserById(userId);
                res.status(200).json({
                    data: findOneUserData
                });
            } catch (error) {
                next(error);
            }
        };
        this.changePassword = async (req, res, next)=>{
            try {
                const email = String(req.params.email);
                const userData = req.body;
                const findOneUserData = await this.userService.changePassword(email, userData);
                res.status(200).json({
                    data: findOneUserData,
                    message: 'findOne'
                });
            } catch (error) {
                next(error);
            }
        };
        this.emailConfirming = async (req, res, next)=>{
            try {
                const token = String(req.params.token);
                const confirmed = await this.userService.emailConfirming(token);
                res.status(201).json({
                    data: confirmed
                });
            } catch (error) {
                next(error);
            }
        };
        this.buyPost = async (req, res, next)=>{
            try {
                const postId = Number(req.params.id);
                const userData = req.body;
                const boughtPost = await this.userService.buyPost(postId, userData);
                res.status(200).json({
                    data: boughtPost
                });
            } catch (error) {
                next(error);
            }
        };
        this.updateUser = async (req, res, next)=>{
            try {
                const userId = Number(req.params.id);
                const userData = req.body;
                const updateUserData = await this.userService.updateUser(userId, userData);
                res.status(200).json({
                    data: updateUserData,
                    message: 'updated'
                });
            } catch (error) {
                next(error);
            }
        };
        this.desactivateUser = async (req, res, next)=>{
            try {
                const userId = Number(req.params.id);
                const desactivatedUser = await this.userService.desactivateUser(userId);
                res.status(200).json({
                    data: desactivatedUser
                });
            } catch (error) {
                next(error);
            }
        };
    }
};
const _default = UsersController;

//# sourceMappingURL=users.controller.js.map