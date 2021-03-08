"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimSelectionNodes = exports.getResponseName = exports.getQueryPlan = exports.dropQueryPlanner = exports.getQueryPlanner = exports.prettyFormatQueryPlan = exports.astSerializer = exports.queryPlanSerializer = void 0;
const graphql_1 = require("graphql");
const wasm = __importStar(require("@apollo/query-planner-wasm"));
var snapshotSerializers_1 = require("./snapshotSerializers");
Object.defineProperty(exports, "queryPlanSerializer", { enumerable: true, get: function () { return snapshotSerializers_1.queryPlanSerializer; } });
Object.defineProperty(exports, "astSerializer", { enumerable: true, get: function () { return snapshotSerializers_1.astSerializer; } });
var prettyFormatQueryPlan_1 = require("./prettyFormatQueryPlan");
Object.defineProperty(exports, "prettyFormatQueryPlan", { enumerable: true, get: function () { return prettyFormatQueryPlan_1.prettyFormatQueryPlan; } });
function getQueryPlanner(schema) {
    return wasm.getQueryPlanner(schema);
}
exports.getQueryPlanner = getQueryPlanner;
function dropQueryPlanner(planner_ptr) {
    return wasm.dropQueryPlanner(planner_ptr);
}
exports.dropQueryPlanner = dropQueryPlanner;
function getQueryPlan(planner_ptr, query, options) {
    return wasm.getQueryPlan(planner_ptr, query, options);
}
exports.getQueryPlan = getQueryPlan;
function getResponseName(node) {
    return node.alias ? node.alias : node.name;
}
exports.getResponseName = getResponseName;
const trimSelectionNodes = (selections) => {
    const remapped = [];
    selections.forEach((selection) => {
        var _a;
        if (selection.kind === graphql_1.Kind.FIELD) {
            remapped.push({
                kind: graphql_1.Kind.FIELD,
                name: selection.name.value,
                selections: selection.selectionSet &&
                    exports.trimSelectionNodes(selection.selectionSet.selections),
            });
        }
        if (selection.kind === graphql_1.Kind.INLINE_FRAGMENT) {
            remapped.push({
                kind: graphql_1.Kind.INLINE_FRAGMENT,
                typeCondition: (_a = selection.typeCondition) === null || _a === void 0 ? void 0 : _a.name.value,
                selections: exports.trimSelectionNodes(selection.selectionSet.selections),
            });
        }
    });
    return remapped;
};
exports.trimSelectionNodes = trimSelectionNodes;
//# sourceMappingURL=index.js.map