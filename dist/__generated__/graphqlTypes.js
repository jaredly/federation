"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheControlScope = exports.MessageLevel = exports.FetchErrorCode = void 0;
var FetchErrorCode;
(function (FetchErrorCode) {
    FetchErrorCode["AuthenticationFailed"] = "AUTHENTICATION_FAILED";
    FetchErrorCode["AccessDenied"] = "ACCESS_DENIED";
    FetchErrorCode["UnknownRef"] = "UNKNOWN_REF";
    FetchErrorCode["RetryLater"] = "RETRY_LATER";
})(FetchErrorCode = exports.FetchErrorCode || (exports.FetchErrorCode = {}));
var MessageLevel;
(function (MessageLevel) {
    MessageLevel["Error"] = "ERROR";
    MessageLevel["Warn"] = "WARN";
    MessageLevel["Info"] = "INFO";
})(MessageLevel = exports.MessageLevel || (exports.MessageLevel = {}));
var CacheControlScope;
(function (CacheControlScope) {
    CacheControlScope["Public"] = "PUBLIC";
    CacheControlScope["Private"] = "PRIVATE";
})(CacheControlScope = exports.CacheControlScope || (exports.CacheControlScope = {}));
//# sourceMappingURL=graphqlTypes.js.map