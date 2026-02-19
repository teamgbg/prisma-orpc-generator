import { GeneratorOptions } from '@prisma/generator-helper';
import path from 'path';
import { SourceFile } from 'ts-morph';
import { Config } from '../config/schema';
import { getAvailableAggregations } from './model-utils';
import { getInputTypeByOpName, getPrismaMethodName } from './operation-utils';

// Type interfaces for code generation
interface CodeGenField {
  name: string;
  type: string;
  isId?: boolean;
  isOptional?: boolean;
  hasDefaultValue?: boolean;
  isUpdatedAt?: boolean;
  relationName?: string;
  kind?: string;
  isList?: boolean;
}

interface CodeGenModel {
  name: string;
  fields: CodeGenField[];
}

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
  if (config.contextPath) {
    const fileDir = path.dirname(sourceFile.getFilePath());
    const schemaDir = options.schemaPath ? path.dirname(options.schemaPath) : process.cwd();
    const absoluteTargetPath = path.isAbsolute(config.contextPath)
      ? config.contextPath
      : path.resolve(schemaDir, config.contextPath);

    let relative = path.relative(fileDir, absoluteTargetPath);
    relative = relative.replace(/\/g, '/');
    relative = relative.replace(/\.ts$/i, '');
    if (!relative.startsWith('.') && !relative.startsWith('/')) {
      relative = './' + relative;
    }

    sourceFile.addStatements('import type { Context } from "' + relative + '";
export type { Context };');
    return;
  }
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

  if (!sourceFile.getImportDeclaration((d) => d.getModuleSpecifierValue() === 'zod')) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: 'zod',
      namedImports: ['z'],
    });
  }

  const externalBase = config.externalZodImportPath || config.zodSchemasOutputPath || './zod-schemas';
  const fileDir = path.dirname(sourceFile.getFilePath());
  let zodModule: string;
  if (externalBase.startsWith('.') || externalBase.startsWith('/')) {
    const outputRoot = path.resolve(fileDir, '..', '..');
    const abs = path.resolve(outputRoot, externalBase, 'schemas', 'index');
    let rel = path.relative(fileDir, abs).replace(/\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    zodModule = rel;
  } else {
    zodModule = externalBase + '/schemas/index';
  }

  if (config.generateInputValidation) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: zodModule,
      namedImports: [
        modelName + 'FindManySchema',
        modelName + 'FindFirstSchema',
        modelName + 'FindUniqueSchema',
        modelName + 'CreateOneSchema',
        modelName + 'CreateManySchema',
        modelName + 'UpdateOneSchema',
        modelName + 'UpdateManySchema',
        modelName + 'DeleteOneSchema',
        modelName + 'DeleteManySchema',
        modelName + 'GroupBySchema',
        modelName + 'AggregateSchema',
        modelName + 'CountSchema',
      ],
    });
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
  let outputSchemaExpr: string | undefined = undefined;
  if (config.generateOutputValidation && config.schemaLibrary === 'zod') {
    if (baseOpType === 'groupBy') outputSchemaExpr = 'z.unknown()';
    else if (baseOpType === 'aggregate') outputSchemaExpr = 'z.unknown()';
    else if (['createMany', 'updateMany', 'deleteMany', 'count'].includes(baseOpType))
      outputSchemaExpr = 'z.object({ count: z.number().int().nonnegative() })';
    else if (baseOpType === 'findMany') outputSchemaExpr = 'z.array(z.unknown())';
    else outputSchemaExpr = 'z.unknown()';
  } else if (config.generateOutputValidation && outputType) {
    outputSchemaExpr = outputType + 'Schema';
  }

  const chainParts = [procedure];

  let operationSchema: string | undefined;
  switch (baseOpType) {
    case 'findMany': operationSchema = modelName + 'FindManySchema'; break;
    case 'findFirst': operationSchema = modelName + 'FindFirstSchema'; break;
    case 'findUnique': operationSchema = modelName + 'FindUniqueSchema'; break;
    case 'create': operationSchema = modelName + 'CreateOneSchema'; break;
    case 'createMany': operationSchema = modelName + 'CreateManySchema'; break;
    case 'update': operationSchema = modelName + 'UpdateOneSchema'; break;
    case 'updateMany': operationSchema = modelName + 'UpdateManySchema'; break;
    case 'delete': operationSchema = modelName + 'DeleteOneSchema'; break;
    case 'deleteMany': operationSchema = modelName + 'DeleteManySchema'; break;
    case 'count': operationSchema = modelName + 'CountSchema'; break;
    case 'groupBy': operationSchema = modelName + 'GroupBySchema'; break;
    case 'aggregate': operationSchema = modelName + 'AggregateSchema'; break;
  }

  if (config.generateInputValidation && operationSchema) {
    chainParts.push('.input(' + operationSchema + ')');
  } else if (!config.generateInputValidation) {
    const inputType = getInputTypeByOpName(baseOpType, modelName);
    if (inputType) {
      chainParts.push('.input<' + inputType + '>()');
    }
  }

  if (config.generateOutputValidation && outputSchemaExpr) {
    chainParts.push('.output(' + outputSchemaExpr + ')');
  }

  const handlerCode = generateHandlerCode(
    baseOpType,
    modelName,
    config,
    params.model
  );

  chainParts.push('.handler((' + handlerCode + ') as any)');

  return '  /**
   * ' + name + ' - ' + baseOpType + ' operation for ' + modelName + '
   */
  ' + name + ': ' + chainParts.join('
    ');
}

/**
 * Generate handler code for different operations
 */
