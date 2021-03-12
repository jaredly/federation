"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOperationContext = exports.executeQueryPlan = exports.buildQueryPlan = exports.ApolloGateway = exports.SERVICE_DEFINITION_QUERY = exports.HEALTH_CHECK_QUERY = exports.GCS_RETRY_COUNT = exports.getDefaultGcsFetcher = exports.getDefaultFetcher = void 0;
const apollo_server_core_1 = require("apollo-server-core");
const apollo_server_caching_1 = require("apollo-server-caching");
const graphql_1 = require("graphql");
const federation_1 = require("@apollo/federation");
const loglevel_1 = __importDefault(require("loglevel"));
const buildQueryPlan_1 = require("./buildQueryPlan");
Object.defineProperty(exports, "buildQueryPlan", { enumerable: true, get: function () { return buildQueryPlan_1.buildQueryPlan; } });
Object.defineProperty(exports, "buildOperationContext", { enumerable: true, get: function () { return buildQueryPlan_1.buildOperationContext; } });
const executeQueryPlan_1 = require("./executeQueryPlan");
Object.defineProperty(exports, "executeQueryPlan", { enumerable: true, get: function () { return executeQueryPlan_1.executeQueryPlan; } });
const loadServicesFromRemoteEndpoint_1 = require("./loadServicesFromRemoteEndpoint");
const refCounter_1 = __importDefault(require("./refCounter"));
const RemoteGraphQLDataSource_1 = require("./datasources/RemoteGraphQLDataSource");
const values_1 = require("graphql/execution/values");
const make_fetch_happen_1 = __importDefault(require("make-fetch-happen"));
const cache_1 = require("./cache");
const query_planner_1 = require("@apollo/query-planner");
const csdlToSchema_1 = require("./csdlToSchema");
const config_1 = require("./config");
const loadCsdlFromStorage_1 = require("./loadCsdlFromStorage");
const legacyLoadServicesFromStorage_1 = require("./legacyLoadServicesFromStorage");
function getDefaultFetcher() {
    const { name, version } = require('../package.json');
    return make_fetch_happen_1.default.defaults({
        cacheManager: new cache_1.HttpRequestCache(),
        headers: {
            'apollographql-client-name': name,
            'apollographql-client-version': version,
            'user-agent': `${name}/${version}`,
            'content-type': 'application/json',
        },
        retry: {
            retries: 5,
            factor: 2,
            minTimeout: 1000,
            randomize: true,
        },
    });
}
exports.getDefaultFetcher = getDefaultFetcher;
exports.getDefaultGcsFetcher = getDefaultFetcher;
exports.GCS_RETRY_COUNT = 5;
exports.HEALTH_CHECK_QUERY = 'query __ApolloServiceHealthCheck__ { __typename }';
exports.SERVICE_DEFINITION_QUERY = 'query __ApolloGetServiceDefinition__ { _service { sdl } }';
class ApolloGateway {
    constructor(config) {
        var _a, _b, _c;
        this.serviceMap = Object.create(null);
        this.onSchemaChangeListeners = new Set();
        this.serviceDefinitions = [];
        this.serviceSdlCache = new Map();
        this.warnedStates = Object.create(null);
        this.executor = (requestContext) => {
            return this.queryPlannerPointer.withBorrow((pointer) => this._executor(requestContext, pointer));
        };
        this._executor = async (requestContext, queryPlannerPointer) => {
            const { request, document, queryHash, source } = requestContext;
            const queryPlanStoreKey = queryHash + (request.operationName || '');
            const operationContext = buildQueryPlan_1.buildOperationContext({
                schema: this.schema,
                operationDocument: document,
                operationString: source,
                queryPlannerPointer,
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
                    Promise.resolve(this.queryPlanStore.set(queryPlanStoreKey, queryPlan)).catch((err) => this.logger.warn('Could not store queryPlan' + ((err && err.message) || err)));
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
                ?
                    query_planner_1.prettyFormatQueryPlan(queryPlan)
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
        this.logger = this.initLogger();
        this.queryPlanStore = this.initQueryPlanStore(config === null || config === void 0 ? void 0 : config.experimental_approximateQueryPlanStoreMiB);
        this.fetcher = (config === null || config === void 0 ? void 0 : config.fetcher) || getDefaultFetcher();
        this.experimental_didResolveQueryPlan =
            config === null || config === void 0 ? void 0 : config.experimental_didResolveQueryPlan;
        this.experimental_didFailComposition =
            config === null || config === void 0 ? void 0 : config.experimental_didFailComposition;
        this.experimental_didUpdateComposition =
            config === null || config === void 0 ? void 0 : config.experimental_didUpdateComposition;
        this.experimental_pollInterval = config === null || config === void 0 ? void 0 : config.experimental_pollInterval;
        this.experimental_schemaConfigDeliveryEndpoint =
            (_a = process.env.APOLLO_SCHEMA_CONFIG_DELIVERY_ENDPOINT) !== null && _a !== void 0 ? _a : null;
        if (config_1.isPrecomposedManagedConfig(this.config)) {
            this.experimental_schemaConfigDeliveryEndpoint =
                (_c = (_b = this.experimental_schemaConfigDeliveryEndpoint) !== null && _b !== void 0 ? _b : this.config.experimental_schemaConfigDeliveryEndpoint) !== null && _c !== void 0 ? _c : null;
        }
        if (config_1.isManuallyManagedConfig(this.config)) {
            if ('experimental_updateCsdl' in this.config) {
                this.updateServiceDefinitions = this.config.experimental_updateCsdl;
            }
            else if ('experimental_updateServiceDefinitions' in this.config) {
                this.updateServiceDefinitions = this.config.experimental_updateServiceDefinitions;
            }
            else {
                throw Error('Programming error: unexpected manual configuration provided');
            }
        }
        else {
            this.updateServiceDefinitions = this.loadServiceDefinitions;
        }
        if (config_1.isDynamicConfig(this.config)) {
            this.issueDynamicWarningsIfApplicable();
        }
        this.state = { phase: 'initialized' };
    }
    initLogger() {
        if (this.config.logger) {
            return this.config.logger;
        }
        const loglevelLogger = loglevel_1.default.getLogger(`apollo-gateway`);
        if (this.config.debug === true) {
            loglevelLogger.setLevel(loglevelLogger.levels.DEBUG);
        }
        else {
            loglevelLogger.setLevel(loglevelLogger.levels.WARN);
        }
        return loglevelLogger;
    }
    initQueryPlanStore(approximateQueryPlanStoreMiB) {
        return new apollo_server_caching_1.InMemoryLRUCache({
            maxSize: Math.pow(2, 20) * (approximateQueryPlanStoreMiB || 30),
            sizeCalculator: approximateObjectSize,
        });
    }
    issueDynamicWarningsIfApplicable() {
        if (config_1.isManagedConfig(this.config) &&
            this.config.experimental_pollInterval &&
            this.config.experimental_pollInterval < 10000) {
            this.experimental_pollInterval = 10000;
            this.logger.warn('Polling Apollo services at a frequency of less than once per 10 ' +
                'seconds (10000) is disallowed. Instead, the minimum allowed ' +
                'pollInterval of 10000 will be used. Please reconfigure your ' +
                'experimental_pollInterval accordingly. If this is problematic for ' +
                'your team, please contact support.');
        }
        if (this.config.experimental_pollInterval && config_1.isRemoteConfig(this.config)) {
            this.logger.warn('Polling running services is dangerous and not recommended in production. ' +
                'Polling should only be used against a registry. ' +
                'If you are polling running services, use with caution.');
        }
        if (config_1.isManuallyManagedConfig(this.config) &&
            'experimental_updateCsdl' in this.config &&
            'experimental_updateServiceDefinitions' in this.config) {
            this.logger.warn('Gateway found two manual update configurations when only one should be ' +
                'provided. Gateway will default to using the provided `experimental_updateCsdl` ' +
                'function when both `experimental_updateCsdl` and experimental_updateServiceDefinitions` ' +
                'are provided.');
        }
    }
    cleanup() {
        var _a;
        (_a = this.queryPlannerPointer) === null || _a === void 0 ? void 0 : _a.cleanupWhenReady();
    }
    async load(options) {
        if (this.state.phase !== 'initialized') {
            throw Error(`ApolloGateway.load called in surprising state ${this.state.phase}`);
        }
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
        const unrefTimer = !!options && !options.apollo;
        this.maybeWarnOnConflictingConfig();
        config_1.isStaticConfig(this.config)
            ? this.loadStatic(this.config)
            : await this.loadDynamic(unrefTimer);
        const mode = config_1.isManagedConfig(this.config) ? 'managed' : 'unmanaged';
        this.logger.info(`Gateway successfully loaded schema.\n\t* Mode: ${mode}${this.apolloConfig && this.apolloConfig.graphId
            ? `\n\t* Service: ${this.apolloConfig.graphId}@${this.apolloConfig.graphVariant}`
            : ''}`);
        return {
            schema: this.schema,
            executor: this.executor,
        };
    }
    loadStatic(config) {
        let schema;
        let composedSdl;
        try {
            ({ schema, composedSdl } = config_1.isLocalConfig(config)
                ? this.createSchemaFromServiceList(config.localServiceList)
                : this.createSchemaFromCsdl(config.csdl));
        }
        catch (e) {
            this.state = { phase: 'failed to load' };
            throw e;
        }
        this.schema = schema;
        this.parsedCsdl = apollo_server_core_1.gql(composedSdl);
        this.queryPlannerPointer = new refCounter_1.default(query_planner_1.getQueryPlanner(composedSdl), query_planner_1.dropQueryPlanner);
        this.state = { phase: 'loaded' };
    }
    async loadDynamic(unrefTimer) {
        try {
            await this.updateSchema();
        }
        catch (e) {
            this.state = { phase: 'failed to load' };
            throw e;
        }
        this.state = { phase: 'loaded' };
        if (this.shouldBeginPolling()) {
            this.pollServices(unrefTimer);
        }
    }
    shouldBeginPolling() {
        return config_1.isManagedConfig(this.config) || this.experimental_pollInterval;
    }
    async updateSchema() {
        this.logger.debug('Checking for composition updates...');
        const result = await this.updateServiceDefinitions(this.config);
        if (config_1.isCsdlUpdate(result)) {
            await this.updateWithCsdl(result);
        }
        else if (config_1.isServiceDefinitionUpdate(result)) {
            await this.updateByComposition(result);
        }
        else {
            throw new Error('Programming error: unexpected result type from `updateServiceDefinitions`');
        }
    }
    async updateByComposition(result) {
        var _a;
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
            this.logger.info('New service definitions were found.');
        }
        await this.maybePerformServiceHealthCheck(result);
        this.compositionMetadata = result.compositionMetadata;
        this.serviceDefinitions = result.serviceDefinitions;
        if (this.queryPlanStore)
            this.queryPlanStore.flush();
        const { schema, composedSdl } = this.createSchemaFromServiceList(result.serviceDefinitions);
        if (!composedSdl) {
            this.logger.error("A valid schema couldn't be composed. Falling back to previous schema.");
        }
        else {
            this.schema = schema;
            (_a = this.queryPlannerPointer) === null || _a === void 0 ? void 0 : _a.cleanupWhenReady();
            this.queryPlannerPointer = new refCounter_1.default(query_planner_1.getQueryPlanner(composedSdl), query_planner_1.dropQueryPlanner);
            try {
                this.onSchemaChangeListeners.forEach((listener) => listener(this.schema));
            }
            catch (e) {
                this.logger.error("An error was thrown from an 'onSchemaChange' listener. " +
                    'The schema will still update: ' +
                    ((e && e.message) || e));
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
    async updateWithCsdl(result) {
        var _a;
        if (result.id === this.compositionId) {
            this.logger.debug('No change in composition since last check.');
            return;
        }
        const parsedCsdl = apollo_server_core_1.gql(result.csdl);
        const previousSchema = this.schema;
        const previousCsdl = this.parsedCsdl;
        const previousCompositionId = this.compositionId;
        if (previousSchema) {
            this.logger.info('Updated CSDL was found.');
        }
        await this.maybePerformServiceHealthCheck(result);
        this.compositionId = result.id;
        this.parsedCsdl = parsedCsdl;
        if (this.queryPlanStore)
            this.queryPlanStore.flush();
        const { schema, composedSdl } = this.createSchemaFromCsdl(result.csdl);
        if (!composedSdl) {
            this.logger.error("A valid schema couldn't be composed. Falling back to previous schema.");
        }
        else {
            this.schema = schema;
            (_a = this.queryPlannerPointer) === null || _a === void 0 ? void 0 : _a.cleanupWhenReady();
            this.queryPlannerPointer = new refCounter_1.default(query_planner_1.getQueryPlanner(composedSdl), query_planner_1.dropQueryPlanner);
            try {
                this.onSchemaChangeListeners.forEach((listener) => listener(this.schema));
            }
            catch (e) {
                this.logger.error("An error was thrown from an 'onSchemaChange' listener. " +
                    'The schema will still update: ' +
                    ((e && e.message) || e));
            }
            if (this.experimental_didUpdateComposition) {
                this.experimental_didUpdateComposition({
                    compositionId: result.id,
                    csdl: result.csdl,
                    schema: this.schema,
                }, previousCompositionId && previousCsdl && previousSchema
                    ? {
                        compositionId: previousCompositionId,
                        csdl: graphql_1.print(previousCsdl),
                        schema: previousSchema,
                    }
                    : undefined);
            }
        }
    }
    async maybePerformServiceHealthCheck(update) {
        if (this.config.serviceHealthCheck) {
            const serviceList = config_1.isCsdlUpdate(update)
                ?
                    this.serviceListFromCsdl(apollo_server_core_1.gql(update.csdl))
                :
                    update.serviceDefinitions;
            const serviceMap = serviceList.reduce((serviceMap, serviceDef) => {
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
                throw new Error('The gateway did not update its schema due to failed service health checks. ' +
                    'The gateway will continue to operate with the previous schema and reattempt updates. ' +
                    'The following error occurred during the health check:\n' +
                    e.message);
            }
        }
    }
    serviceHealthCheck(serviceMap = this.serviceMap) {
        return Promise.all(Object.entries(serviceMap).map(([name, { dataSource }]) => dataSource
            .process({ request: { query: exports.HEALTH_CHECK_QUERY }, context: {} })
            .then((response) => ({ name, response }))
            .catch((e) => {
            throw new Error(`[${name}]: ${e.message}`);
        })));
    }
    createSchemaFromServiceList(serviceList) {
        this.logger.debug(`Composing schema from service list: \n${serviceList
            .map(({ name, url }) => `  ${url || 'local'}: ${name}`)
            .join('\n')}`);
        const compositionResult = federation_1.composeAndValidate(serviceList);
        if (federation_1.compositionHasErrors(compositionResult)) {
            const { errors } = compositionResult;
            if (this.experimental_didFailComposition) {
                this.experimental_didFailComposition({
                    errors,
                    serviceList,
                    ...(this.compositionMetadata && {
                        compositionMetadata: this.compositionMetadata,
                    }),
                });
            }
            throw Error("A valid schema couldn't be composed. The following composition errors were found:\n" +
                errors.map((e) => '\t' + e.message).join('\n'));
        }
        else {
            const { composedSdl } = compositionResult;
            this.createServices(serviceList);
            this.logger.debug('Schema loaded and ready for execution');
            return {
                schema: wrapSchemaWithAliasResolver(csdlToSchema_1.csdlToSchema(composedSdl)),
                composedSdl,
            };
        }
    }
    serviceListFromCsdl(csdl) {
        const serviceList = [];
        graphql_1.visit(csdl, {
            SchemaDefinition(node) {
                federation_1.findDirectivesOnNode(node, 'graph').forEach((directive) => {
                    var _a, _b;
                    const name = (_a = directive.arguments) === null || _a === void 0 ? void 0 : _a.find((arg) => arg.name.value === 'name');
                    const url = (_b = directive.arguments) === null || _b === void 0 ? void 0 : _b.find((arg) => arg.name.value === 'url');
                    if (name &&
                        federation_1.isStringValueNode(name.value) &&
                        url &&
                        federation_1.isStringValueNode(url.value)) {
                        serviceList.push({
                            name: name.value.value,
                            url: url.value.value,
                        });
                    }
                });
            },
        });
        return serviceList;
    }
    createSchemaFromCsdl(csdl) {
        this.parsedCsdl = apollo_server_core_1.gql(csdl);
        const serviceList = this.serviceListFromCsdl(this.parsedCsdl);
        this.createServices(serviceList);
        return {
            schema: wrapSchemaWithAliasResolver(csdlToSchema_1.csdlToSchema(csdl)),
            composedSdl: csdl,
        };
    }
    onSchemaChange(callback) {
        this.onSchemaChangeListeners.add(callback);
        return () => {
            this.onSchemaChangeListeners.delete(callback);
        };
    }
    async pollServices(unrefTimer) {
        switch (this.state.phase) {
            case 'stopping':
            case 'stopped':
            case 'failed to load':
                return;
            case 'initialized':
                throw Error('pollServices should not be called before load!');
            case 'polling':
                throw Error('pollServices should not be called while in the middle of polling!');
            case 'waiting to poll':
                throw Error('pollServices should not be called while already waiting to poll!');
            case 'loaded':
                break;
            default:
                throw new UnreachableCaseError(this.state);
        }
        await new Promise((doneWaiting) => {
            this.state = {
                phase: 'waiting to poll',
                doneWaiting,
                pollWaitTimer: setTimeout(() => {
                    if (this.state.phase == 'waiting to poll') {
                        this.state.doneWaiting();
                    }
                }, this.experimental_pollInterval || 10000),
            };
            if (unrefTimer) {
                this.state.pollWaitTimer.unref();
            }
        });
        if (this.state.phase !== 'waiting to poll') {
            return;
        }
        let pollingDone;
        this.state = {
            phase: 'polling',
            pollingDonePromise: new Promise((res) => {
                pollingDone = res;
            }),
        };
        try {
            await this.updateSchema();
        }
        catch (err) {
            this.logger.error((err && err.message) || err);
        }
        if (this.state.phase === 'polling') {
            this.state = { phase: 'loaded' };
            setImmediate(() => this.pollServices(unrefTimer));
        }
        pollingDone();
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
        if (!serviceDef.url && !config_1.isLocalConfig(this.config)) {
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
        if (config_1.isRemoteConfig(config)) {
            const serviceList = config.serviceList.map((serviceDefinition) => ({
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
        const canUseManagedConfig = ((_a = this.apolloConfig) === null || _a === void 0 ? void 0 : _a.graphId) && ((_b = this.apolloConfig) === null || _b === void 0 ? void 0 : _b.keyHash);
        if (!canUseManagedConfig) {
            throw new Error('When a manual configuration is not provided, gateway requires an Apollo ' +
                'configuration. See https://www.apollographql.com/docs/apollo-server/federation/managed-federation/ ' +
                'for more information. Manual configuration options include: ' +
                '`serviceList`, `csdl`, and `experimental_updateServiceDefinitions`.');
        }
        if (!this.experimental_schemaConfigDeliveryEndpoint &&
            !config_1.isPrecomposedManagedConfig(config)) {
            return legacyLoadServicesFromStorage_1.getServiceDefinitionsFromStorage({
                graphId: this.apolloConfig.graphId,
                apiKeyHash: this.apolloConfig.keyHash,
                graphVariant: this.apolloConfig.graphVariant,
                federationVersion: config.federationVersion || 1,
                fetcher: this.fetcher,
            });
        }
        return loadCsdlFromStorage_1.loadCsdlFromStorage({
            graphId: this.apolloConfig.graphId,
            apiKey: this.apolloConfig.key,
            graphVariant: this.apolloConfig.graphVariant,
            endpoint: this.experimental_schemaConfigDeliveryEndpoint,
            fetcher: this.fetcher,
        });
    }
    maybeWarnOnConflictingConfig() {
        var _a, _b;
        const canUseManagedConfig = ((_a = this.apolloConfig) === null || _a === void 0 ? void 0 : _a.graphId) && ((_b = this.apolloConfig) === null || _b === void 0 ? void 0 : _b.keyHash);
        if (!config_1.isManagedConfig(this.config) &&
            canUseManagedConfig &&
            !this.warnedStates.remoteWithLocalConfig) {
            this.warnedStates.remoteWithLocalConfig = true;
            this.logger.warn('A local gateway configuration is overriding a managed federation ' +
                'configuration.  To use the managed ' +
                'configuration, do not specify a service list or csdl locally.');
        }
    }
    validateIncomingRequest(requestContext, operationContext) {
        const variableDefinitions = operationContext.operation
            .variableDefinitions;
        if (!variableDefinitions)
            return [];
        const { errors } = values_1.getVariableValues(operationContext.schema, variableDefinitions, requestContext.request.variables || {});
        return errors || [];
    }
    async stop() {
        switch (this.state.phase) {
            case 'initialized':
            case 'failed to load':
                throw Error('ApolloGateway.stop does not need to be called before ApolloGateway.load is called successfully');
            case 'stopped':
                return;
            case 'stopping':
                await this.state.stoppingDonePromise;
                if (this.state.phase !== 'stopped') {
                    throw Error(`Expected to be stopped when done stopping, but instead ${this.state.phase}`);
                }
                return;
            case 'loaded':
                this.state = { phase: 'stopped' };
                return;
            case 'waiting to poll': {
                const doneWaiting = this.state.doneWaiting;
                clearTimeout(this.state.pollWaitTimer);
                this.state = { phase: 'stopped' };
                doneWaiting();
                return;
            }
            case 'polling': {
                const pollingDonePromise = this.state.pollingDonePromise;
                let stoppingDone;
                this.state = {
                    phase: 'stopping',
                    stoppingDonePromise: new Promise((res) => {
                        stoppingDone = res;
                    }),
                };
                await pollingDonePromise;
                this.state = { phase: 'stopped' };
                stoppingDone();
                return;
            }
            default:
                throw new UnreachableCaseError(this.state);
        }
    }
}
exports.ApolloGateway = ApolloGateway;
function approximateObjectSize(obj) {
    return Buffer.byteLength(JSON.stringify(obj), 'utf8');
}
function wrapSchemaWithAliasResolver(schema) {
    const typeMap = schema.getTypeMap();
    Object.keys(typeMap).forEach((typeName) => {
        const type = typeMap[typeName];
        if (graphql_1.isObjectType(type) && !graphql_1.isIntrospectionType(type)) {
            const fields = type.getFields();
            Object.keys(fields).forEach((fieldName) => {
                const field = fields[fieldName];
                field.resolve = executeQueryPlan_1.defaultFieldResolverWithAliasSupport;
            });
        }
    });
    return schema;
}
class UnreachableCaseError extends Error {
    constructor(val) {
        super(`Unreachable case: ${val}`);
    }
}
__exportStar(require("./datasources"), exports);
//# sourceMappingURL=index.js.map