"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _express = require("express");
const _postController = _interopRequireDefault(require("../controllers/post.controller"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let postRoute = class postRoute {
    initializeRoutes() {
        this.router.get(`${this.path}/popular/:id`, this.postController.getPopularPosts);
        this.router.get(`${this.path}/recent/:id`, this.postController.getRecentPosts);
        this.router.get(`${this.path}/pictures/:id`, this.postController.getPostPictures);
        this.router.post(`${this.path}/:id`, this.postController.createPost);
        this.router.post(`${this.path}/likes/:id`, this.postController.likePost);
        this.router.put(`${this.path}/views/:id`, this.postController.updateViews);
    }
    constructor(){
        this.path = '/post';
        this.router = (0, _express.Router)();
        this.postController = new _postController.default();
        this.initializeRoutes();
    }
};
const _default = postRoute;

//# sourceMappingURL=post.route.js.map