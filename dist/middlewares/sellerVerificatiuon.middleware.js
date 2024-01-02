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
const authMiddleware = async (req, res, next)=>{
    try {
        const isSellerVerifiedSession = (0, _app.initializeDbConnection)().session();
        const userId = String(req.params.id);
        if (userId) {
            const isSellerVerified = await isSellerVerifiedSession.executeRead((tx)=>tx.run('match (u:user {u:user userId: $userId}-[:IS_A]-(s:seller) return s', {
                    userId: userId
                }));
            if (isSellerVerified.records.map((record)=>record.get("s").properties.verified)) {
                req.data.user = isSellerVerified.records.map((record)=>record.get("s").properties)[0];
                next();
            } else {
                next(new _HttpException.HttpException(401, 'this user is not verified yet'));
            }
        } else {
            next(new _HttpException.HttpException(404, 'user id needed'));
        }
    } catch (error) {
        next(new _HttpException.HttpException(401, error));
    }
};
const _default = authMiddleware;

//# sourceMappingURL=sellerVerificatiuon.middleware.js.map