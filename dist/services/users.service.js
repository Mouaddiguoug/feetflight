"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _bcrypt = require("bcrypt");
const _httpException = require("../exceptions/HttpException");
const _usersModel = _interopRequireDefault(require("../models/users.model"));
const _util = require("../utils/util");
const _app = require("../app");
const _jsonwebtoken = require("jsonwebtoken");
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let UserService = class UserService {
    async findAllUser() {
        const users = this.users;
        return users;
    }
    async findUserById(userId) {
        const getUserSession = (0, _app.initializeDbConnection)().session();
        try {
            const result = await getUserSession.executeRead((tx)=>tx.run('match (u:user {id: $userId}) return u', {
                    userId: userId
                }));
            if (!result.records.map((record)=>record.get('u').properties)) throw new _httpException.HttpException(409, "User doesn't exist");
            return result.records.map((record)=>record.get('u').properties)[0];
        } catch (error) {
            console.log(error);
        } finally{
            getUserSession.close();
        }
    }
    async changePassword(email, userData) {
        if ((0, _util.isEmpty)(userData)) throw new _httpException.HttpException(400, 'userData is empty');
        const hashedPassword = await (0, _bcrypt.hash)(userData.data.password, 10);
        const changePasswordSession = (0, _app.initializeDbConnection)().session();
        try {
            const updatedUser = await changePasswordSession.executeWrite((tx)=>tx.run('match (u:user {email: $email}) set u.password: $password return u', {
                    email: email,
                    password: hashedPassword
                }));
            if (!updatedUser.records.map((record)=>record.get('u').properties)) throw new _httpException.HttpException(409, "User doesn't exist");
            return updatedUser.records.map((record)=>record.get('u').properties);
        } catch (error) {
            console.log(error);
        } finally{
            changePasswordSession.close();
        }
    }
    async emailConfirming(token) {
        const confirmEmailSession = (0, _app.initializeDbConnection)().session();
        try {
            const tokenData = (0, _jsonwebtoken.verify)(token, process.env.EMAIL_SECRET);
            const checkConfirmation = await confirmEmailSession.executeRead((tx)=>tx.run('match (u:user {id: $userId}) return u', {
                    userId: tokenData.data
                }));
            if (checkConfirmation.records.map((record)=>record.get('u').properties.confirmed)[0]) return 'this account is already confirmed';
            const confirmed = await confirmEmailSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId}) set u.confirmed = true return u', {
                    userId: tokenData.data
                }));
            return confirmed.records.map((record)=>record.get('u').properties.confirmed)[0];
        } catch (error) {
            console.log(error);
        } finally{
            confirmEmailSession.close();
        }
    }
    async updateUser(userId, userData) {
        const updateUserSession = (0, _app.initializeDbConnection)().session();
        try {
            const existUser = await this.findUserById(userId);
            const updatedUser = await updateUserSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId}) set u.name = $name, u.avatar = $avatar, u.username = $username,  return u', {
                    userId: userId,
                    name: userData.data.name ? userData.data.name : existUser.name,
                    userName: userData.data.userName ? userData.data.userName : existUser.userName,
                    avatar: userData.data.avatar ? userData.data.avatar : existUser.avatar
                }));
            return updatedUser.records.map((record)=>record.get('u').properties)[0];
        } catch (error) {
            console.log(error);
        } finally{
            updateUserSession.close();
        }
    }
    async buyPost(postId, userData) {
        const butPostSession = (0, _app.initializeDbConnection)().session();
        try {
            const boughtPost = await butPostSession.executeWrite((tx)=>tx.run('match ()'));
            return boughtPost.records.map((record)=>record.get("u").properties)[0];
        } catch (error) {
            console.log(error);
        }
    }
    async desactivateUser(userId) {
        const desactivateUserSession = (0, _app.initializeDbConnection)().session();
        try {
            const desactivatedUser = await desactivateUserSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId}) set u.desactivated = true'));
            return desactivatedUser.records.map((record)=>record.get("u").properties)[0];
        } catch (error) {
            console.log(error);
        }
    }
    constructor(){
        this.users = _usersModel.default;
    }
};
const _default = UserService;

//# sourceMappingURL=users.service.js.map