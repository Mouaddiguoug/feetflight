"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _supertest = _interopRequireDefault(require("supertest"));
const _app = _interopRequireDefault(require("../app"));
const _indexRoute = _interopRequireDefault(require("../routes/index.route"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
afterAll(async ()=>{
    await new Promise((resolve)=>setTimeout(()=>resolve(), 500));
});
describe('Testing Index', ()=>{
    describe('[GET] /', ()=>{
        it('response statusCode 200', ()=>{
            const indexRoute = new _indexRoute.default();
            const app = new _app.default([
                indexRoute
            ]);
            return (0, _supertest.default)(app.getServer()).get(`${indexRoute.path}`).expect(200);
        });
    });
});

//# sourceMappingURL=index.test.js.map