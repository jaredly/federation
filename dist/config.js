"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDynamicConfig = exports.isStaticConfig = exports.isPrecomposedManagedConfig = exports.isManagedConfig = exports.isManuallyManagedConfig = exports.isCsdlConfig = exports.isRemoteConfig = exports.isLocalConfig = exports.isServiceDefinitionUpdate = exports.isCsdlUpdate = void 0;
function isCsdlUpdate(update) {
    return 'csdl' in update;
}
exports.isCsdlUpdate = isCsdlUpdate;
function isServiceDefinitionUpdate(update) {
    return 'isNewSchema' in update;
}
exports.isServiceDefinitionUpdate = isServiceDefinitionUpdate;
function isLocalConfig(config) {
    return 'localServiceList' in config;
}
exports.isLocalConfig = isLocalConfig;
function isRemoteConfig(config) {
    return 'serviceList' in config;
}
exports.isRemoteConfig = isRemoteConfig;
function isCsdlConfig(config) {
    return 'csdl' in config;
}
exports.isCsdlConfig = isCsdlConfig;
function isManuallyManagedConfig(config) {
    return ('experimental_updateServiceDefinitions' in config ||
        'experimental_updateCsdl' in config);
}
exports.isManuallyManagedConfig = isManuallyManagedConfig;
function isManagedConfig(config) {
    return (isPrecomposedManagedConfig(config) ||
        (!isRemoteConfig(config) &&
            !isLocalConfig(config) &&
            !isCsdlConfig(config) &&
            !isManuallyManagedConfig(config)));
}
exports.isManagedConfig = isManagedConfig;
function isPrecomposedManagedConfig(config) {
    return 'experimental_schemaConfigDeliveryEndpoint' in config;
}
exports.isPrecomposedManagedConfig = isPrecomposedManagedConfig;
function isStaticConfig(config) {
    return isLocalConfig(config) || isCsdlConfig(config);
}
exports.isStaticConfig = isStaticConfig;
function isDynamicConfig(config) {
    return (isRemoteConfig(config) ||
        isManagedConfig(config) ||
        isManuallyManagedConfig(config));
}
exports.isDynamicConfig = isDynamicConfig;
//# sourceMappingURL=config.js.map