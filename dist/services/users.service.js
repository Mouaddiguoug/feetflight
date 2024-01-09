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
const _HttpException = require("../exceptions/HttpException");
const _nodefs = require("node:fs");
const _nodebuffer = require("node:buffer");
const _util = require("../utils/util");
const _app = require("../app");
const _jsonwebtoken = require("jsonwebtoken");
const _nodepath = /*#__PURE__*/ _interop_require_default(require("node:path"));
const _openai = /*#__PURE__*/ _interop_require_default(require("openai"));
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
let UserService = class UserService {
    async findUserById(userId) {
        const getUserSession = (0, _app.initializeDbConnection)().session();
        try {
            const result = await getUserSession.executeRead((tx)=>tx.run('match (u:user {id: $userId}) return u', {
                    userId: userId
                }));
            if (result.records.length == 0) throw new _HttpException.HttpException(409, "User doesn't exist");
            return result.records.map((record)=>record.get('u').properties)[0];
        } catch (error) {
            console.log(error);
        } finally{
            getUserSession.close();
        }
    }
    async generateAiPictures(color, category) {
        const getUserSession = (0, _app.initializeDbConnection)().session();
        try {
            const openai = new _openai.default({
                apiKey: process.env.OPENAI_API_KEY
            });
            const result = await openai.images.generate({
                prompt: `attractive feet with ${color} nailpolish and ${category}`,
                n: 5,
                size: "256x256"
            });
            return result.data;
        } catch (error) {
            console.log(error);
        } finally{
            getUserSession.close();
        }
    }
    async changePassword(email, userData) {
        if ((0, _util.isEmpty)(userData)) throw new _HttpException.HttpException(400, 'userData is empty');
        const hashedPassword = await (0, _bcrypt.hash)(userData.data.password, 10);
        const changePasswordSession = (0, _app.initializeDbConnection)().session();
        try {
            const updatedUser = await changePasswordSession.executeWrite((tx)=>tx.run('match (u:user {email: $email}) set u.password: $password return u', {
                    email: email,
                    password: hashedPassword
                }));
            if (!updatedUser.records.map((record)=>record.get('u').properties)) throw new _HttpException.HttpException(409, "User doesn't exist");
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
            const updatedUser = await updateUserSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId}) set u.name = $name, u.userName = $userName return u', {
                    userId: userId,
                    name: userData.data.name ? userData.data.name : existUser.name,
                    userName: userData.data.userName ? userData.data.userName : existUser.userName
                }));
            return updatedUser.records.map((record)=>record.get('u').properties)[0];
        } catch (error) {
            console.log(error);
        } finally{
            updateUserSession.close();
        }
    }
    async buyPosts(userId, saleData) {
        try {
            const pricesPromises = await saleData.data.posts.map((post)=>{
                return this.checkForSale(userId, post.id).then((exists)=>{
                    if (exists) return null;
                    return _app.stripe.prices.list({
                        product: post.id
                    }).then((price)=>{
                        return {
                            price: price.data[0].id,
                            quantity: 1
                        };
                    });
                });
            });
            const prices = await Promise.all(pricesPromises);
            if (prices.filter((price)=>price != null).length == 0) return {
                message: 'all posts selected have already been bought by this user'
            };
            const sellersPromises = await saleData.data.posts.map((post)=>{
                return _app.stripe.products.retrieve(post.id).then((product)=>{
                    return _app.stripe.prices.list({
                        product: post.id
                    }).then((price)=>{
                        return {
                            sellerId: product.metadata.sellerId,
                            productId: post.id,
                            amount: price.data[0].unit_amount
                        };
                    });
                });
            });
            const sellers = await Promise.all(sellersPromises);
            const session = await _app.stripe.checkout.sessions.create({
                success_url: 'https://example.com/success',
                line_items: prices.filter((price)=>price != null),
                mode: 'payment',
                customer: userId,
                metadata: {
                    sellersIds: sellers.map((record)=>{
                        return `sellerId:${record.sellerId}.postId:${record.productId}.amount:${record.amount * 0.01}`;
                    }).toString()
                }
            });
            return session.url;
        } catch (error) {
            console.log(error);
        }
    }
    async uploadDeviceToken(userId, token) {
        const uploadDeviceTokenSession = (0, _app.initializeDbConnection)().session();
        try {
            await uploadDeviceTokenSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId}) create (u)-[:GOT_DEVICE]->(:device {token: $token})', {
                    userId: userId,
                    token: token
                }));
        } catch (error) {
            console.log(error);
        } finally{
            uploadDeviceTokenSession.close();
        }
    }
    async desactivateUser(userId) {
        const desactivateUserSession = (0, _app.initializeDbConnection)().session();
        try {
            const desactivatedUser = await desactivateUserSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId}) set u.desactivated = true'));
            return desactivatedUser.records.map((record)=>record.get('u').properties)[0];
        } catch (error) {
            console.log(error);
        }
    }
    constructor(){
        _define_property(this, "prices", []);
        _define_property(this, "getSellersByPostId", async (postId)=>{
            const getSellersByPostIdSession = (0, _app.initializeDbConnection)().session();
            try {
                const sellers = await getSellersByPostIdSession.executeWrite((tx)=>tx.run('match (p:post {id: $postId})-[:HAS_A]-(s:seller) return s', {
                        postId: postId
                    }));
                return sellers.records.map((record)=>record.get('s').properties);
            } catch (error) {
                console.log(error);
            } finally{
                getSellersByPostIdSession.close();
            }
        });
        _define_property(this, "buyPost", async (postId, userId, sellerId, amount)=>{
            const buyPostSession = (0, _app.initializeDbConnection)().session();
            try {
                await buyPostSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId}), (p:post {id: $postId}) create (u)-[bought:BOUGHT_A]->(p) return bought', {
                        userId: userId,
                        postId: postId
                    }));
            } catch (error) {
                console.log(error);
            } finally{
                buyPostSession.close();
            }
        });
        _define_property(this, "subscribe", async (userId, subscriptionData)=>{
            const getSellerIdSession = (0, _app.initializeDbConnection)().session();
            try {
                const seller = await getSellerIdSession.executeWrite((tx)=>tx.run('match (user {id: $userId})-[:IS_A]-(s:seller) return s', {
                        userId: subscriptionData.data.sellerId
                    }));
                const sellerId = seller.records.map((record)=>record.get("s").properties.id)[0];
                if (await this.checkForSubscription(userId, sellerId)) return {
                    message: 'Already subscribed'
                };
                const session = await _app.stripe.checkout.sessions.create({
                    success_url: 'https://example.com/success',
                    line_items: [
                        {
                            price: subscriptionData.data.subscriptionPlanId,
                            quantity: 1
                        }
                    ],
                    mode: 'subscription',
                    currency: "EUR",
                    customer: userId,
                    metadata: {
                        sellerId: sellerId,
                        subscriptionPlanTitle: subscriptionData.data.subscriptionPlanTitle,
                        subscriptionPlanPrice: subscriptionData.data.subscriptionPlanPrice
                    }
                });
                return session;
            } catch (error) {
                console.log(error);
            }
        });
        _define_property(this, "createSubscriptioninDb", async (userId, sellerId, subscriptionPlanTitle, subscriptionPlanPrice)=>{
            const subscribeSession = (0, _app.initializeDbConnection)().session();
            try {
                if (await this.checkForSubscription(userId, sellerId)) return {
                    message: 'Already subscribed'
                };
                await subscribeSession.executeWrite((tx)=>{
                    tx.run('match (u:user {id: $userId}), (s:seller {id: $sellerId})<-[:IS_A]-(user:user) create (u)-[:SUBSCRIBED_TO {subscriptionPlanTitle: $subscriptionPlanTitle, subscriptionPlanPrice: $subscriptionPlanPrice}]->(s) set user.followers = user.followers + 1 set u.followings = u.followings + 1 return s', {
                        userId: userId,
                        sellerId: sellerId,
                        subscriptionPlanTitle: subscriptionPlanTitle,
                        subscriptionPlanPrice: subscriptionPlanPrice
                    });
                });
            } catch (error) {
                console.log(error);
            } finally{
                subscribeSession.close();
            }
        });
        _define_property(this, "cancelSubscription", async (userId, sellerId)=>{
            const cancelSubscriptionSession = (0, _app.initializeDbConnection)().session();
            try {
                if (!await this.checkForSubscription(userId, sellerId)) return {
                    message: 'no subscription'
                };
                await cancelSubscriptionSession.executeWrite((tx)=>{
                    tx.run('match (u:user {id: $userId})-[sub:SUBSCRIBED_TO]->(s:seller {id: $sellerId}) detach delete sub', {
                        userId: userId,
                        sellerId: sellerId
                    });
                });
                return {
                    message: 'subscription was canceled successfuly'
                };
            } catch (error) {
                console.log(error);
            } finally{
                cancelSubscriptionSession.close();
            }
        });
        _define_property(this, "checkForSale", async (userId, postId)=>{
            const checkForExistingRelationship = (0, _app.initializeDbConnection)().session();
            try {
                const saleAlreadyExists = await checkForExistingRelationship.executeWrite((tx)=>tx.run('match (u:user {id: $userId})-[bought:BOUGHT_A]->(p:post {id: $postId}) return bought', {
                        userId: userId,
                        postId: postId
                    }));
                return saleAlreadyExists.records.map((record)=>record.get('bought')).length > 0 ? true : false;
            } catch (error) {
                console.log(error);
            } finally{
                checkForExistingRelationship.close();
            }
        });
        _define_property(this, "getSellerPlans", async (userId)=>{
            const getSellerPlansSession = (0, _app.initializeDbConnection)().session();
            try {
                const sellerPlan = await getSellerPlansSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId})-[:IS_A]-(seller)-[:HAS_A]-(plan:plan) return plan', {
                        userId: userId
                    }));
                return sellerPlan.records.map((record)=>record.get('plan').properties);
            } catch (error) {
                console.log(error);
            } finally{
                getSellerPlansSession.close();
            }
        });
        _define_property(this, "checkForSubscription", async (userId, sellerId)=>{
            const checkForSubscriptionSession = (0, _app.initializeDbConnection)().session();
            try {
                const subscriptionAlreadyExist = await checkForSubscriptionSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId})-[subscribed:SUBSCRIBED_TO]->(s:seller {id: $sellerId}) return subscribed', {
                        userId: userId,
                        sellerId: sellerId
                    }));
                return subscriptionAlreadyExist.records.map((record)=>record.get('subscribed')).length > 0 ? true : false;
            } catch (error) {
                console.log(error);
            } finally{
                checkForSubscriptionSession.close();
            }
        });
        _define_property(this, "checkForSubscriptionbyUserId", async (userId, postId, plan)=>{
            const checkForSubscriptionSession = (0, _app.initializeDbConnection)().session();
            try {
                const subscriptionAlreadyExist = await checkForSubscriptionSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId})-[subscribed:SUBSCRIBED_TO {subscriptionPlanTitle: $plan}]->(s:seller)-[:HAS_A]->(p:post {id: $postId}) return subscribed', {
                        userId: userId,
                        postId: postId,
                        plan: plan
                    }));
                return subscriptionAlreadyExist.records.map((record)=>record.get('subscribed')).length > 0 ? true : false;
            } catch (error) {
                console.log(error);
            } finally{
                checkForSubscriptionSession.close();
            }
        });
        _define_property(this, "uploadAvatar", async (avatarData, userId)=>{
            try {
                /* aws.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: 'us-east-2',
      });
      const filecontent = Buffer.from(avatarData.buffer, 'binary');
      const s3 = new aws.S3();

      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${avatarData.fieldname}avatar${userId}.${avatarData.mimetype.split('/')[1]}`,
        Body: filecontent,
      };

      s3.upload(params, (err, data) => {
        if (err) return console.log(err);
        this.uploadAvatarToDb(data.Location, userId);
      }); */ const filecontent = _nodebuffer.Buffer.from(avatarData.buffer, 'binary');
                console.log(filecontent);
                (0, _nodefs.writeFile)(_nodepath.default.join(__dirname, '../../public/files/avatars', `avatar${userId}.${avatarData.mimetype.split("/")[1]}`), filecontent, async (err)=>{
                    if (err) return console.log(err);
                    await this.uploadAvatarToDb(`/public/files/avatars/avatar${userId}.${avatarData.mimetype.split("/")[1]}`, userId);
                });
            } catch (error) {
                console.log(error);
            }
        });
        _define_property(this, "uploadAvatarToDb", async (location, userId)=>{
            const uploadAvatarToDbSession = (0, _app.initializeDbConnection)().session();
            try {
                await uploadAvatarToDbSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId}) set u.avatar = $avatar', {
                        userId: userId,
                        avatar: location
                    }));
            } catch (error) {
                console.log(error);
            } finally{
                uploadAvatarToDbSession.close();
            }
        });
    }
};
const _default = UserService;

//# sourceMappingURL=users.service.js.map