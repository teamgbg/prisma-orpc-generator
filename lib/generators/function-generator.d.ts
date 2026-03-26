/**
 * Generates ORPC router files for PostgreSQL fn_* functions.
 *
 * Each function gets a single "call" procedure that accepts typed parameters
 * and returns the function result via $queryRawUnsafe. Functions are included
 * in the app router and tool manifest so they flow through to MCP tools.
 *
 * Functions with DEFAULT parameters use PostgreSQL named-parameter syntax
 * (param := $1) so only provided params are sent — DEFAULTs are preserved.
 */
import type { PgFunction } from "../utils/pg-function-introspector";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
/**
 * Generate a router file for a single PG function.
 */
export declare function generateFunctionRouterCode(fn: PgFunction): string;
/**
 * Generate router files for all discovered PG functions and return
 * metadata needed for the app router index and manifest.
 */
export declare function generateFunctionRouters(functions: PgFunction[], outputDir: string, projectManager: ProjectManager, logger: Logger): Promise<void>;
//# sourceMappingURL=function-generator.d.ts.map