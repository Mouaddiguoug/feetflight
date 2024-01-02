"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _app = /*#__PURE__*/ _interop_require_default(require("./app"));
const _authroute = /*#__PURE__*/ _interop_require_default(require("./routes/auth.route"));
const _indexroute = /*#__PURE__*/ _interop_require_default(require("./routes/index.route"));
const _usersroute = /*#__PURE__*/ _interop_require_default(require("./routes/users.route"));
const _walletroute = /*#__PURE__*/ _interop_require_default(require("./routes/wallet.route"));
const _validateEnv = /*#__PURE__*/ _interop_require_default(require("./utils/validateEnv"));
const _sellerroute = /*#__PURE__*/ _interop_require_default(require("./routes/seller.route"));
const _postroute = /*#__PURE__*/ _interop_require_default(require("./routes/post.route"));
const _adminroute = /*#__PURE__*/ _interop_require_default(require("./routes/admin.route"));
const _notificationsroute = /*#__PURE__*/ _interop_require_default(require("./routes/notifications.route"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
(0, _validateEnv.default)();
const app = new _app.default([
    new _indexroute.default(),
    new _usersroute.default(),
    new _authroute.default(),
    new _notificationsroute.default,
    new _postroute.default(),
    new _walletroute.default(),
    new _sellerroute.default(),
    new _adminroute.default()
]);
app.listen();

//# sourceMappingURL=server.js.map