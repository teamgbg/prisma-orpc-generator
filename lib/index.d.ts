/**
 * prisma-orpc-generator
 * Prisma generator for oRPC with advanced features
 *
 * This is the main entry point for the generator that creates
 * fully-featured oRPC routers from Prisma schemas with:
 * - Multi-runtime compatibility
 * - Advanced middleware system
 * - Strong type safety
 * - Enhanced developer experience
 */
export { Config, configSchema } from './config/schema';
export type { Config as GeneratorConfig, ModelAction, SchemaLibrary } from './config/schema';
export { generate } from './generators/orpc-generator';
export { Logger, LogLevel } from './utils/logger';
export { enhanceModelsWithMetadata, getFilterableFields, getModelRelations, getSearchableFields, getSortableFields, getUniqueFields, getValidationConstraints, hasSoftDeleteField, resolveModelsComments, shouldHaveAuditFields, supportsFullTextSearch } from './utils/model-utils';
export { getHttpMethod, getInputTypeByOpName, getOperationDescription, getOperationSummary, getOutputTypeByOpName, getRestPath, getValidationRequirements, requiresAuthentication, returnsMultiple, shouldGenerateOperation, supportsCaching } from './utils/operation-utils';
export { ProjectManager } from './utils/project-manager';
export declare const VERSION = "0.0.1";
export declare const GENERATOR_NAME = "prisma-orpc-generator";
export declare const GENERATOR_METADATA: {
    readonly name: "prisma-orpc-generator";
    readonly version: "0.0.1";
    readonly description: "Prisma generator for oRPC with advanced features";
    readonly author: "Advanced Code Generation Team";
    readonly repository: "https://github.com/omar-dulaimi/prisma-orpc-generator";
    readonly homepage: "https://prisma-orpc-generator.dev";
    readonly bugs: "https://github.com/omar-dulaimi/prisma-orpc-generator/issues";
    readonly keywords: readonly ["prisma", "orpc", "generator", "typescript", "api", "rpc", "type-safe", "codegen"];
    readonly capabilities: readonly ["Advanced oRPC router generation", "Zod schema validation with full type safety", "Comprehensive middleware system", "Interactive documentation", "Test generation", "Enhanced error handling", "Caching strategies", "Authentication & RBAC", "Rate limiting"];
};
export declare const PRESET_CONFIGS: {
    readonly basic: {
        readonly enableCaching: "false";
    };
    readonly production: {
        readonly enableCaching: "true";
        readonly cacheStrategy: "redis";
        readonly generateHealthChecks: "true";
        readonly enableMetrics: "true";
        readonly generateTests: "true";
    };
    readonly serverless: {
        readonly cacheStrategy: "memory";
    };
    readonly enterprise: {
        readonly enableCaching: "true";
        readonly cacheStrategy: "redis";
        readonly enableMetrics: "true";
        readonly generateTests: "true";
    };
};
/**
 * Utility function to get preset configuration
 */
export declare function getPresetConfig(preset: keyof typeof PRESET_CONFIGS): Record<string, string>;
/**
 * Check if the generator is compatible with the current environment
 */
export declare function checkCompatibility(): {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
};
/**
 * Display generator information
 */
export declare function displayInfo(): void;
export type NormalizedBodyEnvelope = string | undefined;
export declare function normalizeBodyEnvelope(raw: string | undefined): NormalizedBodyEnvelope;
//# sourceMappingURL=index.d.ts.map