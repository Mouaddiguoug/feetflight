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
const _postservice = /*#__PURE__*/ _interop_require_default(require("../services/post.service"));
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
let postController = class postController {
    constructor(){
        _define_property(this, "postService", new _postservice.default());
        _define_property(this, "getPopularAlbums", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                const popularPosts = await this.postService.getPopularAlbums(userId);
                res.status(201).json({
                    popularPosts
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getRandomAlbums", async (req, res, next)=>{
            try {
                const page = Number(req.params.page);
                const userId = String(req.params.id);
                const randomAlbums = await this.postService.getRandomAlbums(page, userId);
                res.status(201).json(randomAlbums);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getAlbumByCategory", async (req, res, next)=>{
            try {
                const categoryId = String(req.params.id);
                const AlbumByCategory = await this.postService.getAlbumByCategory(categoryId);
                res.status(201).json({
                    AlbumByCategory
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getPostPictures", async (req, res, next)=>{
            try {
                const postId = String(req.params.id);
                const postPictures = await this.postService.getPostPictures(postId);
                res.status(201).json({
                    data: postPictures
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getAllAlbums", async (req, res, next)=>{
            try {
                const userId = String(req.params.userId);
                const allAlbums = await this.postService.getAllAlbums(userId);
                res.status(201).json({
                    allAlbums
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getSellerAlbum", async (req, res, next)=>{
            try {
                const userId = String(req.params.id);
                console.log(userId);
                const sellerAlbums = await this.postService.getSellerAlbums(userId);
                res.status(201).json(sellerAlbums);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getCategories", async (req, res, next)=>{
            try {
                const categories = await this.postService.getCategories();
                console.log(categories);
                res.status(201).json({
                    categories
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "updateViews", async (req, res, next)=>{
            try {
                const postId = String(req.params.id);
                const updatedViews = await this.postService.UpdateViews(postId);
                res.status(201).json({
                    updatedViews
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "likePost", async (req, res, next)=>{
            try {
                const albumId = String(req.params.id);
                const userId = req.body.userId;
                await this.postService.likePost(albumId, userId);
                res.status(201).json({
                    message: "post liked successfully"
                });
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "getAlbumPlan", async (req, res, next)=>{
            try {
                const albumId = String(req.params.id);
                let plan = await this.postService.getAlbumPlan(albumId);
                res.status(200).json(plan);
            } catch (error) {
                next(error);
            }
        });
        _define_property(this, "createPost", async (req, res, next)=>{
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
        });
        _define_property(this, "uploadPostPictures", async (req, res, next)=>{
            try {
                const pictureFiles = req.files;
                const collectionId = String(req.params.id);
                await this.postService.uploadPostPictures(pictureFiles, collectionId);
                res.status(201).json({
                    message: "post pictures have been uploaded successfully"
                });
            } catch (error) {
                next(error);
            }
        });
    }
};
const _default = postController;

//# sourceMappingURL=post.controller.js.map