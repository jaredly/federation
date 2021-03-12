import { GraphQLService, SchemaChangeCallback, Unsubscriber, GraphQLServiceEngineConfig } from 'apollo-server-core';
import { GraphQLExecutionResult, GraphQLRequestContextExecutionDidStart, ApolloConfig } from 'apollo-server-types';
import { GraphQLSchema, FragmentDefinitionNode, OperationDefinitionNode } from 'graphql';
import { buildQueryPlan, buildOperationContext } from './buildQueryPlan';
import { executeQueryPlan, ServiceMap } from './executeQueryPlan';
import { GraphQLDataSource } from './datasources/types';
import { Fetcher } from 'make-fetch-happen';
import { QueryPlannerPointer } from '@apollo/query-planner';
import { ServiceEndpointDefinition, Experimental_DidFailCompositionCallback, Experimental_DidResolveQueryPlanCallback, Experimental_DidUpdateCompositionCallback, Experimental_UpdateComposition, CompositionInfo, GatewayConfig, RemoteGatewayConfig, ManagedGatewayConfig, CompositionUpdate } from './config';
declare type FragmentMap = {
    [fragmentName: string]: FragmentDefinitionNode;
};
export declare type OperationContext = {
    schema: GraphQLSchema;
    operation: OperationDefinitionNode;
    fragments: FragmentMap;
    queryPlannerPointer: QueryPlannerPointer;
    operationString: string;
};
declare type DataSourceMap = {
    [serviceName: string]: {
        url?: string;
        dataSource: GraphQLDataSource;
    };
};
export declare function getDefaultFetcher(): Fetcher;
export declare const getDefaultGcsFetcher: typeof getDefaultFetcher;
export declare const GCS_RETRY_COUNT = 5;
export declare const HEALTH_CHECK_QUERY = "query __ApolloServiceHealthCheck__ { __typename }";
export declare const SERVICE_DEFINITION_QUERY = "query __ApolloGetServiceDefinition__ { _service { sdl } }";
export declare class ApolloGateway implements GraphQLService {
    schema?: GraphQLSchema;
    private serviceMap;
    private config;
    private logger;
    private queryPlanStore;
    private apolloConfig?;
    private onSchemaChangeListeners;
    private serviceDefinitions;
    private compositionMetadata?;
    private serviceSdlCache;
    private warnedStates;
    private queryPlannerPointer?;
    private parsedCsdl?;
    private fetcher;
    private compositionId?;
    private state;
    private experimental_didResolveQueryPlan?;
    private experimental_didFailComposition?;
    private experimental_didUpdateComposition?;
    private updateServiceDefinitions;
    private experimental_pollInterval?;
    private experimental_schemaConfigDeliveryEndpoint;
    constructor(config?: GatewayConfig);
    private initLogger;
    private initQueryPlanStore;
    private issueDynamicWarningsIfApplicable;
    cleanup(): void;
    load(options?: {
        apollo?: ApolloConfig;
        engine?: GraphQLServiceEngineConfig;
    }): Promise<{
        schema: GraphQLSchema;
        executor: <TContext>(requestContext: GraphQLRequestContextExecutionDidStart<TContext>) => Promise<GraphQLExecutionResult>;
    }>;
    private loadStatic;
    private loadDynamic;
    private shouldBeginPolling;
    private updateSchema;
    private updateByComposition;
    private updateWithCsdl;
    private maybePerformServiceHealthCheck;
    serviceHealthCheck(serviceMap?: DataSourceMap): Promise<{
        name: string;
        response: import("apollo-server-types").GraphQLResponse;
    }[]>;
    private createSchemaFromServiceList;
    private serviceListFromCsdl;
    private createSchemaFromCsdl;
    onSchemaChange(callback: SchemaChangeCallback): Unsubscriber;
    private pollServices;
    private createAndCacheDataSource;
    private createDataSource;
    private createServices;
    protected loadServiceDefinitions(config: RemoteGatewayConfig | ManagedGatewayConfig): Promise<CompositionUpdate>;
    private maybeWarnOnConflictingConfig;
    executor: <TContext>(requestContext: GraphQLRequestContextExecutionDidStart<TContext>) => Promise<GraphQLExecutionResult>;
    private _executor;
    private validateIncomingRequest;
    stop(): Promise<void>;
}
export { buildQueryPlan, executeQueryPlan, buildOperationContext, ServiceMap, Experimental_DidFailCompositionCallback, Experimental_DidResolveQueryPlanCallback, Experimental_DidUpdateCompositionCallback, Experimental_UpdateComposition, GatewayConfig, ServiceEndpointDefinition, CompositionInfo, };
export * from './datasources';
//# sourceMappingURL=index.d.ts.map