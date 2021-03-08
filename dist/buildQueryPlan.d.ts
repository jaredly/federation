import { DocumentNode, GraphQLSchema } from 'graphql';
import { OperationContext } from './';
import { QueryPlan, QueryPlannerPointer } from '@apollo/query-planner';
export interface BuildQueryPlanOptions {
    autoFragmentization: boolean;
}
export declare function buildQueryPlan(operationContext: OperationContext, options?: BuildQueryPlanOptions): QueryPlan;
interface BuildOperationContextOptions {
    schema: GraphQLSchema;
    operationDocument: DocumentNode;
    operationString: string;
    queryPlannerPointer: QueryPlannerPointer;
    operationName?: string;
}
export declare function buildOperationContext({ schema, operationDocument, operationString, queryPlannerPointer, operationName, }: BuildOperationContextOptions): OperationContext;
export {};
//# sourceMappingURL=buildQueryPlan.d.ts.map