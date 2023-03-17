"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _express = require("express");
const _usersController = _interopRequireDefault(require("../controllers/users.controller"));
const _usersDto = require("../dtos/users.dto");
const _validationMiddleware = _interopRequireDefault(require("../middlewares/validation.middleware"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let UsersRoute = class UsersRoute {
    initializeRoutes() {
        this.router.get(`${this.path}/:id`, this.usersController.getUserById);
        this.router.get(`${this.path}`, this.usersController.getUsers);
        this.router.get(`${this.path}/buy/:id`, this.usersController.buyPost);
        this.router.get(`${this.path}/confirmation/:token`, this.usersController.emailConfirming);
        this.router.get(`${this.path}/:email`, this.usersController.changePassword);
        this.router.post(`${this.path}`, (0, _validationMiddleware.default)(_usersDto.CreateUserDto, 'body'), this.usersController.createUser);
        this.router.put(`${this.path}/:id`, this.usersController.updateUser);
        this.router.post(`${this.path}/desactivate/:id`, this.usersController.desactivateUser);
    }
    constructor(){
        this.path = '/users';
        this.router = (0, _express.Router)();
        this.usersController = new _usersController.default();
        this.initializeRoutes();
    }
};
const _default = UsersRoute;

//# sourceMappingURL=users.route.js.map