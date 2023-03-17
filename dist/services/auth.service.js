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
const _moment = _interopRequireDefault(require("moment"));
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
        const createWalletSession = (0, _app.initializeDbConnection)().session({
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
            if (!userData.data.role || !userData.data.name || !userData.data.userName || !userData.data.password) return {
                message: 'mlissing data'
            };
            switch(userData.data.role){
                case _rolesEnums.RolesEnum.SELLER:
                    if (!userData.data.subscriptionPrice || !userData.data.identityPhoto) return {
                        message: 'data missing'
                    };
                    const createUserSeller = await signupSession.executeWrite((tx)=>tx.run('create (u:user {id: $userId, name: $name, email: $email, userName: $userName, password: $password, createdAt: $createdAt, avatar: $avatar, confirmed: false, desactivated: false})-[r: IS_A]->(s:seller {id: $sellerId, verified: $verified, identityPhoto: $identityPhoto, subscriptionPrice: $subscriptionPrice}) return u, s', {
                            userId: _uid.default.uid(40),
                            buyerId: _uid.default.uid(40),
                            createdAt: (0, _moment.default)().format('MMMM DD, YYYY'),
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
                    await createWalletSession.executeWrite((tx)=>tx.run('match (s:seller {id: $sellerId}) create (s)-[:HAS_A]->(wallet {id: $walletId, amount: 0})', {
                            sellerId: createUserSeller.records.map((record)=>record.get('s').properties.id)[0],
                            walletId: _uid.default.uid(40)
                        }));
                    const sellerToken = this.createToken(process.env.EMAIL_SECRET, createUserSeller.records.map((record)=>record.get('u').properties.id)[0]);
                    this.sendVerificationEmail(email, userData.data.userName, sellerToken.token, 'selling');
                    return {
                        data: createUserSeller.records.map((record)=>record.get('u').properties)
                    };
                    break;
                case _rolesEnums.RolesEnum.BUYER:
                    const createdUserBuyer = await signupSession.executeWrite((tx)=>tx.run('create (u:user {id: $userId, name: $name, email: $email, userName: $userName, password: $password, createdAt: $createdAt, avatar: $avatar, confirmed: false})-[r: IS_A]->(b:buyer {id: $buyerId}) return u', {
                            userId: _uid.default.uid(40),
                            buyerId: _uid.default.uid(40),
                            createdAt: (0, _moment.default)().format('MMMM DD, YYYY'),
                            email: email,
                            avatar: userData.data.avatar ? userData.data.avatar : '',
                            userName: userData.data.userName,
                            name: userData.data.name,
                            password: hashedPassword
                        }));
                    const buyerToken = this.createToken(process.env.EMAIL_SECRET, createdUserBuyer.records.map((record)=>record.get('u').properties.id)[0]);
                    this.sendVerificationEmail(email, userData.data.userName, buyerToken.token, 'finding');
                    return {
                        data: createdUserBuyer.records.map((record)=>record.get('u').properties)[0]
                    };
                    break;
            }
        } catch (error) {
            console.log(error);
        } finally{
            await signupSession.close();
            await createWalletSession.close();
        }
    }
    async sendVerificationEmail(email, userName, token, role) {
        try {
            const mailOptions = {
                template: 'main',
                from: process.env.USER,
                to: email,
                subject: 'Verifying Email',
                context: {
                    userName: userName,
                    token: token,
                    role: role
                }
            };
            _app.transporter.sendMail(mailOptions, (error, data)=>{
                if (error) console.log(error);
                if (!error) console.log('sent');
            });
        } catch (error) {
            console.log(error);
        }
    }
    async changePassword(userId, userData) {
        const changePasswordSession = (0, _app.initializeDbConnection)().session();
        try {
            const hashedPassword = await (0, _bcrypt.hash)(userData.data.password, 10);
            const changedPassword = await changePasswordSession.executeRead((tx)=>tx.run('match (u {id: $userId}) set u.password = $newPassword return w', {
                    userId: userId,
                    newPassword: hashedPassword
                }));
            return changedPassword.records.map((record)=>record.get('u').properties)[0];
        } catch (error) {
            console.log(error);
        } finally{
            changePasswordSession.close();
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
            if (!findUser.records.map((record)=>record.get('u').properties.confirmed)[0]) return {
                message: `This email is not confirmed please confirm your email`
            };
            const password = findUser.records.map((record)=>record.get('u').properties.password)[0];
            const isPasswordMatching = await (0, _bcrypt.compare)(userData.data.password, password);
            if (!isPasswordMatching) return {
                message: 'password or email is incorrect'
            };
            const tokenData = this.createToken(process.env.SECRET_KEY, findUser.records.map((record)=>record.get('u').properties.id));
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
    createToken(secret, data) {
        try {
            const dataStoredInToken = {
                data
            };
            const secretKey = secret;
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