/// <reference path="../src/make-fetch-happen.d.ts" />
import { GraphQLService, SchemaChangeCallback, Unsubscriber, GraphQLServiceEngineConfig } from 'apollo-server-core';
import { GraphQLExecutionResult, GraphQLRequestContextExecutionDidStart, ApolloConfig } from 'apollo-server-types';
import { InMemoryLRUCache } from 'apollo-server-caching';
import { GraphQLSchema, FragmentDefinitionNode, OperationDefinitionNode } from 'graphql';
import { ServiceDefinition } from '@apollo/federation';
import { buildQueryPlan, buildOperationContext } from './buildQueryPlan';
import { executeQueryPlan, ServiceMap } from './executeQueryPlan';
import { GraphQLDataSource } from './datasources/types';
import { QueryPlannerPointer, QueryPlan } from '@apollo/query-planner';
import { ServiceEndpointDefinition, Experimental_DidFailCompositionCallback, Experimental_DidResolveQueryPlanCallback, Experimental_DidUpdateCompositionCallback, Experimental_UpdateServiceDefinitions, Experimental_CompositionInfo, GatewayConfig, RemoteGatewayConfig, ManagedGatewayConfig } from './config';
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
export declare const GCS_RETRY_COUNT = 5;
export declare function getDefaultGcsFetcher(): import("make-fetch-happen").Fetcher & {
    defaults(opts?: (import("apollo-server-env").RequestInit & import("make-fetch-happen").FetcherOptions) | undefined): import("make-fetch-happen").Fetcher & any;
};
export declare const HEALTH_CHECK_QUERY = "query __ApolloServiceHealthCheck__ { __typename }";
export declare const SERVICE_DEFINITION_QUERY = "query __ApolloGetServiceDefinition__ { _service { sdl } }";
export declare class ApolloGateway implements GraphQLService {
    schema?: GraphQLSchema;
    protected serviceMap: DataSourceMap;
    protected config: GatewayConfig;
    private logger;
    protected queryPlanStore: InMemoryLRUCache<QueryPlan>;
    private apolloConfig?;
    private onSchemaChangeListeners;
    private serviceDefinitions;
    private compositionMetadata?;
    private serviceSdlCache;
    private warnedStates;
    private queryPlannerPointer?;
    private parsedCsdl?;
    private fetcher;
    private state;
    protected experimental_didResolveQueryPlan?: Experimental_DidResolveQueryPlanCallback;
    protected experimental_didFailComposition?: Experimental_DidFailCompositionCallback;
    protected experimental_didUpdateComposition?: Experimental_DidUpdateCompositionCallback;
    protected updateServiceDefinitions: Experimental_UpdateServiceDefinitions;
    protected experimental_pollInterval?: number;
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
    protected updateComposition(): Promise<void>;
    serviceHealthCheck(serviceMap?: DataSourceMap): Promise<{
        name: string;
        response: import("apollo-server-types").GraphQLResponse;
    }[]>;
    protected createSchema(input: {
        serviceList: ServiceDefinition[];
    } | {
        csdl: string;
    }): {
        schema: GraphQLSchema;
        composedSdl: string;
    };
    protected createSchemaFromServiceList(serviceList: ServiceDefinition[]): {
        schema: GraphQLSchema;
        composedSdl: string;
    };
    protected serviceListFromCsdl(): Omit<ServiceDefinition, "typeDefs">[];
    protected createSchemaFromCsdl(csdl: string): {
        schema: GraphQLSchema;
        composedSdl: string;
    };
    onSchemaChange(callback: SchemaChangeCallback): Unsubscriber;
    private pollServices;
    private createAndCacheDataSource;
    private createDataSource;
    protected createServices(services: ServiceEndpointDefinition[]): void;
    protected loadServiceDefinitions(config: RemoteGatewayConfig | ManagedGatewayConfig): ReturnType<Experimental_UpdateServiceDefinitions>;
    private maybeWarnOnConflictingConfig;
    executor: <TContext>(requestContext: GraphQLRequestContextExecutionDidStart<TContext>) => Promise<GraphQLExecutionResult>;
    private _executor;
    protected validateIncomingRequest<TContext>(requestContext: GraphQLRequestContextExecutionDidStart<TContext>, operationContext: OperationContext): readonly import("graphql").GraphQLError[];
    stop(): Promise<void>;
}
export { buildQueryPlan, executeQueryPlan, buildOperationContext, ServiceMap, Experimental_DidFailCompositionCallback, Experimental_DidResolveQueryPlanCallback, Experimental_DidUpdateCompositionCallback, Experimental_UpdateServiceDefinitions, GatewayConfig, ServiceEndpointDefinition, Experimental_CompositionInfo, };
export * from './datasources';
//# sourceMappingURL=index.d.ts.map