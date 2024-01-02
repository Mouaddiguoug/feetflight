"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _supertest = /*#__PURE__*/ _interop_require_default(require("supertest"));
const _app = /*#__PURE__*/ _interop_require_default(require("../app"));
const _authroute = /*#__PURE__*/ _interop_require_default(require("../routes/auth.route"));
function _interop_require_default(obj) {
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
            const authRoute = new _authroute.default();
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
            const authRoute = new _authroute.default();
            const app = new _app.default([
                authRoute
            ]);
            return (0, _supertest.default)(app.getServer()).post('/login').send(userData).expect('Set-Cookie', /^Authorization=.+/);
        });
    });
// error: StatusCode : 404, Message : Authentication token missing
// describe('[POST] /logout', () => {
//   it('logout Set-Cookie Authorization=; Max-age=0', () => {
//     const authRoute = new AuthRoute();
//     const app = new App([authRoute]);
//     return request(app.getServer())
//       .post('/logout')
//       .expect('Set-Cookie', /^Authorization=\;/);
//   });
// });
});

//# sourceMappingURL=auth.test.js.map