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
const _bcrypt = require("bcrypt");
const _jsonwebtoken = require("jsonwebtoken");
const _config = require("../config");
const _HttpException = require("../exceptions/HttpException");
const _usersmodel = /*#__PURE__*/ _interop_require_default(require("../models/users.model"));
const _util = require("../utils/util");
const _app = require("../app");
const _RolesEnums = require("../enums/RolesEnums");
const _uid = /*#__PURE__*/ _interop_require_default(require("uid"));
const _moment = /*#__PURE__*/ _interop_require_default(require("moment"));
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
let AuthService = class AuthService {
    async signup(userData) {
        if ((0, _util.isEmpty)(userData)) throw new _HttpException.HttpException(400, 'userData is empty');
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
                case _RolesEnums.RolesEnum.SELLER:
                    if (!userData.data.phone || userData.data.plans.length == 0) return {
                        message: 'data missing'
                    };
                    const sellerCustomer = await _app.stripe.customers.create({
                        name: userData.data.name,
                        email: email,
                        balance: 0
                    });
                    const createUserSeller = await signupSession.executeWrite((tx)=>tx.run('create (u:user {id: $userId, name: $name, email: $email, userName: $userName, avatar: "", password: $password, createdAt: $createdAt, confirmed: false, verified: false, desactivated: false, phone: $phone, followers: $followers, followings: $followings})-[r: IS_A]->(s:seller {id: $sellerId, verified: $verified}) create (d:deviceToken {token: $token})<-[:logged_in_with]-(u) return u, s', {
                            userId: sellerCustomer.id,
                            followers: 0,
                            followings: 0,
                            buyerId: _uid.default.uid(40),
                            token: userData.data.deviceToken,
                            createdAt: (0, _moment.default)().format('MMMM DD, YYYY'),
                            email: email,
                            userName: userData.data.userName,
                            name: userData.data.name,
                            password: hashedPassword,
                            sellerId: _uid.default.uid(40),
                            verified: false,
                            phone: userData.data.phone
                        }));
                    await createWalletSession.executeWrite((tx)=>tx.run('match (s:seller {id: $sellerId}) create (s)-[:HAS_A]->(:wallet {id: $walletId, amount: 0.0})', {
                            sellerId: createUserSeller.records.map((record)=>record.get('s').properties.id)[0],
                            walletId: _uid.default.uid(40)
                        }));
                    userData.data.plans.map(async (plan)=>{
                        const createPlansSession = (0, _app.initializeDbConnection)().session({
                            database: 'neo4j'
                        });
                        try {
                            const stripeCreatedPlan = await _app.stripe.products.create({
                                name: plan.name
                            });
                            const stripeCreatedPrice = await _app.stripe.prices.create({
                                currency: "EUR",
                                product: stripeCreatedPlan.id,
                                recurring: {
                                    interval: "month",
                                    interval_count: 1
                                },
                                unit_amount: plan.price * 100
                            });
                            await createPlansSession.executeWrite((tx)=>tx.run('match (s:seller {id: $sellerId}) create (s)-[:HAS_A]->(:plan {id: $planId, name: $name, price: $price})', {
                                    sellerId: createUserSeller.records.map((record)=>record.get('s').properties.id)[0],
                                    planId: stripeCreatedPrice.id,
                                    name: plan.name,
                                    price: plan.price
                                }));
                        } catch (error) {
                            console.log(error);
                        } finally{
                            createPlansSession.close();
                        }
                    });
                    const sellerToken = this.createToken(process.env.EMAIL_SECRET, createUserSeller.records.map((record)=>record.get('u').properties.id)[0]);
                    this.sendVerificationEmail(email, userData.data.userName, sellerToken.token, 'selling');
                    return {
                        tokenData: sellerToken,
                        data: createUserSeller.records.map((record)=>record.get('u').properties)[0],
                        role: _RolesEnums.RolesEnum.SELLER
                    };
                    break;
                case _RolesEnums.RolesEnum.BUYER:
                    const buyer = await _app.stripe.customers.create({
                        name: userData.data.name,
                        email: email,
                        balance: 0
                    });
                    const createdUserBuyer = await signupSession.executeWrite((tx)=>tx.run('create (u:user {id: $userId, avatar: "", name: $name, email: $email, userName: $userName, password: $password, createdAt: $createdAt, confirmed: false})-[r: IS_A]->(b:buyer {id: $buyerId}) create (d:deviceToken {token: $token})<-[:logged_in_with]-(u) return u', {
                            userId: buyer.id,
                            buyerId: _uid.default.uid(40),
                            token: userData.data.deviceToken,
                            createdAt: (0, _moment.default)().format('MMMM DD, YYYY'),
                            email: email,
                            userName: userData.data.userName,
                            name: userData.data.name,
                            password: hashedPassword
                        }));
                    const buyerToken = this.createToken(process.env.EMAIL_SECRET, createdUserBuyer.records.map((record)=>record.get('u').properties.id)[0]);
                    this.sendVerificationEmail(email, userData.data.userName, buyerToken.token, 'finding');
                    return {
                        tokenData: buyerToken,
                        data: createdUserBuyer.records.map((record)=>record.get('u').properties)[0],
                        role: _RolesEnums.RolesEnum.BUYER
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
                template: 'verifying_email',
                from: process.env.USER_EMAIL,
                to: email,
                subject: 'Verifying Email',
                context: {
                    userName: userName,
                    token: token,
                    domain: process.env.DOMAIN,
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
    async resendVerificationEmail(email) {
        const getUserByEmailSession = (0, _app.initializeDbConnection)().session();
        const checkForRoleSession = (0, _app.initializeDbConnection)().session();
        try {
            const user = await getUserByEmailSession.executeRead((tx)=>tx.run("match (u:user {email: $email}) return u", {
                    email: email
                }));
            const role = await checkForRoleSession.executeRead((tx)=>tx.run("match (user:user {email: $email}), (s:seller) with true as isSeller where exists((user)-[:IS_A]->(s)) return isSeller", {
                    email: email
                }));
            console.log(role.records.map((record)=>record.get('isSeller')));
            const tokenData = this.createToken(process.env.EMAIL_SECRET, user.records.map((record)=>record.get('u').properties.id)[0]);
            const mailOptions = {
                template: 'verifying_email',
                from: process.env.USER_EMAIL,
                to: email,
                subject: 'Verifying Email',
                context: {
                    userName: user.records.map((record)=>record.get('u').properties.userName)[0],
                    token: tokenData.token,
                    domain: process.env.DOMAIN,
                    role: role.records.map((record)=>record.get('isSeller')).length > 0 ? "Seller" : "Buyer"
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
    async changePassword(email, userData) {
        const checkUserSession = (0, _app.initializeDbConnection)().session();
        const changePasswordSession = (0, _app.initializeDbConnection)().session();
        try {
            const findUser = await checkUserSession.executeRead((tx)=>tx.run('match (u:user {email: $email}) return u', {
                    email: email
                }));
            if (findUser.records.length == 0) return {
                message: `old password is incorrect`
            };
            const password = findUser.records.map((record)=>record.get('u').properties.password)[0];
            const isPasswordMatching = await (0, _bcrypt.compare)(userData.data.oldPassword, password);
            if (!isPasswordMatching) return {
                message: 'old password is incorrect'
            };
            const hashedPassword = await (0, _bcrypt.hash)(userData.data.newPassword, 10);
            const changedPassword = await changePasswordSession.executeWrite((tx)=>tx.run('match (u {email: $email}) set u.password = $newPassword return u', {
                    email: email,
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
        if ((0, _util.isEmpty)(userData)) throw new _HttpException.HttpException(400, 'userData is empty');
        const loginSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const email = userData.data.email;
            const findUser = await loginSession.executeRead((tx)=>tx.run('match (u:user {email: $email}) return u', {
                    email: email
                }));
            if (findUser.records.length == 0) return {
                message: `password or email is incorrect`
            };
            const password = findUser.records.map((record)=>record.get('u').properties.password)[0];
            const isPasswordMatching = await (0, _bcrypt.compare)(userData.data.password, password);
            const userId = findUser.records.map((record)=>record.get('u').properties.id)[0];
            const deviceToken = userData.data.deviceToken;
            if (!isPasswordMatching) return {
                message: 'password or email is incorrect'
            };
            const tokenData = this.createToken(process.env.SECRET_KEY, userId);
            const role = await loginSession.executeRead((tx)=>tx.run('match (u:user {id: $id})-[:IS_A]-(r:seller) return r', {
                    id: userId
                }));
            await loginSession.executeWrite((tx)=>tx.run('match (u:user {id: $id})-[:logged_in_with]->(d:deviceToken) set d.token = $token', {
                    id: userId,
                    token: deviceToken
                }));
            return {
                tokenData,
                data: findUser.records.map((record)=>record.get('u').properties)[0],
                role: role.records.length == 0 ? 'Buyer' : 'Seller'
            };
        } catch (error) {
            console.log(error);
        } finally{
            loginSession.close();
        }
    }
    async refreshToken(id) {
        if (!id) return {
            message: 'missing token'
        };
        const refreshSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const tokenData = this.createRefreshToken(id);
            return {
                tokenData
            };
        } catch (error) {
            console.log(error);
        } finally{
            refreshSession.close();
        }
    }
    async logout(userData) {
        if ((0, _util.isEmpty)(userData)) throw new _HttpException.HttpException(400, 'userData is empty');
        const findUser = this.users.find((user)=>user.email === userData.email && user.password === userData.password);
        if (!findUser) throw new _HttpException.HttpException(409, "User doesn't exist");
        return findUser;
    }
    createToken(secret, data) {
        try {
            const dataStoredInToken = {
                id: data
            };
            const secretKey = secret;
            const expiresAt = '280s';
            const expiresIn = new Date();
            console.log(expiresIn);
            expiresIn.setTime(expiresIn.getTime() + 60000);
            console.log(expiresIn);
            return {
                token: (0, _jsonwebtoken.sign)(dataStoredInToken, secretKey, {
                    expiresIn: expiresAt
                }),
                expiresIn: (0, _moment.default)(expiresIn).format("YYYY-MM-DD HH:mm:ss.ms")
            };
        } catch (error) {
            console.log(error);
        }
    }
    createRefreshToken(data) {
        try {
            const dataStoredInToken = {
                id: data,
                refresh: true
            };
            const secretKey = _config.SECRET_KEY;
            const expiresAt = '30d';
            const expiresIn = new Date();
            expiresIn.setTime(expiresIn.getTime() + 60);
            return {
                token: (0, _jsonwebtoken.sign)(dataStoredInToken, secretKey, {
                    expiresIn: expiresAt
                }),
                expiresIn: (0, _moment.default)(expiresIn).format("YYYY-MM-DD hh:mm:ss.ms")
            };
        } catch (error) {
            console.log(error);
        }
    }
    createCookie(tokenData) {
        return `Authorization=${tokenData.token}; HttpOnly; Max-Age=${tokenData.expiresIn};`;
    }
    constructor(){
        _define_property(this, "users", _usersmodel.default);
    }
};
const _default = AuthService;

//# sourceMappingURL=auth.service.js.map