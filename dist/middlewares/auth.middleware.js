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
const _jsonwebtoken = require("jsonwebtoken");
const _config = require("../config");
const _HttpException = require("../exceptions/HttpException");
const _app = require("../app");
const authMiddleware = async (req, res, next)=>{
    const Authorization = req.cookies['Authorization'] || (req.header('Authorization') ? req.header('Authorization').split('Bearer ')[1] : null);
    const authMiddlewareSession = (0, _app.initializeDbConnection)().session();
    if (Authorization) {
        try {
            const secretKey = _config.SECRET_KEY;
            const verificationResponse = (0, _jsonwebtoken.verify)(Authorization, secretKey);
            const userId = verificationResponse.id;
            console.log(verificationResponse);
            const foundUser = await authMiddlewareSession.executeRead((tx)=>tx.run('match (u:user {id: $userId}) return u', {
                    userId: userId
                }));
            if (foundUser.records.length > 0) {
                next();
            } else {
                next(new _HttpException.HttpException(400, 'Wrong authentication token'));
            }
        } catch (error) {
            console.log(error);
            next(new _HttpException.HttpException(401, 'missing token'));
        }
    } else {
        next(new _HttpException.HttpException(400, 'Authentication token missing'));
    }
};
const _default = authMiddleware;

//# sourceMappingURL=auth.middleware.js.map