"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateORPCImports = generateORPCImports;
exports.generateContextImport = generateContextImport;
exports.generateSchemaImports = generateSchemaImports;
exports.generateProcedureCode = generateProcedureCode;
const path_1 = __importDefault(require("path"));
const model_utils_1 = require("./model-utils");
const operation_utils_1 = require("./operation-utils");
/**
 * Generate oRPC imports for a source file
 */
function generateORPCImports(sourceFile) {
    // Core oRPC imports for v1.7.10
    const existing = sourceFile
        .getImportDeclarations()
        .find((d) => d.getModuleSpecifierValue() === '@orpc/server');
    if (existing) {
        const have = new Set(existing.getNamedImports().map((n) => n.getName()));
        if (!have.has('os'))
            existing.addNamedImport('os');
        if (!have.has('ORPCError'))
            existing.addNamedImport('ORPCError');
    }
    else {
        sourceFile.addImportDeclaration({
            moduleSpecifier: '@orpc/server',
            namedImports: ['os', 'ORPCError'],
        });
    }
    // Do not import @orpc/zod plugin (oz). Validation schemas are handled directly per-operation.
    // Additional imports based on configuration - currently disabled to avoid config type issues
    // These can be enabled when the config schema includes the necessary properties
}
/**
 * Generate context import
 */
function generateContextImport(sourceFile, _fromDir, config, options) {
    // If a contextPath is provided, re-export its Context (optionally widened below)
    if (config.contextPath) {
        // Compute absolute path to the context file (relative to schema when not absolute)
        const fileDir = path_1.default.dirname(sourceFile.getFilePath());
        const schemaDir = options.schemaPath ? path_1.default.dirname(options.schemaPath) : process.cwd();
        const absoluteTargetPath = path_1.default.isAbsolute(config.contextPath)
            ? config.contextPath
            : path_1.default.resolve(schemaDir, config.contextPath);
        // Compute relative module specifier from the generated file to the context file
        let relative = path_1.default.relative(fileDir, absoluteTargetPath);
        // Normalize separators to POSIX for TS module specifiers
        relative = relative.replace(/\\/g, '/');
        // Drop .ts extension if present
        relative = relative.replace(/\.ts$/i, '');
        // Ensure it starts with './' or '../'
        if (!relative.startsWith('.') && !relative.startsWith('/')) {
            relative = `./${relative}`;
        }
        // Simple pass-through re-export
        sourceFile.addStatements(`
import type { Context } from '${relative}';
export type { Context };
`);
        return;
    }
    // No contextPath provided: do not inline here. The base router generator will declare
    // PrismaClient import and a full Context interface with any feature-driven fields.
    // This avoids duplicate identifiers when both utilities run.
}
/**
 * Generate schema imports based on validation library
 */
function generateSchemaImports(sourceFile, modelName, config) {
    if (!config.generateInputValidation && !config.generateOutputValidation)
        return;
    // Add zod import (only supported schema library)
    if (!sourceFile.getImportDeclaration((d) => d.getModuleSpecifierValue() === 'zod')) {
        sourceFile.addImportDeclaration({
            moduleSpecifier: 'zod',
            namedImports: ['z'],
        });
    }
    // Import generated schemas (zod only)
    // Use configured external import path (defaults to './zod-schemas'), and prefer '/schemas' index
    const externalBase = config.externalZodImportPath || config.zodSchemasOutputPath || './zod-schemas';
    // Determine module specifier relative to the generated file
    const fileDir = path_1.default.dirname(sourceFile.getFilePath());
    let zodModule;
    if (externalBase.startsWith('.') || externalBase.startsWith('/')) {
        const outputRoot = path_1.default.resolve(fileDir, '..', '..'); // routers/models -> output root
        const abs = path_1.default.resolve(outputRoot, externalBase, 'schemas', 'index');
        let rel = path_1.default.relative(fileDir, abs).replace(/\\/g, '/');
        if (!rel.startsWith('.'))
            rel = `./${rel}`;
        zodModule = rel;
    }
    else {
        // Bare module specifier, append '/schemas/index' to be bundler-friendly
        zodModule = `${externalBase}/schemas/index`;
    }
    if (config.generateInputValidation) {
        // Import CRUD operation schemas instead of generic input schemas
        sourceFile.addImportDeclaration({
            moduleSpecifier: zodModule,
            namedImports: [
                `${modelName}FindManySchema`,
                `${modelName}FindFirstSchema`,
                `${modelName}FindUniqueSchema`,
                `${modelName}CreateOneSchema`,
                `${modelName}CreateManySchema`,
                `${modelName}UpdateOneSchema`,
                `${modelName}UpdateManySchema`,
                `${modelName}DeleteOneSchema`,
                `${modelName}DeleteManySchema`,
                `${modelName}GroupBySchema`,
                `${modelName}AggregateSchema`,
                `${modelName}CountSchema`,
            ],
        });
        // No need for aliases - use the CRUD schemas directly
    }
}
/**
 * Generate procedure code with enhanced features
 */
