"use strict";
/**
 * Main entry point and exports for prisma-orpc-generator.
 *
 * Exposes config, utilities, and compatibility checks for generating ORPC routers
 * integrated into scala-hub's AI tool execution pipeline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESET_CONFIGS = exports.GENERATOR_METADATA = exports.GENERATOR_NAME = exports.VERSION = exports.ProjectManager = exports.supportsCaching = exports.shouldGenerateOperation = exports.returnsMultiple = exports.requiresAuthentication = exports.getValidationRequirements = exports.getRestPath = exports.getOutputTypeByOpName = exports.getOperationSummary = exports.getOperationDescription = exports.getInputTypeByOpName = exports.getHttpMethod = exports.supportsFullTextSearch = exports.shouldHaveAuditFields = exports.resolveModelsComments = exports.hasSoftDeleteField = exports.getValidationConstraints = exports.getUniqueFields = exports.getSortableFields = exports.getSearchableFields = exports.getModelRelations = exports.getFilterableFields = exports.enhanceModelsWithMetadata = exports.LogLevel = exports.Logger = exports.generate = exports.parseConfig = void 0;
exports.getPresetConfig = getPresetConfig;
exports.checkCompatibility = checkCompatibility;
exports.displayInfo = displayInfo;
exports.normalizeBodyEnvelope = normalizeBodyEnvelope;
var schema_1 = require("./config/schema");
Object.defineProperty(exports, "parseConfig", { enumerable: true, get: function () { return schema_1.parseConfig; } });
var orpc_generator_1 = require("./generators/orpc-generator");
Object.defineProperty(exports, "generate", { enumerable: true, get: function () { return orpc_generator_1.generate; } });
// Re-export utilities for advanced usage
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return logger_1.LogLevel; } });
var model_utils_1 = require("./utils/model-utils");
Object.defineProperty(exports, "enhanceModelsWithMetadata", { enumerable: true, get: function () { return model_utils_1.enhanceModelsWithMetadata; } });
Object.defineProperty(exports, "getFilterableFields", { enumerable: true, get: function () { return model_utils_1.getFilterableFields; } });
Object.defineProperty(exports, "getModelRelations", { enumerable: true, get: function () { return model_utils_1.getModelRelations; } });
Object.defineProperty(exports, "getSearchableFields", { enumerable: true, get: function () { return model_utils_1.getSearchableFields; } });
Object.defineProperty(exports, "getSortableFields", { enumerable: true, get: function () { return model_utils_1.getSortableFields; } });
Object.defineProperty(exports, "getUniqueFields", { enumerable: true, get: function () { return model_utils_1.getUniqueFields; } });
Object.defineProperty(exports, "getValidationConstraints", { enumerable: true, get: function () { return model_utils_1.getValidationConstraints; } });
Object.defineProperty(exports, "hasSoftDeleteField", { enumerable: true, get: function () { return model_utils_1.hasSoftDeleteField; } });
Object.defineProperty(exports, "resolveModelsComments", { enumerable: true, get: function () { return model_utils_1.resolveModelsComments; } });
Object.defineProperty(exports, "shouldHaveAuditFields", { enumerable: true, get: function () { return model_utils_1.shouldHaveAuditFields; } });
Object.defineProperty(exports, "supportsFullTextSearch", { enumerable: true, get: function () { return model_utils_1.supportsFullTextSearch; } });
var operation_utils_1 = require("./utils/operation-utils");
Object.defineProperty(exports, "getHttpMethod", { enumerable: true, get: function () { return operation_utils_1.getHttpMethod; } });
Object.defineProperty(exports, "getInputTypeByOpName", { enumerable: true, get: function () { return operation_utils_1.getInputTypeByOpName; } });
Object.defineProperty(exports, "getOperationDescription", { enumerable: true, get: function () { return operation_utils_1.getOperationDescription; } });
Object.defineProperty(exports, "getOperationSummary", { enumerable: true, get: function () { return operation_utils_1.getOperationSummary; } });
Object.defineProperty(exports, "getOutputTypeByOpName", { enumerable: true, get: function () { return operation_utils_1.getOutputTypeByOpName; } });
Object.defineProperty(exports, "getRestPath", { enumerable: true, get: function () { return operation_utils_1.getRestPath; } });
Object.defineProperty(exports, "getValidationRequirements", { enumerable: true, get: function () { return operation_utils_1.getValidationRequirements; } });
Object.defineProperty(exports, "requiresAuthentication", { enumerable: true, get: function () { return operation_utils_1.requiresAuthentication; } });
Object.defineProperty(exports, "returnsMultiple", { enumerable: true, get: function () { return operation_utils_1.returnsMultiple; } });
Object.defineProperty(exports, "shouldGenerateOperation", { enumerable: true, get: function () { return operation_utils_1.shouldGenerateOperation; } });
Object.defineProperty(exports, "supportsCaching", { enumerable: true, get: function () { return operation_utils_1.supportsCaching; } });
var project_manager_1 = require("./utils/project-manager");
Object.defineProperty(exports, "ProjectManager", { enumerable: true, get: function () { return project_manager_1.ProjectManager; } });
// Version information
exports.VERSION = "0.0.1";
exports.GENERATOR_NAME = "prisma-orpc-generator";
// Generator metadata
exports.GENERATOR_METADATA = {
    name: exports.GENERATOR_NAME,
    version: exports.VERSION,
    description: "Prisma generator for oRPC with advanced features",
    author: "Advanced Code Generation Team",
    repository: "https://github.com/omar-dulaimi/prisma-orpc-generator",
    homepage: "https://prisma-orpc-generator.dev",
    bugs: "https://github.com/omar-dulaimi/prisma-orpc-generator/issues",
    keywords: ["prisma", "orpc", "generator", "typescript", "api", "rpc", "type-safe", "codegen"],
    capabilities: [
        "Advanced oRPC router generation",
        "Comprehensive middleware system",
        "Interactive documentation",
        "Test generation",
        "Enhanced error handling",
        "Caching strategies",
        "Authentication & RBAC",
        "Rate limiting",
    ],
};
// Default configurations for quick setup
exports.PRESET_CONFIGS = {
    basic: {
        enableCaching: "false",
    },
    production: {
        enableCaching: "true",
        cacheStrategy: "redis",
        generateHealthChecks: "true",
        enableMetrics: "true",
        generateTests: "true",
    },
    serverless: {
        cacheStrategy: "memory",
    },
    enterprise: {
        enableCaching: "true",
        cacheStrategy: "redis",
        enableMetrics: "true",
        generateTests: "true",
    },
};
/**
 * Utility function to get preset configuration
 */
