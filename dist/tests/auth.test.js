"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _supertest = _interopRequireDefault(require("supertest"));
const _app = _interopRequireDefault(require("../app"));
const _authRoute = _interopRequireDefault(require("../routes/auth.route"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
afterAll(async ()=>{
    await new Promise((resolve)=>setTimeout(()=>resolve(), 500));
});
describe('Testing Auth', ()=>{
    describe('[POST] /signup', ()=>{
        it('response should have the Create userData', ()=>{
            const userData = {
                email: 'example@email.com',
                password: 'password'
            };
            const authRoute = new _authRoute.default();
            const app = new _app.default([
                authRoute
            ]);
            return (0, _supertest.default)(app.getServer()).post('/signup').send(userData);
        });
    });
    describe('[POST] /login', ()=>{
        it('response should have the Set-Cookie header with the Authorization token', async ()=>{
            const userData = {
                email: 'example1@email.com',
                password: 'password'
            };
            const authRoute = new _authRoute.default();
            const app = new _app.default([
                authRoute
            ]);
            return (0, _supertest.default)(app.getServer()).post('/login').send(userData).expect('Set-Cookie', /^Authorization=.+/);
        });
    });
});

//# sourceMappingURL=auth.test.js.map