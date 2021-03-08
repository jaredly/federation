import { SelectionNode as GraphQLJSSelectionNode } from 'graphql';
export { queryPlanSerializer, astSerializer } from './snapshotSerializers';
export { prettyFormatQueryPlan } from './prettyFormatQueryPlan';
export declare type QueryPlannerPointer = number;
export declare function getQueryPlanner(schema: string): QueryPlannerPointer;
export declare function dropQueryPlanner(planner_ptr: QueryPlannerPointer): void;
export declare function getQueryPlan(planner_ptr: QueryPlannerPointer, query: string, options: any): QueryPlan;
export declare type ResponsePath = (string | number)[];
export interface QueryPlan {
    kind: 'QueryPlan';
    node?: PlanNode;
}
export declare type PlanNode = SequenceNode | ParallelNode | FetchNode | FlattenNode;
export interface SequenceNode {
    kind: 'Sequence';
    nodes: PlanNode[];
}
export interface ParallelNode {
    kind: 'Parallel';
    nodes: PlanNode[];
}
export interface FetchNode {
    kind: 'Fetch';
    serviceName: string;
    variableUsages?: string[];
    requires?: QueryPlanSelectionNode[];
    operation: string;
}
export interface FlattenNode {
    kind: 'Flatten';
    path: ResponsePath;
    node: PlanNode;
}
export declare type QueryPlanSelectionNode = QueryPlanFieldNode | QueryPlanInlineFragmentNode;
export interface QueryPlanFieldNode {
    readonly kind: 'Field';
    readonly alias?: string;
    readonly name: string;
    readonly selections?: QueryPlanSelectionNode[];
}
export interface QueryPlanInlineFragmentNode {
    readonly kind: 'InlineFragment';
    readonly typeCondition?: string;
    readonly selections: QueryPlanSelectionNode[];
}
export declare function getResponseName(node: QueryPlanFieldNode): string;
export declare const trimSelectionNodes: (selections: readonly GraphQLJSSelectionNode[]) => QueryPlanSelectionNode[];
//# sourceMappingURL=index.d.ts.map