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
const _HttpException = require("../exceptions/HttpException");
const _app = require("../app");
const sellerMiddleware = async (req, res, next)=>{
    const userId = String(req.params.id);
    const isVerifiedSession = (0, _app.initializeDbConnection)().session();
    try {
        var isVerifiedUser = await isVerifiedSession.executeRead((tx)=>tx.run("match (u:user {id: $userId})-[:IS_A]-(s:seller) return u, s", {
                userId: userId
            }));
        console.log(isVerifiedUser.records.map((record)=>record.get("u").properties.verified)[0]);
        if (isVerifiedUser.records.map((record)=>record.get("s")).length > 0) {
            if (isVerifiedUser.records.map((record)=>record.get("u").properties.verified)[0]) {
                next();
            } else {
                next(new _HttpException.HttpException(400, 'this user is not verified yet'));
            }
        } else {
            next(new _HttpException.HttpException(400, 'this user is not a seller'));
        }
    } catch (error) {
        console.log(error);
    }
};
const _default = sellerMiddleware;

//# sourceMappingURL=seller.middleware.js.map