function generateProcedureCode(params) {
    const { name, operationName, outputType, procedureType, modelName, baseOpType, config } = params;
    const procedure = procedureType === 'public' ? 'publicProcedure' : 'protectedProcedure';
    // Build output schema expression for zod
    let outputSchemaExpr = undefined;
    if (config.generateOutputValidation && config.schemaLibrary === 'zod') {
        // Use conservative, always-available schemas to avoid depending on non-standard exports
        if (baseOpType === 'groupBy')
            outputSchemaExpr = 'z.unknown()';
        else if (baseOpType === 'aggregate')
            outputSchemaExpr = 'z.unknown()';
        else if (['createMany', 'updateMany', 'deleteMany', 'count'].includes(baseOpType))
            outputSchemaExpr = 'z.object({ count: z.number().int().nonnegative() })';
        else if (baseOpType === 'findMany')
            outputSchemaExpr = 'z.array(z.unknown())';
        else
            outputSchemaExpr = 'z.unknown()';
    }
    else if (config.generateOutputValidation && outputType) {
        outputSchemaExpr = `${outputType}Schema`;
    }
    // Build procedure chain
    const chainParts = [procedure];
    // Note: Primary key detection and helper functions removed as unused
    // Map operations to their proper CRUD schemas
    let operationSchema;
    switch (baseOpType) {
        case 'findMany':
            operationSchema = `${modelName}FindManySchema`;
            break;
        case 'findFirst':
            operationSchema = `${modelName}FindFirstSchema`;
            break;
        case 'findUnique':
            operationSchema = `${modelName}FindUniqueSchema`;
            break;
        case 'create':
            operationSchema = `${modelName}CreateOneSchema`;
            break;
        case 'createMany':
            operationSchema = `${modelName}CreateManySchema`;
            break;
        case 'update':
            operationSchema = `${modelName}UpdateOneSchema`;
            break;
        case 'updateMany':
            operationSchema = `${modelName}UpdateManySchema`;
            break;
        case 'delete':
            operationSchema = `${modelName}DeleteOneSchema`;
            break;
        case 'deleteMany':
            operationSchema = `${modelName}DeleteManySchema`;
            break;
        case 'count':
            operationSchema = `${modelName}CountSchema`;
            break;
        case 'groupBy':
            operationSchema = `${modelName}GroupBySchema`;
            break;
        case 'aggregate':
            operationSchema = `${modelName}AggregateSchema`;
            break;
    }
    // Add input validation using proper CRUD schemas
    if (config.generateInputValidation && operationSchema) {
        chainParts.push(`.input(${operationSchema})`);
    }
    else if (!config.generateInputValidation) {
        // Preserve type inference for generated clients even when runtime validation is disabled.
        const inputType = (0, operation_utils_1.getInputTypeByOpName)(baseOpType, modelName);
        if (inputType) {
            chainParts.push(`.input<${inputType}>()`);
        }
    }
    // Add output validation
    if (config.generateOutputValidation && outputSchemaExpr) {
        chainParts.push(`.output(${outputSchemaExpr})`);
    }
    // Generate handler
    const handlerCode = generateHandlerCode(baseOpType, modelName, operationName, config, params.model);
    // Provide a compatible handler type to satisfy @orpc/server ProcedureHandler generics across versions
    chainParts.push(`.handler((${handlerCode}) as any)`);
    return `  /**
   * ${name} - ${baseOpType} operation for ${modelName}
  * Generated with advanced oRPC features${params.extraDescription ? `\n   * ${params.extraDescription}` : ''}
   */
  ${name}: ${chainParts.join('\n    ')}`;
}
/**
 * Check if model has organisation_id field (org-scoped)
 */
function hasOrganisationIdField(model) {
    return !!model?.fields?.some((f) => f.name === 'organisation_id');
}
/**
 * Generate handler code for different operations
 */
