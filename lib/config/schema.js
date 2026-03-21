"use strict";
/**
 * Configuration options for the oRPC generator.
 *
 * Validates inputs for customizing ORPC routers in scala-hub.
 * Parsed from Prisma generator config (Record<string, string | string[]>).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelAction = exports.defaultConfigs = void 0;
exports.parseConfig = parseConfig;
// Enhanced model actions
const ModelAction = {
    // Basic CRUD
    create: "create",
    createMany: "createMany",
    findFirst: "findFirst",
    findFirstOrThrow: "findFirstOrThrow",
    findMany: "findMany",
    findUnique: "findUnique",
    findUniqueOrThrow: "findUniqueOrThrow",
    update: "update",
    updateMany: "updateMany",
    upsert: "upsert",
    delete: "delete",
    deleteMany: "deleteMany",
    // Advanced operations
    aggregate: "aggregate",
    groupBy: "groupBy",
    count: "count",
    findRaw: "findRaw",
    aggregateRaw: "aggregateRaw",
};
exports.ModelAction = ModelAction;
function parseBoolean(value, defaultValue) {
    if (value === undefined)
        return defaultValue;
    return value === "true";
}
function parseNumber(value, defaultValue) {
    if (value === undefined)
        return defaultValue;
    const n = parseInt(value, 10);
    return isNaN(n) ? defaultValue : n;
}
function parseArray(value, defaultValue) {
    if (value === undefined)
        return defaultValue;
    if (Array.isArray(value))
        return value;
    return value.split(",").map((s) => s.trim());
}
function parseString(value, defaultValue) {
    return value ?? defaultValue;
}
function parseEnum(value, allowed, defaultValue) {
    if (value === undefined)
        return defaultValue;
    return allowed.includes(value) ? value : defaultValue;
}
const allModelActions = Object.values(ModelAction);
function parseConfig(raw) {
    const modelActions = parseArray(raw.generateModelActions, [...allModelActions]).filter((a) => allModelActions.includes(a));
    return {
        output: parseString(raw.output, "./src/generated/orpc"),
        contextPath: parseString(raw.contextPath, ""),
        generateInputValidation: parseBoolean(raw.generateInputValidation, true),
        generateOutputValidation: parseBoolean(raw.generateOutputValidation, true),
        strictValidation: parseBoolean(raw.strictValidation, true),
        apiTitle: parseString(raw.apiTitle, "Generated API"),
        apiDescription: parseString(raw.apiDescription, "Auto-generated API from Prisma schema"),
        apiVersion: parseString(raw.apiVersion, "1.0.0"),
        serverPort: parseNumber(raw.serverPort, 3000),
        apiPrefix: parseString(raw.apiPrefix, ""),
        generateModelActions: modelActions,
        showModelNameInProcedure: parseBoolean(raw.showModelNameInProcedure, true),
        enableSoftDeletes: parseBoolean(raw.enableSoftDeletes, false),
        generateRelationResolvers: parseBoolean(raw.generateRelationResolvers, true),
        generateDocumentation: parseBoolean(raw.generateDocumentation, false),
        generateTests: parseBoolean(raw.generateTests, false),
        enableDebugLogging: parseBoolean(raw.enableDebugLogging, false),
        useBarrelExports: parseBoolean(raw.useBarrelExports, true),
        codeStyle: parseEnum(raw.codeStyle, ["prettier", "none"], "prettier"),
        wrapResponses: parseBoolean(raw.wrapResponses, false),
        generateErrorHandling: parseBoolean(raw.generateErrorHandling, true),
        prismaClientPath: parseString(raw.prismaClientPath, "@prisma/client"),
    };
}
// Default configuration for different scenarios
exports.defaultConfigs = {
    basic: {},
    production: {},
    serverless: {},
    enterprise: {
        generateTests: "true",
    },
};
//# sourceMappingURL=schema.js.map