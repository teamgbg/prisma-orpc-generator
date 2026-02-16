import { Config } from '../config/schema';
interface ValidationRequirement {
    requiresInput: boolean;
    requiresOutput: boolean;
    inputOptional: boolean;
}
/**
 * Get input type name for a given operation
 */
export declare function getInputTypeByOpName(opType: string, modelName: string): string | undefined;
/**
 * Get output type name for a given operation
 */
export declare function getOutputTypeByOpName(opType: string, modelName: string): string | undefined;
/**
 * Check if an operation should be generated based on configuration
 */
export declare function shouldGenerateOperation(opType: string, config: Config): boolean;
/**
 * Get HTTP method for an operation
 */
export declare function getHttpMethod(opType: string): string;
/**
 * Get REST path pattern for an operation
 */
export declare function getRestPath(opType: string, modelName: string): string;
/**
 * Check if operation requires authentication
 */
export declare function requiresAuthentication(_opType: string, _config: Config): boolean;
/**
 * Get operation description for documentation
 */
export declare function getOperationDescription(opType: string, modelName: string): string;
/**
 * Get operation summary
 */
export declare function getOperationSummary(opType: string, modelName: string): string;
/**
 * Check if operation supports caching
 */
export declare function supportsCaching(opType: string): boolean;
/**
 * Check if operation returns multiple records
 */
export declare function returnsMultiple(opType: string): boolean;
/**
 * Get validation requirements for operation
 */
export declare function getValidationRequirements(opType: string): ValidationRequirement;
/**
 * Get the correct Prisma client method name for an operation
 */
export declare function getPrismaMethodName(opType: string): string;
export {};
//# sourceMappingURL=operation-utils.d.ts.map