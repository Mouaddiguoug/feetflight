"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _postService = _interopRequireDefault(require("../services/post.service"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let postController = class postController {
    constructor(){
        this.postService = new _postService.default();
        this.getPopularPosts = async (req, res, next)=>{
            try {
                const popularPosts = await this.postService.getPopularPosts();
                res.status(201).json({
                    data: popularPosts
                });
            } catch (error) {
                next(error);
            }
        };
        this.getRecentPosts = async (req, res, next)=>{
            try {
                const recentPosts = await this.postService.getRecentPosts();
                res.status(201).json({
                    data: recentPosts
                });
            } catch (error) {
                next(error);
            }
        };
        this.updateViews = async (req, res, next)=>{
            try {
                const postId = String(req.params.id);
                const updatedViews = await this.postService.UpdateViews(postId);
                res.status(201).json({
                    updatedViews
                });
            } catch (error) {
                next(error);
            }
        };
        this.createPost = async (req, res, next)=>{
            try {
                const postData = req.body;
                const userId = String(req.params.id);
                const createdPost = await this.postService.createPost(userId, postData);
                res.status(201).json({
                    data: createdPost
                });
            } catch (error) {
                next(error);
            }
        };
    }
};
const _default = postController;

//# sourceMappingURL=post.controller.js.map