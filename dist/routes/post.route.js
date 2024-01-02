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
const _express = require("express");
const _postcontroller = /*#__PURE__*/ _interop_require_default(require("../controllers/post.controller"));
const _multer = /*#__PURE__*/ _interop_require_default(require("multer"));
const _fileValidationmiddleware = /*#__PURE__*/ _interop_require_default(require("../middlewares/fileValidation.middleware"));
const _authmiddleware = /*#__PURE__*/ _interop_require_default(require("../middlewares/auth.middleware"));
const _sellermiddleware = /*#__PURE__*/ _interop_require_default(require("../middlewares/seller.middleware"));
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
let postRoute = class postRoute {
    initializeRoutes() {
        this.router.get(`${this.path}/popular/:id`, _authmiddleware.default, this.postController.getPopularAlbums);
        this.router.get(`${this.path}/random/:page/:id`, this.postController.getRandomAlbums);
        this.router.get(`${this.path}/seller/:id`, this.postController.getSellerAlbum);
        this.router.get(`${this.path}/category/:id`, _authmiddleware.default, this.postController.getAlbumByCategory);
        this.router.get(`${this.path}/pictures/:id`, _authmiddleware.default, this.postController.getPostPictures);
        this.router.get(`${this.path}/all-categories`, _authmiddleware.default, this.postController.getCategories);
        this.router.get(`${this.path}/:id`, _authmiddleware.default, this.postController.getAllAlbums);
        this.router.get(`${this.path}/plan/:id`, this.postController.getAlbumPlan);
        this.router.post(`${this.path}/:id`, _authmiddleware.default, _sellermiddleware.default, this.postController.createPost);
        this.router.post(`${this.path}/upload/:id`, (0, _multer.default)().any(), _fileValidationmiddleware.default, this.postController.uploadPostPictures);
        this.router.post(`${this.path}/likes/:id`, this.postController.likePost);
        this.router.put(`${this.path}/views/:id`, _authmiddleware.default, this.postController.updateViews);
    }
    constructor(){
        _define_property(this, "path", '/albums');
        _define_property(this, "router", (0, _express.Router)());
        _define_property(this, "postController", new _postcontroller.default());
        this.initializeRoutes();
    }
};
const _default = postRoute;

//# sourceMappingURL=post.route.js.map