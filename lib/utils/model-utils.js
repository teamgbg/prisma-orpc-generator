"use strict";
/**
 * Utilities for analyzing Prisma models during generation.
 *
 * Extracts relations and metadata for tailored ORPC procedures in
 * scala-hub's multi-tenant model routers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertDMMFModelToPrismaModel = convertDMMFModelToPrismaModel;
exports.convertDMMFModelsToPrismaModels = convertDMMFModelsToPrismaModels;
exports.resolveModelsComments = resolveModelsComments;
exports.enhanceModelsWithMetadata = enhanceModelsWithMetadata;
exports.getModelRelations = getModelRelations;
exports.hasSoftDeleteField = hasSoftDeleteField;
exports.hasOrganisationIdField = hasOrganisationIdField;
exports.getUniqueFields = getUniqueFields;
exports.getSearchableFields = getSearchableFields;
exports.supportsFullTextSearch = supportsFullTextSearch;
exports.getFilterableFields = getFilterableFields;
exports.getSortableFields = getSortableFields;
exports.getValidationConstraints = getValidationConstraints;
exports.shouldHaveAuditFields = shouldHaveAuditFields;
exports.getAvailableAggregations = getAvailableAggregations;
/**
 * Convert DMMF Field to PrismaField
 */
function convertDMMFFieldToPrismaField(field) {
    return {
        name: field.name,
        type: field.type,
        isId: field.isId,
        isOptional: !field.isRequired,
        isReadOnly: field.isReadOnly,
        isList: field.isList,
        relationName: field.relationName || undefined,
        relationFromFields: field.relationFromFields ? [...field.relationFromFields] : undefined,
        relationToFields: field.relationToFields ? [...field.relationToFields] : undefined,
        kind: field.kind,
        hasDefaultValue: field.hasDefaultValue,
        default: field.default,
        isGenerated: field.isGenerated,
        isUpdatedAt: field.isUpdatedAt,
    };
}
/**
 * Convert DMMF Model to PrismaModel
 */
function convertDMMFModelToPrismaModel(model) {
    return {
        name: model.name,
        dbName: model.dbName || undefined,
        fields: model.fields.map(convertDMMFFieldToPrismaField),
        primaryKey: model.primaryKey
            ? {
                name: model.primaryKey.name || undefined,
                fields: [...model.primaryKey.fields],
            }
            : undefined,
        uniqueFields: model.uniqueFields
            ? model.uniqueFields.map((field) => [...field])
            : [],
        uniqueIndexes: (model.uniqueIndexes || []).map((index) => ({
            name: index.name,
            fields: [...index.fields],
        })),
        isGenerated: model.isGenerated,
        documentation: model.documentation || undefined,
    };
}
/**
 * Convert array of DMMF Models to PrismaModels
 */
function convertDMMFModelsToPrismaModels(models) {
    return models.map(convertDMMFModelToPrismaModel);
}
/**
 * Resolve model comments to determine hidden models
 */
function resolveModelsComments(models, hiddenModels) {
    for (const model of models) {
        if (model.documentation) {
            // Check for hide directive in documentation
            const hideMatch = model.documentation.match(/@@@Gen\.model\(hide:\s*true\)/);
            if (hideMatch) {
                hiddenModels.push(model.name);
            }
        }
    }
}
/**
 * Enhance models with metadata from configuration
 */
function enhanceModelsWithMetadata(models, config) {
    return models.map((model) => ({
        ...model,
        metadata: {
            generateRouter: true,
            enableSoftDeletes: config.enableSoftDeletes,
            ...extractModelMetadata(model),
        },
    }));
}
/**
 * Extract metadata from model documentation
 */
function extractModelMetadata(model) {
    const metadata = {};
    if (!model.documentation)
        return metadata;
    // Parse custom directives from documentation
    const directives = model.documentation.match(/@@@\w+\([^)]+\)/g) || [];
    for (const directive of directives) {
        const match = directive.match(/@@@(\w+)\(([^)]+)\)/);
        if (match) {
            const [, directiveName, params] = match;
            switch (directiveName) {
                case "Auth":
                    metadata.authRequired = parseDirectiveParams(params).required === "true";
                    break;
                case "Cache": {
                    const cacheParams = parseDirectiveParams(params);
                    metadata.cacheTTL = parseInt(cacheParams.ttl || "300", 10);
                    metadata.cacheEnabled = cacheParams.enabled !== "false";
                    break;
                }
                case "RateLimit": {
                    const rateLimitParams = parseDirectiveParams(params);
                    metadata.rateLimit = {
                        requests: parseInt(rateLimitParams.requests || "100", 10),
                        windowMs: parseInt(rateLimitParams.windowMs || "900000", 10),
                    };
                    break;
                }
            }
        }
    }
    return metadata;
}
/**
 * Parse directive parameters
 */
