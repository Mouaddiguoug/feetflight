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
const fileMiddleware = async (req, res, next)=>{
    try {
        if (req.files) {
            const fileeData = req.files;
            const filesTooLarge = [];
            if (fileeData.frontSide) {
                for(let key in fileeData){
                    if (fileeData[key][0].size > 5000000) filesTooLarge.push(fileeData[key][0].fieldname);
                }
                if (filesTooLarge.length > 0) {
                    return next(new _HttpException.HttpException(500, `${filesTooLarge.length > 0 ? "a file is too large maximum is 5mb and a file isn't an image" : filesTooLarge.length > 0 && 'a file is too large'}`));
                }
                next();
            } else {
                for(let key in fileeData){
                    if (fileeData[key].size > 5000000) filesTooLarge.push(fileeData[key].fieldname);
                }
                if (filesTooLarge.length > 0) {
                    return next(new _HttpException.HttpException(500, `${filesTooLarge.length > 0 ? "a file is too large maximum is 5mb and a file isn't an image" : filesTooLarge.length > 0 && 'a file is too large'}`));
                }
                next();
            }
        } else if (req.file) {
            const fileData = req.file;
            if (fileData.size > 5000000) return next(new _HttpException.HttpException(401, `${fileData.fieldname} is too large`));
            next();
        } else {
            next(new _HttpException.HttpException(500, 'file needed'));
        }
    } catch (error) {
        next(new _HttpException.HttpException(500, error));
    }
};
const _default = fileMiddleware;

//# sourceMappingURL=fileValidation.middleware.js.map