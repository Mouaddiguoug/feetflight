"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _supertest = _interopRequireDefault(require("supertest"));
const _app = _interopRequireDefault(require("../app"));
const _usersModel = _interopRequireDefault(require("../models/users.model"));
const _usersRoute = _interopRequireDefault(require("../routes/users.route"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
afterAll(async ()=>{
    await new Promise((resolve)=>setTimeout(()=>resolve(), 500));
});
describe('Testing Users', ()=>{
    describe('[GET] /users', ()=>{
        it('response statusCode 200 / findAll', ()=>{
            const findUser = _usersModel.default;
            const usersRoute = new _usersRoute.default();
            const app = new _app.default([
                usersRoute
            ]);
            return (0, _supertest.default)(app.getServer()).get(`${usersRoute.path}`).expect(200, {
                data: findUser,
                message: 'findAll'
            });
        });
    });
    describe('[GET] /users/:id', ()=>{
        it('response statusCode 200 / findOne', ()=>{
            const userId = 1;
            const findUser = _usersModel.default.find((user)=>user.id === userId);
            const usersRoute = new _usersRoute.default();
            const app = new _app.default([
                usersRoute
            ]);
            return (0, _supertest.default)(app.getServer()).get(`${usersRoute.path}/${userId}`).expect(200, {
                data: findUser,
                message: 'findOne'
            });
        });
    });
    describe('[POST] /users', ()=>{
        it('response statusCode 201 / created', async ()=>{
            const userData = {
                email: 'example@email.com',
                password: 'password'
            };
            const usersRoute = new _usersRoute.default();
            const app = new _app.default([
                usersRoute
            ]);
            return (0, _supertest.default)(app.getServer()).post(`${usersRoute.path}`).send(userData).expect(201);
        });
    });
    describe('[PUT] /users/:id', ()=>{
        it('response statusCode 200 / updated', async ()=>{
            const userId = 1;
            const userData = {
                email: 'example@email.com',
                password: 'password'
            };
            const usersRoute = new _usersRoute.default();
            const app = new _app.default([
                usersRoute
            ]);
            return (0, _supertest.default)(app.getServer()).put(`${usersRoute.path}/${userId}`).send(userData).expect(200);
        });
    });
    describe('[DELETE] /users/:id', ()=>{
        it('response statusCode 200 / deleted', ()=>{
            const userId = 1;
            const deleteUser = _usersModel.default.filter((user)=>user.id !== userId);
            const usersRoute = new _usersRoute.default();
            const app = new _app.default([
                usersRoute
            ]);
            return (0, _supertest.default)(app.getServer()).delete(`${usersRoute.path}/${userId}`).expect(200, {
                data: deleteUser,
                message: 'deleted'
            });
        });
    });
});

//# sourceMappingURL=users.test.js.map