"use strict";
/**
 * Utilities for generating ORPC procedure code snippets in the Prisma ORPC generator.
 *
 * Handles imports, context, schema validation chaining, and dispatches to operation handlers
 * for routers in scala-hub serving AI tool calls via scala-hub-tool-mcp.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateORPCImports = generateORPCImports;
exports.generateContextImport = generateContextImport;
exports.generateProcedureCode = generateProcedureCode;
const node_path_1 = __importDefault(require("node:path"));
const operation_handlers_1 = require("./operation-handlers");
const operation_utils_1 = require("./operation-utils");
/**
 * Generate oRPC imports for a source file
 */
function generateORPCImports(sourceFile) {
    // Core oRPC imports for v1.7.10
    const existing = sourceFile
        .getImportDeclarations()
        .find((d) => d.getModuleSpecifierValue() === "@orpc/server");
    if (existing) {
        const have = new Set(existing.getNamedImports().map((n) => n.getName()));
        if (!have.has("os"))
            existing.addNamedImport("os");
        if (!have.has("ORPCError"))
            existing.addNamedImport("ORPCError");
    }
    else {
        sourceFile.addImportDeclaration({
            moduleSpecifier: "@orpc/server",
            namedImports: ["os", "ORPCError"],
        });
    }
}
/**
 * Generate context import
 */
function generateContextImport(sourceFile, _fromDir, config, options) {
    // If a contextPath is provided, re-export its Context (optionally widened below)
    if (config.contextPath) {
        // If the path looks like a TypeScript path alias (e.g. @/lib/orpc, @teamgbg/core/...)
        // or a bare module specifier, use it verbatim — don't resolve it as a filesystem path.
        const isAlias = config.contextPath.startsWith("@") ||
            (!config.contextPath.startsWith(".") && !config.contextPath.startsWith("/"));
        let moduleSpecifier;
        if (isAlias) {
            moduleSpecifier = config.contextPath;
        }
        else {
            // Compute absolute path to the context file (relative to schema when not absolute)
            const fileDir = node_path_1.default.dirname(sourceFile.getFilePath());
            const schemaDir = options.schemaPath ? node_path_1.default.dirname(options.schemaPath) : process.cwd();
            const absoluteTargetPath = node_path_1.default.isAbsolute(config.contextPath)
                ? config.contextPath
                : node_path_1.default.resolve(schemaDir, config.contextPath);
            // Compute relative module specifier from the generated file to the context file
            let relative = node_path_1.default.relative(fileDir, absoluteTargetPath);
            // Normalize separators to POSIX for TS module specifiers
            relative = relative.replace(/\\/g, "/");
            // Drop .ts extension if present
            relative = relative.replace(/\.ts$/i, "");
            // Ensure it starts with './' or '../'
            if (!relative.startsWith(".") && !relative.startsWith("/")) {
                relative = `./${relative}`;
            }
            moduleSpecifier = relative;
        }
        // Simple pass-through re-export
        sourceFile.addStatements(`
import type { Context } from '${moduleSpecifier}';
export type { Context };
`);
        return;
    }
    // No contextPath provided: do not inline here. The base router generator will declare
    // PrismaClient import and a full Context interface with any feature-driven fields.
    // This avoids duplicate identifiers when both utilities run.
}
/**
 * Generate procedure code with enhanced features
 */
function generateProcedureCode(params) {
    const { name, operationName, procedureType, modelName, baseOpType, config } = params;
    const procedure = procedureType === "public" ? "publicProcedure" : "protectedProcedure";
    // Build procedure chain — no .input() or .output() validation (validation removed)
    const chainParts = [procedure];
    // Generate handler
    const handlerCode = generateHandlerCode(baseOpType, modelName, operationName, config, params.model);
    // Provide a compatible handler type to satisfy @orpc/server ProcedureHandler generics across versions
    chainParts.push(`.handler((${handlerCode}) as any)`);
    return `  /**
   * ${name} - ${(0, operation_utils_1.getExposedName)(baseOpType)} operation for ${modelName}
  * Generated with advanced oRPC features${params.extraDescription ? `\n   * ${params.extraDescription}` : ""}
   */
  ${name}: ${chainParts.join("\n    ")}`;
}
/**
 * Generate handler code by dispatching to isolated operation handlers.
 *
 * Each operation (findMany, create, delete, etc.) is handled by a dedicated
 * function in operation-handlers.ts with its own org-scoping and soft-delete logic.
 */
function generateHandlerCode(baseOpType, modelName, _operationName, config, model) {
    const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const hasSoftDelete = (config.enableSoftDeletes || !!model?.fields?.some((f) => f.name === "deletedAt")) &&
        !!model?.fields?.some((f) => f.name === "deletedAt");
    const isOrgScoped = !!model?.fields?.some((f) => f.name === "organisation_id");
    const ctx = { modelName, modelVar, isOrgScoped, hasSoftDelete };
    // Dispatch to the correct operation handler
    const handlers = {
        findMany: () => (0, operation_handlers_1.generateFindMany)(ctx),
        findFirst: () => (0, operation_handlers_1.generateFindFirst)(ctx),
        findUnique: () => (0, operation_handlers_1.generateFindById)(ctx),
        create: () => (0, operation_handlers_1.generateCreate)(ctx),
        createMany: () => (0, operation_handlers_1.generateCreateMany)(ctx),
        update: () => (0, operation_handlers_1.generateUpdate)(ctx),
        updateMany: () => (0, operation_handlers_1.generateUpdateMany)(ctx),
        delete: () => (0, operation_handlers_1.generateDelete)(ctx),
        deleteMany: () => (0, operation_handlers_1.generateDeleteMany)(ctx),
        upsert: () => (0, operation_handlers_1.generateUpsert)(ctx),
        count: () => (0, operation_handlers_1.generateCount)(ctx),
        aggregate: () => (0, operation_handlers_1.generateAggregate)(ctx),
        groupBy: () => (0, operation_handlers_1.generateGroupBy)(ctx, model),
    };
    // Base handler structure
    let handler = `async (opt: import('@orpc/server').ProcedureHandlerOptions<Context, unknown, any, any>) => {
    const { input: rawInput, context } = opt;
    const input = rawInput as any;
    const ctx = context as Context;`;
    // Append operation-specific code
    const generate = handlers[baseOpType];
    if (generate) {
        handler += generate();
    }
    else {
        // Fallback for unknown operations
        handler += `
      const result = await ctx.prisma.${modelVar}.${baseOpType}((input) as any);`;
    }
    // findUnique (findById) should throw NOT_FOUND if no result
    if (baseOpType === "findUnique") {
        handler += `

      if (!result) {
        throw new ORPCError('NOT_FOUND', { data: { message: \`${modelName} not found\` } });
      }`;
    }
    // Return: count operations wrap in { count }, everything else returns directly
    if (baseOpType === "count") {
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
//# sourceMappingURL=code-generation-utils.js.map