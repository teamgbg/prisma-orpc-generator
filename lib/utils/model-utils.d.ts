/**
 * Utilities for analyzing Prisma models during generation.
 *
 * Extracts relations and metadata for tailored ORPC procedures in
 * scala-hub's multi-tenant model routers.
 */
import { Config } from '../config/schema';
import type { DMMF } from '@prisma/generator-helper';
import { PrismaModel } from '../types/generator-types';
interface ValidationConstraint {
    required?: boolean;
    maxLength?: number;
    min?: number;
    max?: number;
    email?: boolean;
    url?: boolean;
    [key: string]: unknown;
}
/**
 * Convert DMMF Model to PrismaModel
 */
export declare function convertDMMFModelToPrismaModel(model: DMMF.Model): PrismaModel;
/**
 * Convert array of DMMF Models to PrismaModels
 */
export declare function convertDMMFModelsToPrismaModels(models: DMMF.Model[]): PrismaModel[];
/**
 * Resolve model comments to determine hidden models
 */
export declare function resolveModelsComments(models: DMMF.Model[], hiddenModels: string[]): void;
/**
 * Enhance models with metadata from configuration
 */
export declare function enhanceModelsWithMetadata(models: DMMF.Model[], config: Config): DMMF.Model[];
/**
 * Get model relations for enhanced router generation
 */
export declare function getModelRelations(model: DMMF.Model): DMMF.Field[];
/**
 * Check if model has soft delete field
 */
export declare function hasSoftDeleteField(model: DMMF.Model): boolean;
/**
 * Check if model is org-scoped (has organisation_id field)
 */
export declare function hasOrganisationIdField(model: DMMF.Model): boolean;
/**
 * Get model's unique fields for findUnique operations
 */
export declare function getUniqueFields(model: DMMF.Model): string[];
/**
 * Get searchable fields for findMany operations
 */
export declare function getSearchableFields(model: DMMF.Model): string[];
/**
 * Check if model supports full-text search
 */
export declare function supportsFullTextSearch(model: DMMF.Model): boolean;
/**
 * Get filterable fields for where clauses
 */
export declare function getFilterableFields(model: DMMF.Model): DMMF.Field[];
/**
 * Get sortable fields for orderBy clauses
 */
export declare function getSortableFields(model: DMMF.Model): string[];
/**
 * Generate model validation constraints from Prisma schema
 */
export declare function getValidationConstraints(model: DMMF.Model): Record<string, ValidationConstraint>;
/**
 * Check if model should have audit fields
 */
export declare function shouldHaveAuditFields(model: DMMF.Model): boolean;
interface FieldLike {
    type: string;
    isList?: boolean;
}
interface ModelWithFields {
    fields: FieldLike[];
}
/**
 * Get available aggregation functions for a model based on its field types
 * @param model The Prisma model
 * @returns Object with boolean flags for available aggregations
 */
export declare function getAvailableAggregations(model: ModelWithFields): {
    hasNumericFields: boolean;
    hasComparableFields: boolean;
    supportsSum: boolean;
    supportsAvg: boolean;
    supportsMin: boolean;
    supportsMax: boolean;
    supportsCount: boolean;
};
export {};
//# sourceMappingURL=model-utils.d.ts.map