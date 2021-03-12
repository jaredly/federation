import { GraphQLError, GraphQLSchema } from "graphql";
import { HeadersInit } from "node-fetch";
import { fetch } from 'apollo-server-env';
import { GraphQLRequestContextExecutionDidStart, Logger } from "apollo-server-types";
import { ServiceDefinition } from "@apollo/federation";
import { GraphQLDataSource } from './datasources/types';
import { QueryPlan } from '@apollo/query-planner';
import { OperationContext } from './';
import { ServiceMap } from './executeQueryPlan';
export declare type ServiceEndpointDefinition = Pick<ServiceDefinition, 'name' | 'url'>;
export declare type Experimental_DidResolveQueryPlanCallback = ({ queryPlan, serviceMap, operationContext, requestContext, }: {
    readonly queryPlan: QueryPlan;
    readonly serviceMap: ServiceMap;
    readonly operationContext: OperationContext;
    readonly requestContext: GraphQLRequestContextExecutionDidStart<Record<string, any>>;
}) => void;
interface ImplementingServiceLocation {
    name: string;
    path: string;
}
export interface CompositionMetadata {
    formatVersion: number;
    id: string;
    implementingServiceLocations: ImplementingServiceLocation[];
    schemaHash: string;
}
export declare type Experimental_DidFailCompositionCallback = ({ errors, serviceList, compositionMetadata, }: {
    readonly errors: GraphQLError[];
    readonly serviceList: ServiceDefinition[];
    readonly compositionMetadata?: CompositionMetadata;
}) => void;
export interface ServiceDefinitionCompositionInfo {
    serviceDefinitions: ServiceDefinition[];
    schema: GraphQLSchema;
    compositionMetadata?: CompositionMetadata;
}
export interface CsdlCompositionInfo {
    schema: GraphQLSchema;
    compositionId: string;
    csdl: string;
}
export declare type CompositionInfo = ServiceDefinitionCompositionInfo | CsdlCompositionInfo;
export declare type Experimental_DidUpdateCompositionCallback = (currentConfig: CompositionInfo, previousConfig?: CompositionInfo) => void;
export declare type CompositionUpdate = ServiceDefinitionUpdate | CsdlUpdate;
export interface ServiceDefinitionUpdate {
    serviceDefinitions?: ServiceDefinition[];
    compositionMetadata?: CompositionMetadata;
    isNewSchema: boolean;
}
export interface CsdlUpdate {
    id: string;
    csdl: string;
}
export declare function isCsdlUpdate(update: CompositionUpdate): update is CsdlUpdate;
export declare function isServiceDefinitionUpdate(update: CompositionUpdate): update is ServiceDefinitionUpdate;
export declare type Experimental_UpdateServiceDefinitions = (config: DynamicGatewayConfig) => Promise<ServiceDefinitionUpdate>;
export declare type Experimental_UpdateCsdl = (config: DynamicGatewayConfig) => Promise<CsdlUpdate>;
export declare type Experimental_UpdateComposition = (config: DynamicGatewayConfig) => Promise<CompositionUpdate>;
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
export interface LegacyManagedGatewayConfig extends GatewayConfigBase {
    federationVersion?: number;
}
export interface PrecomposedManagedGatewayConfig extends GatewayConfigBase {
    experimental_schemaConfigDeliveryEndpoint: string;
}
export declare type ManagedGatewayConfig = LegacyManagedGatewayConfig | PrecomposedManagedGatewayConfig;
interface ManuallyManagedServiceDefsGatewayConfig extends GatewayConfigBase {
    experimental_updateServiceDefinitions: Experimental_UpdateServiceDefinitions;
}
interface ManuallyManagedCsdlGatewayConfig extends GatewayConfigBase {
    experimental_updateCsdl: Experimental_UpdateCsdl;
}
declare type ManuallyManagedGatewayConfig = ManuallyManagedServiceDefsGatewayConfig | ManuallyManagedCsdlGatewayConfig;
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
export declare function isPrecomposedManagedConfig(config: GatewayConfig): config is PrecomposedManagedGatewayConfig;
export declare function isStaticConfig(config: GatewayConfig): config is StaticGatewayConfig;
export declare function isDynamicConfig(config: GatewayConfig): config is DynamicGatewayConfig;
export {};
//# sourceMappingURL=config.d.ts.map