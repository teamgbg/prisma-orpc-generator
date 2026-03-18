/**
 * Utilities for generating ORPC procedure code snippets in the Prisma ORPC generator.
 *
 * Handles imports, context, schema validation chaining, and dispatches to operation handlers
 * for routers in scala-hub serving AI tool calls via scala-hub-tool-mcp.
 */

import { GeneratorOptions } from '@prisma/generator-helper';
import path from 'path';
import { SourceFile } from 'ts-morph';
import { Config } from '../config/schema';
import { getExposedName, getInputTypeByOpName } from './operation-utils';
import {
  generateFindMany,
  generateFindFirst,
  generateFindById,
  generateCreate,
  generateCreateMany,
  generateUpdate,
  generateUpdateMany,
  generateDelete,
  generateDeleteMany,
  generateUpsert,
  generateCount,
  generateAggregate,
  generateGroupBy,
  type HandlerContext,
  type CodeGenModel,
} from './operation-handlers';

// Types re-exported from operation-handlers
export type { CodeGenModel };

/**
 * Generate oRPC imports for a source file
 */
export function generateORPCImports(sourceFile: SourceFile): void {
  // Core oRPC imports for v1.7.10
  const existing = sourceFile
    .getImportDeclarations()
    .find((d) => d.getModuleSpecifierValue() === '@orpc/server');
  if (existing) {
    const have = new Set(existing.getNamedImports().map((n) => n.getName()));
    if (!have.has('os')) existing.addNamedImport('os');
    if (!have.has('ORPCError')) existing.addNamedImport('ORPCError');
  } else {
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
export function generateContextImport(
  sourceFile: SourceFile,
  _fromDir: string,
  config: Config,
  options: GeneratorOptions
): void {
  // If a contextPath is provided, re-export its Context (optionally widened below)
  if (config.contextPath) {
    // Compute absolute path to the context file (relative to schema when not absolute)
    const fileDir = path.dirname(sourceFile.getFilePath());
    const schemaDir = options.schemaPath ? path.dirname(options.schemaPath) : process.cwd();
    const absoluteTargetPath = path.isAbsolute(config.contextPath)
      ? config.contextPath
      : path.resolve(schemaDir, config.contextPath);

    // Compute relative module specifier from the generated file to the context file
    let relative = path.relative(fileDir, absoluteTargetPath);
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
export function generateSchemaImports(
  sourceFile: SourceFile,
  modelName: string,
  config: Config
): void {
  if (!config.generateInputValidation && !config.generateOutputValidation) return;

  // Add zod import (only supported schema library)
  if (!sourceFile.getImportDeclaration((d) => d.getModuleSpecifierValue() === 'zod')) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: 'zod',
      namedImports: ['z'],
    });
  }

  // Import generated schemas (zod only)
  // Use configured external import path (defaults to './zod-schemas'), and prefer '/schemas' index
  const externalBase =
    config.externalZodImportPath || config.zodSchemasOutputPath || './zod-schemas';
  // Determine module specifier relative to the generated file
  const fileDir = path.dirname(sourceFile.getFilePath());
  let zodModule: string;
  if (externalBase.startsWith('.') || externalBase.startsWith('/')) {
    const outputRoot = path.resolve(fileDir, '..', '..'); // routers/models -> output root
    const abs = path.resolve(outputRoot, externalBase, 'schemas', 'index');
    let rel = path.relative(fileDir, abs).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    zodModule = rel;
  } else {
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
export function generateProcedureCode(params: {
  name: string;
  operationName: string;
  inputType?: string;
  outputType?: string;
  procedureType: 'public' | 'protected';
  openApiRoute?: { method: string; path: string; successStatus?: number } | null;
  modelName: string;
  opType: string;
  baseOpType: string;
  model: CodeGenModel;
  config: Config;
  extraDescription?: string;
}): string {
  const { name, operationName, outputType, procedureType, modelName, baseOpType, config } = params;

  const procedure = procedureType === 'public' ? 'publicProcedure' : 'protectedProcedure';
  // Build output schema expression for zod
  let outputSchemaExpr: string | undefined = undefined;
  if (config.generateOutputValidation && config.schemaLibrary === 'zod') {
    // Use conservative, always-available schemas to avoid depending on non-standard exports
    if (baseOpType === 'groupBy') outputSchemaExpr = 'z.unknown()';
    else if (baseOpType === 'aggregate') outputSchemaExpr = 'z.unknown()';
    else if (['createMany', 'updateMany', 'deleteMany', 'count'].includes(baseOpType))
      outputSchemaExpr = 'z.object({ count: z.number().int().nonnegative() })';
    else if (baseOpType === 'findMany') outputSchemaExpr = 'z.array(z.unknown())';
    else outputSchemaExpr = 'z.unknown()';
  } else if (config.generateOutputValidation && outputType) {
    outputSchemaExpr = `${outputType}Schema`;
  }

  // Build procedure chain
  const chainParts = [procedure];

  // Note: Primary key detection and helper functions removed as unused

  // Map operations to their proper CRUD schemas
  let operationSchema: string | undefined;
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
  } else if (!config.generateInputValidation) {
    // Preserve type inference for generated clients even when runtime validation is disabled.
    const inputType = getInputTypeByOpName(baseOpType, modelName);
    if (inputType) {
      chainParts.push(`.input<${inputType}>()`);
    }
  }

  // Add output validation
  if (config.generateOutputValidation && outputSchemaExpr) {
    chainParts.push(`.output(${outputSchemaExpr})`);
  }

  // Generate handler
  const handlerCode = generateHandlerCode(
    baseOpType,
    modelName,
    operationName,
    config,
    params.model
  );

  // Provide a compatible handler type to satisfy @orpc/server ProcedureHandler generics across versions
  chainParts.push(`.handler((${handlerCode}) as any)`);

  return `  /**
   * ${name} - ${getExposedName(baseOpType)} operation for ${modelName}
  * Generated with advanced oRPC features${params.extraDescription ? `\n   * ${params.extraDescription}` : ''}
   */
  ${name}: ${chainParts.join('\n    ')}`;
}

/**
 * Generate handler code by dispatching to isolated operation handlers.
 *
 * Each operation (findMany, create, delete, etc.) is handled by a dedicated
 * function in operation-handlers.ts with its own org-scoping and soft-delete logic.
 */
function generateHandlerCode(
  baseOpType: string,
  modelName: string,
  _operationName: string,
  config: Config,
  model: CodeGenModel
): string {
  const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const hasSoftDelete =
    (config.enableSoftDeletes || !!model?.fields?.some((f) => f.name === 'deletedAt')) &&
    !!model?.fields?.some((f) => f.name === 'deletedAt');
  const isOrgScoped = !!model?.fields?.some((f) => f.name === 'organisation_id');

  const ctx: HandlerContext = { modelName, modelVar, isOrgScoped, hasSoftDelete };

  // Dispatch to the correct operation handler
  const handlers: Record<string, () => string> = {
    findMany: () => generateFindMany(ctx),
    findFirst: () => generateFindFirst(ctx),
    findUnique: () => generateFindById(ctx),
    create: () => generateCreate(ctx),
    createMany: () => generateCreateMany(ctx),
    update: () => generateUpdate(ctx),
    updateMany: () => generateUpdateMany(ctx),
    delete: () => generateDelete(ctx),
    deleteMany: () => generateDeleteMany(ctx),
    upsert: () => generateUpsert(ctx),
    count: () => generateCount(ctx),
    aggregate: () => generateAggregate(ctx),
    groupBy: () => generateGroupBy(ctx, model),
  };

  // Base handler structure
  let handler = `async (opt: import('@orpc/server').ProcedureHandlerOptions<Context, unknown, any, any>) => {
    const { input: rawInput, context } = opt;
    const input = rawInput as any;
    const ctx = context as Context;
    const baseOpType = '${baseOpType}';`;

  // Append operation-specific code
  const generate = handlers[baseOpType];
  if (generate) {
    handler += generate();
  } else {
    // Fallback for unknown operations
    handler += `
      const result = await ctx.prisma.${modelVar}.${baseOpType}((input) as any);`;
  }

  // findUnique (findById) should throw NOT_FOUND if no result
  if (baseOpType === 'findUnique') {
    handler += `

      if (!result) {
        throw new ORPCError('NOT_FOUND', { data: { message: \`${modelName} not found\` } });
      }`;
  }

  // Return: count operations wrap in { count }, everything else returns directly
  if (baseOpType === 'count') {
    handler += `
      return { count: result };`;
  } else {
    handler += `
      return result;`;
  }

  handler += `
    }`;

  return handler;
}
