"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimSelectionNodes = exports.getResponseName = exports.serializeQueryPlan = void 0;
const graphql_1 = require("graphql");
const pretty_format_1 = __importDefault(require("pretty-format"));
const snapshotSerializers_1 = require("./snapshotSerializers");
function serializeQueryPlan(queryPlan) {
    return pretty_format_1.default(queryPlan, {
        plugins: [snapshotSerializers_1.queryPlanSerializer, snapshotSerializers_1.astSerializer],
    });
}
exports.serializeQueryPlan = serializeQueryPlan;
function getResponseName(node) {
    return node.alias ? node.alias : node.name;
}
exports.getResponseName = getResponseName;
exports.trimSelectionNodes = (selections) => {
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
//# sourceMappingURL=QueryPlan.js.map