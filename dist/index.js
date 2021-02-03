"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOperationContext = exports.serializeQueryPlan = exports.executeQueryPlan = exports.buildQueryPlan = exports.ApolloGateway = exports.SERVICE_DEFINITION_QUERY = exports.HEALTH_CHECK_QUERY = exports.getDefaultGcsFetcher = exports.GCS_RETRY_COUNT = void 0;
const apollo_server_caching_1 = require("apollo-server-caching");
const graphql_1 = require("graphql");
const apollo_graphql_1 = require("apollo-graphql");
const federation_1 = require("@apollo/federation");
const loglevel_1 = __importDefault(require("loglevel"));
const buildQueryPlan_1 = require("./buildQueryPlan");
Object.defineProperty(exports, "buildQueryPlan", { enumerable: true, get: function () { return buildQueryPlan_1.buildQueryPlan; } });
Object.defineProperty(exports, "buildOperationContext", { enumerable: true, get: function () { return buildQueryPlan_1.buildOperationContext; } });
const executeQueryPlan_1 = require("./executeQueryPlan");
Object.defineProperty(exports, "executeQueryPlan", { enumerable: true, get: function () { return executeQueryPlan_1.executeQueryPlan; } });
const loadServicesFromRemoteEndpoint_1 = require("./loadServicesFromRemoteEndpoint");
const loadServicesFromStorage_1 = require("./loadServicesFromStorage");
const QueryPlan_1 = require("./QueryPlan");
Object.defineProperty(exports, "serializeQueryPlan", { enumerable: true, get: function () { return QueryPlan_1.serializeQueryPlan; } });
const RemoteGraphQLDataSource_1 = require("./datasources/RemoteGraphQLDataSource");
const values_1 = require("graphql/execution/values");
const make_fetch_happen_1 = __importDefault(require("make-fetch-happen"));
const cache_1 = require("./cache");
const query_planner_wasm_1 = require("@apollo/query-planner-wasm");
function isLocalConfig(config) {
    return 'localServiceList' in config;
}
function isRemoteConfig(config) {
    return 'serviceList' in config;
}
function isManagedConfig(config) {
    return !isRemoteConfig(config) && !isLocalConfig(config);
}
exports.GCS_RETRY_COUNT = 5;
function getDefaultGcsFetcher() {
    return make_fetch_happen_1.default.defaults({
        cacheManager: new cache_1.HttpRequestCache(),
        headers: {
            'user-agent': `apollo-gateway/${require('../package.json').version}`,
        },
        retry: {
            retries: exports.GCS_RETRY_COUNT,
            factor: 2,
            minTimeout: 1000,
            randomize: true,
        },
    });
}
exports.getDefaultGcsFetcher = getDefaultGcsFetcher;
exports.HEALTH_CHECK_QUERY = 'query __ApolloServiceHealthCheck__ { __typename }';
exports.SERVICE_DEFINITION_QUERY = 'query __ApolloGetServiceDefinition__ { _service { sdl } }';
class ApolloGateway {
    constructor(config) {
        this.serviceMap = Object.create(null);
        this.onSchemaChangeListeners = new Set();
        this.serviceDefinitions = [];
        this.serviceSdlCache = new Map();
        this.warnedStates = Object.create(null);
        this.fetcher = getDefaultGcsFetcher();
        this.executor = async (requestContext) => {
            const { request, document, queryHash, source } = requestContext;
            const queryPlanStoreKey = queryHash + (request.operationName || '');
            const operationContext = buildQueryPlan_1.buildOperationContext({
                schema: this.schema,
                operationDocument: document,
                operationString: source,
                queryPlannerPointer: this.queryPlannerPointer,
                operationName: request.operationName,
            });
            const validationErrors = this.validateIncomingRequest(requestContext, operationContext);
            if (validationErrors.length > 0) {
                return { errors: validationErrors };
            }
            let queryPlan;
            if (this.queryPlanStore) {
                queryPlan = await this.queryPlanStore.get(queryPlanStoreKey);
            }
            if (!queryPlan) {
                queryPlan = buildQueryPlan_1.buildQueryPlan(operationContext, {
                    autoFragmentization: Boolean(this.config.experimental_autoFragmentization),
                });
                if (this.queryPlanStore) {
                    Promise.resolve(this.queryPlanStore.set(queryPlanStoreKey, queryPlan)).catch(err => this.logger.warn('Could not store queryPlan' + ((err && err.message) || err)));
                }
            }
            const serviceMap = Object.entries(this.serviceMap).reduce((serviceDataSources, [serviceName, { dataSource }]) => {
                serviceDataSources[serviceName] = dataSource;
                return serviceDataSources;
            }, Object.create(null));
            if (this.experimental_didResolveQueryPlan) {
                this.experimental_didResolveQueryPlan({
                    queryPlan,
                    serviceMap,
                    requestContext,
                    operationContext,
                });
            }
            const response = await executeQueryPlan_1.executeQueryPlan(queryPlan, serviceMap, requestContext, operationContext);
            const shouldShowQueryPlan = this.config.__exposeQueryPlanExperimental &&
                request.http &&
                request.http.headers &&
                request.http.headers.get('Apollo-Query-Plan-Experimental');
            const serializedQueryPlan = queryPlan.node && (this.config.debug || shouldShowQueryPlan)
                ? QueryPlan_1.serializeQueryPlan(queryPlan)
                : null;
            if (this.config.debug && serializedQueryPlan) {
                this.logger.debug(serializedQueryPlan);
            }
            if (shouldShowQueryPlan) {
                response.extensions = {
                    __queryPlanExperimental: serializedQueryPlan || true,
                };
            }
            return response;
        };
        this.config = {
            __exposeQueryPlanExperimental: process.env.NODE_ENV !== 'production',
            ...config,
        };
        if (this.config.logger) {
            this.logger = this.config.logger;
        }
        else {
            const loglevelLogger = loglevel_1.default.getLogger(`apollo-gateway`);
            if (this.config.debug === true) {
                loglevelLogger.setLevel(loglevelLogger.levels.DEBUG);
            }
            else {
                loglevelLogger.setLevel(loglevelLogger.levels.WARN);
            }
            this.logger = loglevelLogger;
        }
        if (isLocalConfig(this.config)) {
            const { schema, composedSdl } = this.createSchema(this.config.localServiceList);
            this.schema = schema;
            if (!composedSdl) {
                this.logger.error("A valid schema couldn't be composed.");
            }
            else {
                this.queryPlannerPointer = query_planner_wasm_1.getQueryPlanner(composedSdl);
            }
        }
        this.initializeQueryPlanStore();
        this.updateServiceDefinitions = this.loadServiceDefinitions;
        if (config) {
            this.updateServiceDefinitions =
                config.experimental_updateServiceDefinitions ||
                    this.updateServiceDefinitions;
            this.experimental_didResolveQueryPlan =
                config.experimental_didResolveQueryPlan;
            this.experimental_didFailComposition =
                config.experimental_didFailComposition;
            this.experimental_didUpdateComposition =
                config.experimental_didUpdateComposition;
            this.experimental_approximateQueryPlanStoreMiB =
                config.experimental_approximateQueryPlanStoreMiB;
            if (isManagedConfig(config) &&
                config.experimental_pollInterval &&
                config.experimental_pollInterval < 10000) {
                this.experimental_pollInterval = 10000;
                this.logger.warn('Polling Apollo services at a frequency of less than once per 10 seconds (10000) is disallowed. Instead, the minimum allowed pollInterval of 10000 will be used. Please reconfigure your experimental_pollInterval accordingly. If this is problematic for your team, please contact support.');
            }
            else {
                this.experimental_pollInterval = config.experimental_pollInterval;
            }
            if (config.experimental_pollInterval && isRemoteConfig(config)) {
                this.logger.warn('Polling running services is dangerous and not recommended in production. ' +
                    'Polling should only be used against a registry. ' +
                    'If you are polling running services, use with caution.');
            }
            if (config.fetcher) {
                this.fetcher = config.fetcher;
            }
        }
    }
    cleanup() {
        if (this.queryPlannerPointer != null) {
            query_planner_wasm_1.dropQueryPlanner(this.queryPlannerPointer);
        }
    }
    async load(options) {
        if (options === null || options === void 0 ? void 0 : options.apollo) {
            this.apolloConfig = options.apollo;
        }
        else if (options === null || options === void 0 ? void 0 : options.engine) {
            this.apolloConfig = {
                keyHash: options.engine.apiKeyHash,
                graphId: options.engine.graphId,
                graphVariant: options.engine.graphVariant || 'current',
            };
        }
        await this.updateComposition();
        if ((isManagedConfig(this.config) || this.experimental_pollInterval) &&
            !this.pollingTimer) {
            this.pollServices();
        }
        const mode = isManagedConfig(this.config) ? 'managed' : 'unmanaged';
        this.logger.info(`Gateway successfully loaded schema.\n\t* Mode: ${mode}${(this.apolloConfig && this.apolloConfig.graphId)
            ? `\n\t* Service: ${this.apolloConfig.graphId}@${this.apolloConfig.graphVariant}`
            : ''}`);
        return {
            schema: this.schema,
            executor: this.executor,
        };
    }
    async updateComposition() {
        let result;
        this.logger.debug('Checking service definitions...');
        try {
            result = await this.updateServiceDefinitions(this.config);
        }
        catch (e) {
            this.logger.error("Error checking for changes to service definitions: " +
                (e && e.message || e));
            throw e;
        }
        if (!result.serviceDefinitions ||
            JSON.stringify(this.serviceDefinitions) ===
                JSON.stringify(result.serviceDefinitions)) {
            this.logger.debug('No change in service definitions since last check.');
            return;
        }
        const previousSchema = this.schema;
        const previousServiceDefinitions = this.serviceDefinitions;
        const previousCompositionMetadata = this.compositionMetadata;
        if (previousSchema) {
            this.logger.info("New service definitions were found.");
        }
        if (this.config.serviceHealthCheck) {
            const serviceMap = result.serviceDefinitions.reduce((serviceMap, serviceDef) => {
                serviceMap[serviceDef.name] = {
                    url: serviceDef.url,
                    dataSource: this.createDataSource(serviceDef),
                };
                return serviceMap;
            }, Object.create(null));
            try {
                await this.serviceHealthCheck(serviceMap);
            }
            catch (e) {
                this.logger.error('The gateway did not update its schema due to failed service health checks.  ' +
                    'The gateway will continue to operate with the previous schema and reattempt updates.' + e);
                throw e;
            }
        }
        this.compositionMetadata = result.compositionMetadata;
        this.serviceDefinitions = result.serviceDefinitions;
        if (this.queryPlanStore)
            this.queryPlanStore.flush();
        const { schema, composedSdl } = this.createSchema(result.serviceDefinitions);
        if (!composedSdl) {
            this.logger.error("A valid schema couldn't be composed. Falling back to previous schema.");
        }
        else {
            this.schema = schema;
            if (this.queryPlannerPointer != null) {
                query_planner_wasm_1.dropQueryPlanner(this.queryPlannerPointer);
            }
            this.queryPlannerPointer = query_planner_wasm_1.getQueryPlanner(composedSdl);
            try {
                this.onSchemaChangeListeners.forEach(listener => listener(this.schema));
            }
            catch (e) {
                this.logger.error("An error was thrown from an 'onSchemaChange' listener. " +
                    "The schema will still update: " + (e && e.message || e));
            }
            if (this.experimental_didUpdateComposition) {
                this.experimental_didUpdateComposition({
                    serviceDefinitions: result.serviceDefinitions,
                    schema: this.schema,
                    ...(this.compositionMetadata && {
                        compositionMetadata: this.compositionMetadata,
                    }),
                }, previousServiceDefinitions &&
                    previousSchema && {
                    serviceDefinitions: previousServiceDefinitions,
                    schema: previousSchema,
                    ...(previousCompositionMetadata && {
                        compositionMetadata: previousCompositionMetadata,
                    }),
                });
            }
        }
    }
    serviceHealthCheck(serviceMap = this.serviceMap) {
        return Promise.all(Object.entries(serviceMap).map(([name, { dataSource }]) => dataSource
            .process({ request: { query: exports.HEALTH_CHECK_QUERY }, context: {} })
            .then(response => ({ name, response }))));
    }
    createSchema(serviceList) {
        this.logger.debug(`Composing schema from service list: \n${serviceList
            .map(({ name, url }) => `  ${url || 'local'}: ${name}`)
            .join('\n')}`);
        const { schema, errors, composedSdl } = federation_1.composeAndValidate(serviceList);
        if (errors && errors.length > 0) {
            if (this.experimental_didFailComposition) {
                this.experimental_didFailComposition({
                    errors,
                    serviceList,
                    ...(this.compositionMetadata && {
                        compositionMetadata: this.compositionMetadata,
                    }),
                });
            }
            throw new apollo_graphql_1.GraphQLSchemaValidationError(errors);
        }
        this.createServices(serviceList);
        this.logger.debug('Schema loaded and ready for execution');
        return { schema: wrapSchemaWithAliasResolver(schema), composedSdl };
    }
    onSchemaChange(callback) {
        this.onSchemaChangeListeners.add(callback);
        return () => {
            this.onSchemaChangeListeners.delete(callback);
        };
    }
    async pollServices() {
        if (this.pollingTimer)
            clearTimeout(this.pollingTimer);
        await new Promise(res => {
            var _a;
            this.pollingTimer = setTimeout(() => res(), this.experimental_pollInterval || 10000);
            (_a = this.pollingTimer) === null || _a === void 0 ? void 0 : _a.unref();
        });
        try {
            await this.updateComposition();
        }
        catch (err) {
            this.logger.error(err && err.message || err);
        }
        this.pollServices();
    }
    createAndCacheDataSource(serviceDef) {
        if (this.serviceMap[serviceDef.name] &&
            serviceDef.url === this.serviceMap[serviceDef.name].url)
            return this.serviceMap[serviceDef.name].dataSource;
        const dataSource = this.createDataSource(serviceDef);
        this.serviceMap[serviceDef.name] = { url: serviceDef.url, dataSource };
        return dataSource;
    }
    createDataSource(serviceDef) {
        if (!serviceDef.url && !isLocalConfig(this.config)) {
            this.logger.error(`Service definition for service ${serviceDef.name} is missing a url`);
        }
        return this.config.buildService
            ? this.config.buildService(serviceDef)
            : new RemoteGraphQLDataSource_1.RemoteGraphQLDataSource({
                url: serviceDef.url,
            });
    }
    createServices(services) {
        for (const serviceDef of services) {
            this.createAndCacheDataSource(serviceDef);
        }
    }
    async loadServiceDefinitions(config) {
        var _a, _b;
        const canUseManagedConfig = ((_a = this.apolloConfig) === null || _a === void 0 ? void 0 : _a.graphId) && ((_b = this.apolloConfig) === null || _b === void 0 ? void 0 : _b.keyHash);
        const getManagedConfig = () => {
            return loadServicesFromStorage_1.getServiceDefinitionsFromStorage({
                graphId: this.apolloConfig.graphId,
                apiKeyHash: this.apolloConfig.keyHash,
                graphVariant: this.apolloConfig.graphVariant,
                federationVersion: config.federationVersion || 1,
                fetcher: this.fetcher,
            });
        };
        if (isLocalConfig(config) || isRemoteConfig(config)) {
            if (canUseManagedConfig && !this.warnedStates.remoteWithLocalConfig) {
                this.warnedStates.remoteWithLocalConfig = true;
                getManagedConfig().then(() => {
                    this.logger.warn("A local gateway service list is overriding a managed federation " +
                        "configuration.  To use the managed " +
                        "configuration, do not specify a service list locally.");
                }).catch(() => { });
            }
        }
        if (isLocalConfig(config)) {
            return { isNewSchema: false };
        }
        if (isRemoteConfig(config)) {
            const serviceList = config.serviceList.map(serviceDefinition => ({
                ...serviceDefinition,
                dataSource: this.createAndCacheDataSource(serviceDefinition),
            }));
            return loadServicesFromRemoteEndpoint_1.getServiceDefinitionsFromRemoteEndpoint({
                serviceList,
                ...(config.introspectionHeaders
                    ? { headers: config.introspectionHeaders }
                    : {}),
                serviceSdlCache: this.serviceSdlCache,
            });
        }
        if (!canUseManagedConfig) {
            throw new Error('When `serviceList` is not set, an Apollo configuration must be provided. See https://www.apollographql.com/docs/apollo-server/federation/managed-federation/ for more information.');
        }
        return getManagedConfig();
    }
    validateIncomingRequest(requestContext, operationContext) {
        const variableDefinitions = operationContext.operation
            .variableDefinitions;
        if (!variableDefinitions)
            return [];
        const { errors } = values_1.getVariableValues(operationContext.schema, variableDefinitions, requestContext.request.variables || {});
        return errors || [];
    }
    initializeQueryPlanStore() {
        this.queryPlanStore = new apollo_server_caching_1.InMemoryLRUCache({
            maxSize: Math.pow(2, 20) *
                (this.experimental_approximateQueryPlanStoreMiB || 30),
            sizeCalculator: approximateObjectSize,
        });
    }
    async stop() {
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
            this.pollingTimer = undefined;
        }
    }
}
exports.ApolloGateway = ApolloGateway;
function approximateObjectSize(obj) {
    return Buffer.byteLength(JSON.stringify(obj), 'utf8');
}
function wrapSchemaWithAliasResolver(schema) {
    const typeMap = schema.getTypeMap();
    Object.keys(typeMap).forEach(typeName => {
        const type = typeMap[typeName];
        if (graphql_1.isObjectType(type) && !graphql_1.isIntrospectionType(type)) {
            const fields = type.getFields();
            Object.keys(fields).forEach(fieldName => {
                const field = fields[fieldName];
                field.resolve = executeQueryPlan_1.defaultFieldResolverWithAliasSupport;
            });
        }
    });
    return schema;
}
__exportStar(require("./datasources"), exports);
//# sourceMappingURL=index.js.map