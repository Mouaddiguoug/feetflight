"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _app = _interopRequireDefault(require("./app"));
const _authRoute = _interopRequireDefault(require("./routes/auth.route"));
const _indexRoute = _interopRequireDefault(require("./routes/index.route"));
const _usersRoute = _interopRequireDefault(require("./routes/users.route"));
const _walletRoute = _interopRequireDefault(require("./routes/wallet.route"));
const _validateEnv = _interopRequireDefault(require("./utils/validateEnv"));
const _postRoute = _interopRequireDefault(require("./routes/post.route"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
(0, _validateEnv.default)();
const app = new _app.default([
    new _indexRoute.default(),
    new _usersRoute.default(),
    new _authRoute.default(),
    new _postRoute.default(),
    new _walletRoute.default()
]);
app.listen();

//# sourceMappingURL=server.js.map