function generateHandlerCode(baseOpType, modelName, operationName, config, model) {
    const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const hasDeletedAt = !!model?.fields?.some((f) => f.name === 'deletedAt');
    const isOrgScoped = hasOrganisationIdField(model);
    // Base handler structure
    let handler = `async (opt: import('@orpc/server').ProcedureHandlerOptions<Context, unknown, any, any>) => {
    const { input: rawInput, context } = opt;
    const input = rawInput as any;
    const ctx = context as Context;
    const baseOpType = '${baseOpType}';`;
    // Add the main operation with correct Prisma method calls
    const prismaMethod = (0, operation_utils_1.getPrismaMethodName)(baseOpType);
    // For soft delete aware reads, inject deletedAt filter lazily
    if ((config.enableSoftDeletes || hasDeletedAt) &&
        hasDeletedAt &&
        ['findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(baseOpType)) {
        handler += `
      // Apply soft-delete filter - input now has proper CRUD schema structure
  const queryArgs: { where?: { [k: string]: unknown } } = { ...(input as any) };
      if (!queryArgs.where) queryArgs.where = {};
      if (queryArgs.where.deletedAt === undefined) {
        (queryArgs.where as { [k: string]: unknown }).deletedAt = null;
      }${isOrgScoped ? `
      // Org scoping - inject organisation_id filter
      if (ctx.orgId) {
        (queryArgs.where as { [k: string]: unknown }).organisation_id = ctx.orgId;
      }` : ''}
      const result = await ctx.prisma.${modelVar}.${prismaMethod}(queryArgs as unknown);`;
    }
    else if ((config.enableSoftDeletes || hasDeletedAt) &&
        hasDeletedAt &&
        baseOpType === 'findUnique') {
        handler += `
      // Ensure soft-deleted records are excluded - input has { where: ... } structure
  const uniqueArgs = { ...input };
      if (!uniqueArgs.where) uniqueArgs.where = {};
      if ((uniqueArgs.where as any).deletedAt === undefined) (uniqueArgs.where as any).deletedAt = null;${isOrgScoped ? `
      // Org scoping - inject organisation_id filter
      if (ctx.orgId) {
        (uniqueArgs.where as any).organisation_id = ctx.orgId;
      }` : ''}
      const result = await ctx.prisma.${modelVar}.findUnique(uniqueArgs);`;
    }
    else if ((config.enableSoftDeletes || hasDeletedAt) &&
        hasDeletedAt &&
        baseOpType === 'delete') {
        handler += `
      // Soft delete via update (set deletedAt) - input has { where: ... } structure${isOrgScoped ? `
      // Org scoping - ensure user can only delete records in their org
      const deleteWhere = { ...input.where };
      if (ctx.orgId) {
        (deleteWhere as any).organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.update({ where: deleteWhere, data: { deletedAt: new Date() } });` : `
      const result = await ctx.prisma.${modelVar}.update({ where: input.where, data: { deletedAt: new Date() } });`}`;
    }
    else if ((config.enableSoftDeletes || hasDeletedAt) &&
        hasDeletedAt &&
        baseOpType === 'deleteMany') {
        handler += `
      // Soft delete many via updateMany (set deletedAt) - input has { where: ... } structure${isOrgScoped ? `
      // Org scoping - ensure user can only delete records in their org
      const deleteManyWhere = { ...(input.where || {}) };
      if (ctx.orgId) {
        (deleteManyWhere as any).organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.updateMany({ where: deleteManyWhere, data: { deletedAt: new Date() } });` : `
      const result = await ctx.prisma.${modelVar}.updateMany({ where: input.where, data: { deletedAt: new Date() } });`}`;
    }
    else if (baseOpType === 'groupBy') {
        // Analyze which aggregations are available for this model
        const aggregations = (0, model_utils_1.getAvailableAggregations)(model);
        handler += `
  type _GroupByArgs = Partial<Prisma.${modelName}GroupByArgs> & { by: Prisma.${modelName}ScalarFieldEnum[] };
      const args: _GroupByArgs = {} as _GroupByArgs;
      if (input?.by) (args as any).by = (input.by as any[]).length ? input.by : ['id'];
      if (input?.where) (args as any).where = input.where as Prisma.${modelName}WhereInput;
      if (input?.orderBy) (args as any).orderBy = input.orderBy as any;
      if (input?.having) (args as any).having = input.having as any;
      if (input?.take) (args as any).take = Math.min(input.take as number, 500);
      if (input?.skip) (args as any).skip = input.skip as number;`;
        handler += `
      if (((args as any).take || (args as any).skip) && !(args as any).orderBy) { (args as any).orderBy = [{ id: 'asc' }] as any; }`;
        // Only include aggregations that are supported by the model
        if (aggregations.supportsCount) {
            handler += `
      if (input?._count) args._count = input._count;`;
        }
        if (aggregations.supportsSum) {
            handler += `
      if (input?._sum) args._sum = input._sum;`;
        }
        if (aggregations.supportsAvg) {
            handler += `
      if (input?._avg) args._avg = input._avg;`;
        }
        if (aggregations.supportsMin) {
            handler += `
      if (input?._min) args._min = input._min;`;
        }
        if (aggregations.supportsMax) {
            handler += `
      if (input?._max) args._max = input._max;`;
        }
        // Add org scoping for groupBy
        if (isOrgScoped) {
            handler += `
      // Org scoping - inject organisation_id filter
      if (ctx.orgId) {
        if (!(args as any).where) (args as any).where = {};
        (args.where as any).organisation_id = ctx.orgId;
      }`;
        }
        handler += `
  const result = await ctx.prisma.${modelVar}.groupBy(args as any);`;
    }
    else if (baseOpType === 'aggregate') {
        handler += `
  const aggArgs: { [k: string]: unknown; _count?: unknown; _avg?: unknown; _sum?: unknown; _min?: unknown; _max?: unknown; where?: unknown } = input ? { ...(input as Record<string, unknown>) } : {};
      if (!aggArgs._count && !aggArgs._avg && !aggArgs._sum && !aggArgs._min && !aggArgs._max) {
        (aggArgs as { [k: string]: unknown })._count = { _all: true }; // ensure at least one selection to satisfy Prisma
      }${isOrgScoped ? `
      // Org scoping - inject organisation_id filter
      if (ctx.orgId) {
        if (!aggArgs.where) aggArgs.where = {};
        (aggArgs.where as any).organisation_id = ctx.orgId;
      }` : ''}
      const result = await ctx.prisma.${modelVar}.aggregate(aggArgs as Prisma.${modelName}AggregateArgs);`;
    }
    else if (baseOpType === 'create') {
        // Create operation - inject org_id into data if org-scoped
        if (isOrgScoped) {
            handler += `
      // Org scoping - inject organisation_id into data
      const createData = {
        ...input.data,
        organisation_id: ctx.orgId,
      };
      const result = await ctx.prisma.${modelVar}.create({ data: createData } as Prisma.${modelName}CreateArgs);`;
        }
        else {
            handler += `
      const result = await ctx.prisma.${modelVar}.create((input) as Prisma.${modelName}CreateArgs);`;
        }
    }
    else if (baseOpType === 'createMany') {
        // CreateMany operation - inject org_id into data if org-scoped
        if (isOrgScoped) {
            handler += `
      // Org scoping - inject organisation_id into each data item
      const createManyData = Array.isArray(input.data)
        ? input.data.map((item: any) => ({ ...item, organisation_id: ctx.orgId }))
        : { ...input.data, organisation_id: ctx.orgId };
      const result = await ctx.prisma.${modelVar}.createMany({ data: createManyData } as Prisma.${modelName}CreateManyArgs);`;
        }
        else {
            handler += `
      const result = await ctx.prisma.${modelVar}.createMany((input) as Prisma.${modelName}CreateManyArgs);`;
        }
    }
    else if (baseOpType === 'update') {
        // Update operation - add org filter to where clause
        if (isOrgScoped) {
            handler += `
      // Org scoping - ensure user can only update records in their org
      const updateWhere = { ...input.where };
      if (ctx.orgId) {
        (updateWhere as any).organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.update({ where: updateWhere, data: input.data } as Prisma.${modelName}UpdateArgs);`;
        }
        else {
            handler += `
      const result = await ctx.prisma.${modelVar}.update((input) as Prisma.${modelName}UpdateArgs);`;
        }
    }
    else if (baseOpType === 'updateMany') {
        // UpdateMany operation - add org filter to where clause
        if (isOrgScoped) {
            handler += `
      // Org scoping - ensure user can only update records in their org
      const updateManyWhere = { ...(input.where || {}) };
      if (ctx.orgId) {
        (updateManyWhere as any).organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.updateMany({ where: updateManyWhere, data: input.data } as Prisma.${modelName}UpdateManyArgs);`;
        }
        else {
            handler += `
      const result = await ctx.prisma.${modelVar}.updateMany((input) as Prisma.${modelName}UpdateManyArgs);`;
        }
    }
    else if (baseOpType === 'delete') {
        // Delete operation - add org filter to where clause
        if (isOrgScoped) {
            handler += `
      // Org scoping - ensure user can only delete records in their org
      const deleteWhere = { ...input.where };
      if (ctx.orgId) {
        (deleteWhere as any).organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.delete({ where: deleteWhere } as Prisma.${modelName}DeleteArgs);`;
        }
        else {
            handler += `
      // DeleteOneSchema provides { where: ... } structure
      const result = await ctx.prisma.${modelVar}.delete({ where: input.where } as Prisma.${modelName}DeleteArgs);`;
        }
    }
    else if (baseOpType === 'deleteMany') {
        // DeleteMany operation - add org filter to where clause
        if (isOrgScoped) {
            handler += `
      // Org scoping - ensure user can only delete records in their org
      const deleteManyWhere = { ...(input.where || {}) };
      if (ctx.orgId) {
        (deleteManyWhere as any).organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.deleteMany({ where: deleteManyWhere } as Prisma.${modelName}DeleteManyArgs);`;
        }
        else {
            handler += `
      // DeleteManySchema provides { where: ... } structure
      const result = await ctx.prisma.${modelVar}.deleteMany({ where: input.where } as Prisma.${modelName}DeleteManyArgs);`;
        }
    }
    else if (baseOpType === 'upsert') {
        // Upsert operation - add org filter to where clause and inject into create data
        if (isOrgScoped) {
            handler += `
      // Org scoping - ensure user can only upsert records in their org
      const upsertWhere = { ...input.where };
      if (ctx.orgId) {
        (upsertWhere as any).organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.upsert({
        where: upsertWhere,
        create: { ...input.create, organisation_id: ctx.orgId },
        update: input.update,
      } as Prisma.${modelName}UpsertArgs);`;
        }
        else {
            handler += `
      const result = await ctx.prisma.${modelVar}.upsert((input) as Prisma.${modelName}UpsertArgs);`;
        }
    }
    else if (['findFirst', 'findMany'].includes(baseOpType)) {
        // Read operations with potential org scoping
        const opToArgs = {
            findFirst: 'FindFirstArgs',
            findMany: 'FindManyArgs',
        };
        const argsType = opToArgs[baseOpType] || 'FindManyArgs';
        if (isOrgScoped) {
            handler += `
      // Org scoping - inject organisation_id filter
      const queryArgs = { ...input };
      if (!queryArgs.where) queryArgs.where = {};
      if (ctx.orgId) {
        (queryArgs.where as any).organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.${prismaMethod}(queryArgs as Prisma.${modelName}${argsType});`;
        }
        else {
            handler += `
      const result = await ctx.prisma.${modelVar}.${prismaMethod}((input) as Prisma.${modelName}${argsType});`;
        }
    }
    else if (baseOpType === 'findUnique') {
        // FindUnique with potential org scoping
        if (isOrgScoped) {
            handler += `
      // Org scoping - inject organisation_id filter for unique lookup
      const uniqueWhere = { ...input.where };
      if (ctx.orgId) {
        (uniqueWhere as any).organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.findUnique({ where: uniqueWhere } as Prisma.${modelName}FindUniqueArgs);`;
        }
        else {
            handler += `
      const result = await ctx.prisma.${modelVar}.findUnique((input) as Prisma.${modelName}FindUniqueArgs);`;
        }
    }
    else if (baseOpType === 'count') {
        // Count with potential org scoping
        if (isOrgScoped) {
            handler += `
      // Org scoping - inject organisation_id filter
      const countArgs = { ...input };
      if (!countArgs.where) countArgs.where = {};
      if (ctx.orgId) {
        (countArgs.where as any).organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.count(countArgs as Prisma.${modelName}CountArgs);`;
        }
        else {
            handler += `
      const result = await ctx.prisma.${modelVar}.count((input) as Prisma.${modelName}CountArgs);`;
        }
    }
    else {
        // Fallback for any other operations
        const opToArgs = {
            create: 'CreateArgs',
            createMany: 'CreateManyArgs',
            findFirst: 'FindFirstArgs',
            findMany: 'FindManyArgs',
            findUnique: 'FindUniqueArgs',
            update: 'UpdateArgs',
            updateMany: 'UpdateManyArgs',
            upsert: 'UpsertArgs',
            delete: 'DeleteArgs',
            deleteMany: 'DeleteManyArgs',
            count: 'CountArgs',
        };
        const argsType = opToArgs[baseOpType] || 'FindManyArgs';
        handler += `
      const result = await ctx.prisma.${modelVar}.${prismaMethod}((input) as Prisma.${modelName}${argsType});`;
    }
    // Return results directly (no wrapper)
    if (baseOpType === 'count') {
        handler += `
      return { count: result };`;
    }
    else {
        handler += `
      return result;`;
    }
    handler += `
    }`;
    return handler;
}
// Helper functions for schema name generation removed as they were unused
// If needed in the future, they can generate input and output schema names for models
//# sourceMappingURL=code-generation-utils.js.map