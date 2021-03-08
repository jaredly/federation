import { GraphQLError, GraphQLSchema } from "graphql";
import { HeadersInit } from "node-fetch";
import { fetch } from 'apollo-server-env';
import { GraphQLRequestContextExecutionDidStart, Logger } from "apollo-server-types";
import { ServiceDefinition } from "@apollo/federation";
import { GraphQLDataSource } from './datasources/types';
import { QueryPlan } from '@apollo/query-planner';
import { OperationContext } from './';
import { ServiceMap } from './executeQueryPlan';
import { CompositionMetadata } from './loadServicesFromStorage';
export declare type ServiceEndpointDefinition = Pick<ServiceDefinition, 'name' | 'url'>;
export declare type Experimental_DidResolveQueryPlanCallback = ({ queryPlan, serviceMap, operationContext, requestContext, }: {
    readonly queryPlan: QueryPlan;
    readonly serviceMap: ServiceMap;
    readonly operationContext: OperationContext;
    readonly requestContext: GraphQLRequestContextExecutionDidStart<Record<string, any>>;
}) => void;
export declare type Experimental_DidFailCompositionCallback = ({ errors, serviceList, compositionMetadata, }: {
    readonly errors: GraphQLError[];
    readonly serviceList: ServiceDefinition[];
    readonly compositionMetadata?: CompositionMetadata;
}) => void;
export interface Experimental_CompositionInfo {
    serviceDefinitions: ServiceDefinition[];
    schema: GraphQLSchema;
    compositionMetadata?: CompositionMetadata;
}
export declare type Experimental_DidUpdateCompositionCallback = (currentConfig: Experimental_CompositionInfo, previousConfig?: Experimental_CompositionInfo) => void;
export declare type Experimental_UpdateServiceDefinitions = (config: DynamicGatewayConfig) => Promise<{
    serviceDefinitions?: ServiceDefinition[];
    compositionMetadata?: CompositionMetadata;
    isNewSchema: boolean;
}>;
interface GatewayConfigBase {
    debug?: boolean;
    logger?: Logger;
    __exposeQueryPlanExperimental?: boolean;
    buildService?: (definition: ServiceEndpointDefinition) => GraphQLDataSource;
    experimental_didResolveQueryPlan?: Experimental_DidResolveQueryPlanCallback;
    experimental_didFailComposition?: Experimental_DidFailCompositionCallback;
    experimental_didUpdateComposition?: Experimental_DidUpdateCompositionCallback;
    experimental_pollInterval?: number;
    experimental_approximateQueryPlanStoreMiB?: number;
    experimental_autoFragmentization?: boolean;
    fetcher?: typeof fetch;
    serviceHealthCheck?: boolean;
}
export interface RemoteGatewayConfig extends GatewayConfigBase {
    serviceList: ServiceEndpointDefinition[];
    introspectionHeaders?: HeadersInit;
}
export interface ManagedGatewayConfig extends GatewayConfigBase {
    federationVersion?: number;
}
interface ManuallyManagedGatewayConfig extends GatewayConfigBase {
    experimental_updateServiceDefinitions: Experimental_UpdateServiceDefinitions;
}
interface LocalGatewayConfig extends GatewayConfigBase {
    localServiceList: ServiceDefinition[];
}
interface CsdlGatewayConfig extends GatewayConfigBase {
    csdl: string;
}
export declare type StaticGatewayConfig = LocalGatewayConfig | CsdlGatewayConfig;
declare type DynamicGatewayConfig = ManagedGatewayConfig | RemoteGatewayConfig | ManuallyManagedGatewayConfig;
export declare type GatewayConfig = StaticGatewayConfig | DynamicGatewayConfig;
export declare function isLocalConfig(config: GatewayConfig): config is LocalGatewayConfig;
export declare function isRemoteConfig(config: GatewayConfig): config is RemoteGatewayConfig;
export declare function isCsdlConfig(config: GatewayConfig): config is CsdlGatewayConfig;
export declare function isManuallyManagedConfig(config: GatewayConfig): config is ManuallyManagedGatewayConfig;
export declare function isManagedConfig(config: GatewayConfig): config is ManagedGatewayConfig;
export declare function isStaticConfig(config: GatewayConfig): config is StaticGatewayConfig;
export declare function isDynamicConfig(config: GatewayConfig): config is DynamicGatewayConfig;
export {};
//# sourceMappingURL=config.d.ts.map