function parseDirectiveParams(paramsString) {
    const params = {};
    const pairs = paramsString.split(",");
    for (const pair of pairs) {
        const [key, value] = pair.split(":").map((s) => s.trim());
        if (key && value) {
            params[key] = value.replace(/['"]/g, "");
        }
    }
    return params;
}
/**
 * Get model relations for enhanced router generation
 */
function getModelRelations(model) {
    return model.fields.filter((field) => field.relationName);
}
/**
 * Check if model has soft delete field
 */
function hasSoftDeleteField(model) {
    return model.fields.some((field) => field.name === "deletedAt" && field.type === "DateTime");
}
/**
 * Check if model is org-scoped (has organisation_id field)
 */
function hasOrganisationIdField(model) {
    return model.fields.some((field) => field.name === "organisation_id" && field.type === "String");
}
/**
 * Get model's unique fields for findUnique operations
 */
function getUniqueFields(model) {
    const uniqueFields = [];
    // Add primary key fields
    for (const field of model.fields) {
        if (field.isId) {
            uniqueFields.push(field.name);
        }
    }
    // Add @unique fields
    for (const field of model.fields) {
        if (field.isUnique) {
            uniqueFields.push(field.name);
        }
    }
    return uniqueFields;
}
/**
 * Get searchable fields for findMany operations
 */
function getSearchableFields(model) {
    const searchableTypes = ["String", "Int", "BigInt", "Float", "Decimal"];
    return model.fields
        .filter((field) => searchableTypes.includes(field.type) && !field.isList && field.name !== "id")
        .map((field) => field.name);
}
/**
 * Check if model supports full-text search
 */
function supportsFullTextSearch(model) {
    return model.fields.some((field) => field.type === "String" && field.documentation?.includes("@fulltext"));
}
/**
 * Get filterable fields for where clauses
 */
function getFilterableFields(model) {
    return model.fields.filter((field) => {
        // Include scalar fields and foreign keys
        return (!field.isList && (field.kind === "scalar" || field.relationName) // Foreign key fields
        );
    });
}
/**
 * Get sortable fields for orderBy clauses
 */
function getSortableFields(model) {
    const sortableTypes = ["String", "Int", "BigInt", "Float", "Decimal", "DateTime", "Boolean"];
    return model.fields
        .filter((field) => sortableTypes.includes(field.type) && !field.isList)
        .map((field) => field.name);
}
/**
 * Generate model validation constraints from Prisma schema
 */
function getValidationConstraints(model) {
    const constraints = {};
    for (const field of model.fields) {
        const fieldConstraints = {};
        // Required fields
        if (field.isRequired && !field.hasDefaultValue) {
            fieldConstraints.required = true;
        }
        // String length constraints
        if (field.type === "String" && field.documentation) {
            const maxLengthMatch = field.documentation.match(/@db\.VarChar\((\d+)\)/);
            if (maxLengthMatch) {
                fieldConstraints.maxLength = parseInt(maxLengthMatch[1], 10);
            }
        }
        // Numeric constraints
        if (["Int", "Float", "Decimal"].includes(field.type)) {
            if (field.documentation) {
                const minMatch = field.documentation.match(/@min\((\d+)\)/);
                const maxMatch = field.documentation.match(/@max\((\d+)\)/);
                if (minMatch)
                    fieldConstraints.min = parseInt(minMatch[1], 10);
                if (maxMatch)
                    fieldConstraints.max = parseInt(maxMatch[1], 10);
            }
        }
        // Email validation
        if (field.name.toLowerCase().includes("email") && field.type === "String") {
            fieldConstraints.email = true;
        }
        // URL validation
        if (field.name.toLowerCase().includes("url") && field.type === "String") {
            fieldConstraints.url = true;
        }
        if (Object.keys(fieldConstraints).length > 0) {
            constraints[field.name] = fieldConstraints;
        }
    }
    return constraints;
}
/**
 * Check if model should have audit fields
 */
function shouldHaveAuditFields(model) {
    return model.fields.some((field) => ["createdAt", "updatedAt", "createdBy", "updatedBy"].includes(field.name));
}
/**
 * Get available aggregation functions for a model based on its field types
 * @param model The Prisma model
 * @returns Object with boolean flags for available aggregations
 */
function getAvailableAggregations(model) {
    // Numeric field types that support _sum and _avg
    const numericTypes = ["Int", "Float", "Decimal", "BigInt"];
    // Comparable field types that support _min and _max (includes numeric + date/string)
    const comparableTypes = [...numericTypes, "DateTime", "String"];
    const numericFields = model.fields.filter((field) => numericTypes.includes(field.type) && !field.isList);
    const comparableFields = model.fields.filter((field) => comparableTypes.includes(field.type) && !field.isList);
    return {
        hasNumericFields: numericFields.length > 0,
        hasComparableFields: comparableFields.length > 0,
        supportsSum: numericFields.length > 0,
        supportsAvg: numericFields.length > 0,
        supportsMin: comparableFields.length > 0,
        supportsMax: comparableFields.length > 0,
        supportsCount: true, // _count is always available
    };
}
//# sourceMappingURL=model-utils.js.map