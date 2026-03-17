/**
 * Utilities for generating oRPC procedure code snippets.
 *
 * Supports schema chaining and handlers for ORPC procedures in scala-hub
 * serving AI tool calls via tool-mcp.
 */
import { GeneratorOptions } from '@prisma/generator-helper';
import { SourceFile } from 'ts-morph';
import { Config } from '../config/schema';
import { type CodeGenModel } from './operation-handlers';
export type { CodeGenModel };
/**
 * Generate oRPC imports for a source file
 */
export declare function generateORPCImports(sourceFile: SourceFile): void;
/**
 * Generate context import
 */
export declare function generateContextImport(sourceFile: SourceFile, _fromDir: string, config: Config, options: GeneratorOptions): void;
/**
 * Generate schema imports based on validation library
 */
export declare function generateSchemaImports(sourceFile: SourceFile, modelName: string, config: Config): void;
/**
 * Generate procedure code with enhanced features
 */
export declare function generateProcedureCode(params: {
    name: string;
    operationName: string;
    inputType?: string;
    outputType?: string;
    procedureType: 'public' | 'protected';
    openApiRoute?: {
        method: string;
        path: string;
        successStatus?: number;
    } | null;
    modelName: string;
    opType: string;
    baseOpType: string;
    model: CodeGenModel;
    config: Config;
    extraDescription?: string;
}): string;
//# sourceMappingURL=code-generation-utils.d.ts.map