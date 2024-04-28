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
const _app = require("../app");
const _uid = require("uid");
const _moment = /*#__PURE__*/ _interop_require_default(require("moment"));
const _messaging = require("firebase-admin/messaging");
const _stripe = /*#__PURE__*/ _interop_require_default(require("stripe"));
const _usersservice = /*#__PURE__*/ _interop_require_default(require("./users.service"));
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
let NotificationService = class NotificationService {
    async getNotofications(userId) {
        const getNotoficationsSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const notifications = await getNotoficationsSession.executeRead((tx)=>tx.run('match (notification:notification)<-[:got_notified]-(u:user {id: $userId}) return notification order by notification.time desc', {
                    userId: userId
                }));
            notifications.records.map((record)=>{
                let days = (0, _moment.default)().diff(record.get("notification").properties.time, "days");
                let hours = (0, _moment.default)().diff(record.get("notification").properties.time, "hours");
                let minutes = (0, _moment.default)().diff(record.get("notification").properties.time, "minutes");
                let seconds = (0, _moment.default)().diff(record.get("notification").properties.time, "seconds");
                if (days == 0) {
                    if (hours == 0) {
                        if (minutes == 0) {
                            if (seconds < 60) {
                                record.get("notification").properties.time = `${seconds} seconds`;
                            } else {
                                record.get("notification").properties.time = `${minutes} minutes`;
                            }
                        } else if (minutes < 60) {
                            record.get("notification").properties.time = `${minutes} minutes`;
                        } else {
                            record.get("notification").properties.time = `${hours} hours`;
                        }
                    } else if (hours < 24) {
                        record.get("notification").properties.time = `${hours} hours`;
                    } else {
                        record.get("notification").properties.time = `${days} days`;
                    }
                } else {
                    record.get("notification").properties.time = `${days} days`;
                }
            });
            return notifications.records.map((record)=>record.get("notification").properties);
        } catch (error) {
            console.log(error);
        } finally{
            getNotoficationsSession.close();
        }
    }
    async pushSellerNotificatons(sellerId, title, body) {
        const pushNotificatonsSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        const getTokensSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const deviceToken = await getTokensSession.executeRead((tx)=>tx.run('match (seller {id: $sellerId})<-[:IS_A]-(user:user)-[:logged_in_with]->(deviceToken:deviceToken) return deviceToken', {
                    sellerId: sellerId
                }));
            if (deviceToken.records.length > 0) {
                const message = {
                    notification: {
                        title: title,
                        body: body
                    },
                    token: deviceToken.records.map((record)=>record.get("deviceToken").properties.token)[0]
                };
                (0, _messaging.getMessaging)().send(message).then((res)=>{
                    console.log("successfully sent");
                }).catch((error)=>{
                    console.log(error);
                });
            }
            await pushNotificatonsSession.executeWrite((tx)=>tx.run('match (seller {id: $sellerId})<-[:IS_A]-(user:user) create (user)-[:got_notified]->(notification:notification {id: $notificationsId, title: $title, body: $body, time: $time}) return notification', {
                    sellerId: sellerId,
                    notificationsId: (0, _uid.uid)(10),
                    title: title,
                    body: body,
                    time: (0, _moment.default)().format('MMMM DD, YYYY, h:mm:ss a')
                }));
        } catch (error) {
            console.log(error);
        } finally{
            pushNotificatonsSession.close();
        }
    }
    constructor(){
        _define_property(this, "stripe", new _stripe.default(process.env.STRIPE_TEST_KEY, {
            apiVersion: '2022-11-15'
        }));
        _define_property(this, "userService", new _usersservice.default());
    }
};
const _default = NotificationService;

//# sourceMappingURL=notification.service.js.map