function getPresetConfig(preset) {
    return { ...exports.PRESET_CONFIGS[preset] };
}
/**
 * Check if the generator is compatible with the current environment
 */
function checkCompatibility() {
    const issues = [];
    const recommendations = [];
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0] || "0", 10);
    if (majorVersion < 18) {
        issues.push(`Node.js ${nodeVersion} is not supported. Minimum required version is 18.0.0`);
    }
    else if (majorVersion < 20) {
        recommendations.push("Consider upgrading to Node.js 20+ for better performance and features");
    }
    // Check for required dependencies
    try {
        require("@orpc/server");
    }
    catch {
        issues.push("Missing required dependency: @orpc/server. Install with: npm install @orpc/server");
    }
    try {
        require("@prisma/client");
    }
    catch {
        issues.push("Missing required dependency: @prisma/client. Install with: npm install @prisma/client");
    }
    return {
        compatible: issues.length === 0,
        issues,
        recommendations,
    };
}
/**
 * Display generator information
 */
function displayInfo() {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                   ${exports.GENERATOR_METADATA.name}                       ║
║                    Prisma oRPC Generator                           ║
╠════════════════════════════════════════════════════════════════════╣
║ Version: ${exports.GENERATOR_METADATA.version}                             ║
║ Description: ${exports.GENERATOR_METADATA.description.substring(0, 36)}... ║
║                                                                    ║
║ 🚀 Advanced Features:                                              ║
║   • Type-safe routers and validation                               ║
║   • Documentation helpers                                          ║
║   • Enhanced error handling                                        ║
║                                                                    ║
║ 📚 Documentation: ${exports.GENERATOR_METADATA.homepage}                   ║
║ 🐛 Issues: ${exports.GENERATOR_METADATA.bugs}                              ║
╚════════════════════════════════════════════════════════════════════╝
`);
}
function normalizeBodyEnvelope(raw) {
    if (!raw)
        return raw;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const hasJson = "json" in parsed;
            const hasMeta = "meta" in parsed;
            if (hasJson || hasMeta)
                return raw; // already valid
            if ("input" in parsed && !hasJson) {
                return JSON.stringify({ json: parsed.input });
            }
            return JSON.stringify({ json: parsed });
        }
    }
    catch {
        /* ignore parse errors */
    }
    return raw;
}
// FEATURE:request-body-envelope-normalization:done
//# sourceMappingURL=index.js.map