/**
 * Introspects PostgreSQL to discover fn_* functions and their signatures.
 *
 * Queries information_schema to extract parameter names, types, and return
 * types so the generator can produce typed ORPC procedures for each function.
 */
import type { Logger } from "./logger";
export interface PgFunctionParam {
    name: string;
    type: string;
    ordinalPosition: number;
    /** The closest TypeScript type for this SQL type */
    tsType: string;
    /** Whether this parameter has a DEFAULT value and is therefore optional */
    hasDefault: boolean;
}
export interface PgFunction {
    name: string;
    /** SQL return type (e.g. "jsonb", "text", "integer") */
    returnType: string;
    /** TypeScript type for the return value */
    returnTsType: string;
    params: PgFunctionParam[];
    /** Whether the function likely needs org scoping (has p_org_id param) */
    isOrgScoped: boolean;
    /** Whether the function likely needs user scoping (has p_user_id param) */
    isUserScoped: boolean;
    /** The function's volatility: IMMUTABLE, STABLE, or VOLATILE */
    volatility: string;
    /** Number of params that have DEFAULT values (always the last N) */
    numDefaults: number;
    /** Whether any params are optional (have DEFAULTs) */
    hasOptionalParams: boolean;
}
/** Map SQL types to TypeScript types */
declare function sqlTypeToTs(sqlType: string): string;
/** Map SQL parameter types to Prisma $queryRawUnsafe placeholder compatibility */
declare function sqlTypeToPlaceholderCast(sqlType: string): string | null;
/**
 * Discover all fn_* functions in the public schema.
 *
 * Uses pg_proc + pg_type + information_schema.parameters for full signatures.
 */
export declare function introspectPgFunctions(databaseUrl: string, logger: Logger): Promise<PgFunction[]>;
export { sqlTypeToTs, sqlTypeToPlaceholderCast };
//# sourceMappingURL=pg-function-introspector.d.ts.map