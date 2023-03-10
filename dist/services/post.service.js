"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: ()=>_default
});
const _app = require("../app");
const _uid = require("uid");
const _moment = _interopRequireDefault(require("moment"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let postService = class postService {
    async getPopularPosts() {
        const popularPostsSessio = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const popularPosts = await popularPostsSessio.executeWrite((tx)=>tx.run('match (p:post)-[HAS_A]-(s:seller)-[IS_A]-(u:user) return u, p order by p.views DESC limit 20'));
            const posts = popularPosts.records.map((record)=>record.get('p').properties);
            posts.map((post, i)=>{
                const user = popularPosts.records.map((record)=>record.get('u').properties)[i];
                return post['user'] = user;
            });
            return posts;
        } catch (error) {
            console.log(error);
        } finally{
            popularPostsSessio.close();
        }
    }
    async getRecentPosts() {
        const recentPostsSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const popularPosts = await recentPostsSession.executeWrite((tx)=>tx.run('match (p:post)-[HAS_A]-(s:seller)-[IS_A]-(u:user) return u, p order by p.createdAt DESC limit 2'));
            const posts = popularPosts.records.map((record)=>record.get('p').properties);
            posts.map((post, i)=>{
                const user = popularPosts.records.map((record)=>record.get('u').properties)[i];
                return post['user'] = user;
            });
            return posts;
        } catch (error) {
            console.log(error);
        } finally{
            recentPostsSession.close();
        }
    }
    async UpdateViews(postId) {
        const updateViewsSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const newViews = await updateViewsSession.executeWrite((tx)=>tx.run('match (p:post {id: $postId}) set p.views = p.views + 1 return p.views', {
                    postId: postId
                }));
            return newViews.records[0]._fields[0].low;
        } catch (error) {
            console.log(error);
        } finally{
            updateViewsSession.close();
        }
    }
    async createPost(userId, postData) {
        const createPostSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            const findUser = await createPostSession.executeRead((tx)=>tx.run('match (u:user {id: $id}) return u', {
                    id: userId
                }));
            if (findUser.records.length == 0) return {
                message: `This user doesn't exists`
            };
            if (!postData.data.postTitle || !postData.data.postDescription || !postData.data.price || !postData.data.preview || !postData.data.pictures) return {
                message: `missing data`
            };
            const createdCollection = await createPostSession.executeWrite((tx)=>tx.run('match (u:user {id: $userId})-[IS_A]-(s:seller) create (s)-[h: HAS_A]->(p:post {id: $postId, description: $description, title: $title, price: $price, createdAt: $createdAt, views: 0})-[r: HAS_A]->(c:collection {id: $collectionId, preview: $preview}) return c', {
                    userId: userId,
                    postId: (0, _uid.uid)(40),
                    createdAt: (0, _moment.default)().format('MMMM DD, YYYY'),
                    title: postData.data.postTitle,
                    description: postData.data.postDescription,
                    price: postData.data.price,
                    collectionId: (0, _uid.uid)(40),
                    preview: postData.data.preview
                }));
            postData.data.pictures.map((picture)=>{
                this.createPictures(picture.description, picture.value, createdCollection.records.map((record)=>record.get('c').properties.id)[0]);
            });
            return createdCollection;
        } catch (error) {
            console.log(error);
        } finally{
            createPostSession.close();
        }
    }
    async createPictures(postDescription, value, collectionId) {
        const createPicturesSession = (0, _app.initializeDbConnection)().session({
            database: 'neo4j'
        });
        try {
            await createPicturesSession.executeWrite((tx)=>tx.run('match (c:collection {id: $collectionId}) create (c)-[r: HAS_A]->(p: picture {id: $pictureId, value: $value, description: $description})', {
                    description: postDescription,
                    pictureId: (0, _uid.uid)(40),
                    value: value,
                    collectionId: collectionId
                }));
        } catch (error) {
            console.log(error);
        } finally{
            createPicturesSession.close();
        }
    }
};
const _default = postService;

//# sourceMappingURL=post.service.js.map