function generateHandlerCode(
  baseOpType: string,
  modelName: string,
  config: Config,
  model: CodeGenModel
): string {
  const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const hasDeletedAt = !!model?.fields?.some((f: CodeGenField) => f.name === 'deletedAt');

  let handler = 'async (opt: import('@orpc/server').ProcedureHandlerOptions<Context, unknown, any, any>) => {
    const { input: rawInput, context } = opt;
    const input = rawInput as any;
    const ctx = context as Context;
    const baseOpType = '' + baseOpType + '';';

  const prismaMethod = getPrismaMethodName(baseOpType);
  const inputParam = 'input';

  if (
    (config.enableSoftDeletes || hasDeletedAt) &&
    hasDeletedAt &&
    ['findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(baseOpType)
  ) {
    handler += '
      const queryArgs: { where?: { [k: string]: unknown } } = { ...(input as any) };
      if (!queryArgs.where) queryArgs.where = {};
      if (queryArgs.where.deletedAt === undefined) {
        (queryArgs.where as { [k: string]: unknown }).deletedAt = null;
      }
      const result = await ctx.prisma.' + modelVar + '.' + prismaMethod + '(queryArgs as unknown);';
  } else if (
    (config.enableSoftDeletes || hasDeletedAt) &&
    hasDeletedAt &&
    baseOpType === 'findUnique'
  ) {
    handler += '
      const uniqueArgs = { ...input };
      if (!uniqueArgs.where) uniqueArgs.where = {};
      if ((uniqueArgs.where as any).deletedAt === undefined) (uniqueArgs.where as any).deletedAt = null;
      const result = await ctx.prisma.' + modelVar + '.findUnique(uniqueArgs);';
  } else if (
    (config.enableSoftDeletes || hasDeletedAt) &&
    hasDeletedAt &&
    baseOpType === 'delete'
  ) {
    handler += '
      const result = await ctx.prisma.' + modelVar + '.update({ where: input.where, data: { deletedAt: new Date() } });';
  } else if (
    (config.enableSoftDeletes || hasDeletedAt) &&
    hasDeletedAt &&
    baseOpType === 'deleteMany'
  ) {
    handler += '
      const result = await ctx.prisma.' + modelVar + '.updateMany({ where: input.where, data: { deletedAt: new Date() } });';
  } else if (baseOpType === 'groupBy') {
    const aggregations = getAvailableAggregations(model);
    handler += '
      type _GroupByArgs = Partial<Prisma.' + modelName + 'GroupByArgs> & { by: Prisma.' + modelName + 'ScalarFieldEnum[] };
      const args: _GroupByArgs = {} as _GroupByArgs;
      if (input?.by) (args as any).by = (input.by as any[]).length ? input.by : ['id'];
      if (input?.where) (args as any).where = input.where as Prisma.' + modelName + 'WhereInput;
      if (input?.orderBy) (args as any).orderBy = input.orderBy as any;
      if (input?.having) (args as any).having = input.having as any;
      if (input?.take) (args as any).take = Math.min(input.take as number, 500);
      if (input?.skip) (args as any).skip = input.skip as number;
      if (((args as any).take || (args as any).skip) && !(args as any).orderBy) { (args as any).orderBy = [{ id: 'asc' }] as any; }';

    if (aggregations.supportsCount) handler += '
      if (input?._count) args._count = input._count;';
    if (aggregations.supportsSum) handler += '
      if (input?._sum) args._sum = input._sum;';
    if (aggregations.supportsAvg) handler += '
      if (input?._avg) args._avg = input._avg;';
    if (aggregations.supportsMin) handler += '
      if (input?._min) args._min = input._min;';
    if (aggregations.supportsMax) handler += '
      if (input?._max) args._max = input._max;';

    handler += '
      const result = await ctx.prisma.' + modelVar + '.groupBy(args as any);';
  } else if (baseOpType === 'aggregate') {
    handler += '
      const aggArgs: { [k: string]: unknown; _count?: unknown; _avg?: unknown; _sum?: unknown; _min?: unknown; _max?: unknown } = input ? { ...(input as Record<string, unknown>) } : {};
      if (!aggArgs._count && !aggArgs._avg && !aggArgs._sum && !aggArgs._min && !aggArgs._max) {
        (aggArgs as { [k: string]: unknown })._count = { _all: true };
      }
      const result = await ctx.prisma.' + modelVar + '.aggregate(aggArgs as Prisma.' + modelName + 'AggregateArgs);';
  } else {
    const opToArgs: Record<string, string> = {
      create: 'CreateArgs', createMany: 'CreateManyArgs', findFirst: 'FindFirstArgs',
      findMany: 'FindManyArgs', findUnique: 'FindUniqueArgs', update: 'UpdateArgs',
      updateMany: 'UpdateManyArgs', upsert: 'UpsertArgs', delete: 'DeleteArgs',
      deleteMany: 'DeleteManyArgs', count: 'CountArgs',
    };
    const argsType = opToArgs[baseOpType] || 'FindManyArgs';
    if (baseOpType === 'delete') {
      handler += '
      const result = await ctx.prisma.' + modelVar + '.delete({ where: input.where } as Prisma.' + modelName + 'DeleteArgs);';
    } else if (baseOpType === 'deleteMany') {
      handler += '
      const result = await ctx.prisma.' + modelVar + '.deleteMany({ where: input.where } as Prisma.' + modelName + 'DeleteManyArgs);';
    } else {
      handler += '
      const result = await ctx.prisma.' + modelVar + '.' + prismaMethod + '((' + inputParam + ') as Prisma.' + modelName + ' + argsType + ');';
    }
  }

  if (baseOpType === 'count') {
    handler += '
    return { count: result };';
  } else {
    handler += '
    return result;';
  }

  handler += '
  }';

  return handler;
}