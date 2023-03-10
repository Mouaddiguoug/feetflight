"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _bcrypt = require("bcrypt");
const _jsonwebtoken = require("jsonwebtoken");
const _config = require("../config");
const _httpException = require("../exceptions/HttpException");
const _usersModel = _interopRequireDefault(require("../models/users.model"));
const _util = require("../utils/util");
const _app = require("../app");
const _rolesEnums = require("../enums/RolesEnums");
const _uid = _interopRequireDefault(require("uid"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let AuthService = class AuthService {
    async signup(userData) {
        if ((0, _util.isEmpty)(userData)) throw new _httpException.HttpException(400, 'userData is empty');
        const signupSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        const email = userData.data.email;
        try {
            const findUser = await signupSession.executeRead((tx)=>tx.run('match (u:user {email: $email}) return u', {
                    email: email
                }));
            if (findUser.records.length > 0) return {
                message: `This email ${userData.data.email} already exists`
            };
            const hashedPassword = await (0, _bcrypt.hash)(userData.data.password, 10);
            if (!userData.data.role) return {
                message: 'role needed'
            };
            switch(userData.data.role){
                case _rolesEnums.RolesEnum.SELLER:
                    if (!userData.data.subscriptionPrice || !userData.data.identityPhoto) return {
                        message: 'data missing'
                    };
                    const createUserSeller = await signupSession.executeWrite((tx)=>tx.run('create (u:user {id: $userId, name: $name, email: $email, userName: $userName, password: $password, createdAt: $createdAt, avatar: $avatar})-[r: IS_A]->(s:seller {id: $sellerId, verified: $verified, identityPhoto: $identityPhoto, subscriptionPrice: $subscriptionPrice}) return u', {
                            userId: _uid.default.uid(40),
                            buyerId: _uid.default.uid(40),
                            createdAt: Date.now(),
                            email: email,
                            avatar: userData.data.avatar ? userData.data.avatar : '',
                            userName: userData.data.userName,
                            name: userData.data.name,
                            password: hashedPassword,
                            sellerId: _uid.default.uid(40),
                            identityPhoto: userData.data.identityPhoto,
                            verified: false,
                            subscriptionPrice: userData.data.subscriptionPrice
                        }));
                    const sellerToken = this.createToken(createUserSeller.records.map((record)=>record.get('u').properties));
                    return {
                        data: createUserSeller.records.map((record)=>record.get('u').properties),
                        sellerToken
                    };
                    break;
                case _rolesEnums.RolesEnum.BUYER:
                    const createdUserBuyer = await signupSession.executeWrite((tx)=>tx.run('create (u:user {id: $userId, name: $name, email: $email, userName: $userName, password: $password, createdAt: $createdAt, avatar: $avatar})-[r: IS_A]->(b:buyer {id: $buyerId}) return u', {
                            userId: _uid.default.uid(40),
                            buyerId: _uid.default.uid(40),
                            createdAt: Date.now(),
                            email: email,
                            avatar: userData.data.avatar ? userData.data.avatar : '',
                            userName: userData.data.userName,
                            name: userData.data.name,
                            password: hashedPassword
                        }));
                    const buyerToken = this.createToken(createdUserBuyer.records.map((record)=>record.get('u').properties.id));
                    return {
                        data: createdUserBuyer.records.map((record)=>record.get('u').properties),
                        buyerToken
                    };
                    break;
            }
        } catch (error) {
            console.log(error);
        } finally{
            await signupSession.close();
        }
    }
    async login(userData) {
        if ((0, _util.isEmpty)(userData)) throw new _httpException.HttpException(400, 'userData is empty');
        const loginSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const email = userData.data.email;
            const findUser = await loginSession.executeRead((tx)=>tx.run('match (u:user {email: $email}) return u', {
                    email: email
                }));
            if (findUser.records.length == 0) return {
                message: `This email ${userData.data.email} doesn't exists`
            };
            const password = findUser.records.map((record)=>record.get('u').properties.password)[0];
            const isPasswordMatching = await (0, _bcrypt.compare)(userData.data.password, password);
            console.log(findUser);
            if (!isPasswordMatching) return {
                message: 'password or email is incorrect'
            };
            const tokenData = this.createToken(findUser.records.map((record)=>record.get('u').properties.id));
            return {
                tokenData,
                data: findUser.records.map((record)=>record.get('u').properties)
            };
        } catch (error) {
            console.log(error);
        } finally{
            loginSession.close();
        }
    }
    async refreshToken(token) {
        if (!token) return {
            message: 'missing token'
        };
        const refreshSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const secretKey = _config.SECRET_KEY;
            const decoded = (0, _jsonwebtoken.verify)(token, secretKey);
            const id = decoded.data[0];
            const findUser = await refreshSession.executeRead((tx)=>tx.run('match (u:user {id: $id}) return u', {
                    id: id
                }));
            if (findUser.records.length == 0) return {
                message: 'refresh token is invalid'
            };
            const refreshToken = this.createRefreshToken(token);
            return {
                refreshToken
            };
        } catch (error) {
            console.log(error);
        } finally{
            refreshSession.close();
        }
    }
    async logout(userData) {
        if ((0, _util.isEmpty)(userData)) throw new _httpException.HttpException(400, 'userData is empty');
        const findUser = this.users.find((user)=>user.email === userData.email && user.password === userData.password);
        if (!findUser) throw new _httpException.HttpException(409, "User doesn't exist");
        return findUser;
    }
    createToken(data) {
        try {
            const dataStoredInToken = {
                data
            };
            const secretKey = _config.SECRET_KEY;
            const expiresIn = 60 * 60;
            return {
                token: (0, _jsonwebtoken.sign)(dataStoredInToken, secretKey, {
                    expiresIn
                })
            };
        } catch (error) {
            console.log(error);
        }
    }
    createRefreshToken(data) {
        try {
            const dataStoredInToken = {
                data
            };
            const secretKey = _config.SECRET_KEY;
            const expiresIn = '30 days';
            return {
                token: (0, _jsonwebtoken.sign)(dataStoredInToken, secretKey, {
                    expiresIn
                })
            };
        } catch (error) {
            console.log(error);
        }
    }
    createCookie(tokenData) {
        return `Authorization=${tokenData.token}; HttpOnly; Max-Age=${tokenData.expiresIn};`;
    }
    constructor(){
        this.users = _usersModel.default;
    }
};
const _default = AuthService;

//# sourceMappingURL=auth.service.js.map