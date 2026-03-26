"use strict";
/**
 * Introspects PostgreSQL to discover fn_* functions and their signatures.
 *
 * Queries information_schema to extract parameter names, types, and return
 * types so the generator can produce typed ORPC procedures for each function.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.introspectPgFunctions = introspectPgFunctions;
exports.sqlTypeToTs = sqlTypeToTs;
exports.sqlTypeToPlaceholderCast = sqlTypeToPlaceholderCast;
const pg_1 = require("pg");
/** Map SQL types to TypeScript types */
function sqlTypeToTs(sqlType) {
    const t = sqlType.toLowerCase();
    if (t === "jsonb" || t === "json")
        return "unknown";
    if (t === "text" || t === "character varying" || t === "varchar" || t === "char" || t === "uuid")
        return "string";
    if (t === "integer" || t === "int" || t === "smallint" || t === "bigint")
        return "number";
    if (t === "numeric" || t === "decimal" || t === "real" || t === "double precision")
        return "number";
    if (t === "boolean" || t === "bool")
        return "boolean";
    if (t === "timestamp" || t === "timestamptz" || t === "date" || t === "time")
        return "string";
    if (t === "ARRAY" || t.endsWith("[]"))
        return "string[]";
    return "unknown";
}
/** Map SQL parameter types to Prisma $queryRawUnsafe placeholder compatibility */
function sqlTypeToPlaceholderCast(sqlType) {
    const t = sqlType.toLowerCase();
    // Arrays need explicit casting in $queryRawUnsafe
    if (t === "ARRAY" || t.endsWith("[]"))
        return "::text[]";
    if (t === "jsonb")
        return "::jsonb";
    if (t === "json")
        return "::json";
    return null;
}
/**
 * Discover all fn_* functions in the public schema.
 *
 * Uses pg_proc + pg_type + information_schema.parameters for full signatures.
 */
async function introspectPgFunctions(databaseUrl, logger) {
    const client = new pg_1.Client({ connectionString: databaseUrl });
    try {
        await client.connect();
        logger.debug("Connected to database for PG function introspection");
        // Query function metadata from pg_proc joined with pg_type for return type
        // and information_schema.parameters for argument details
        const functionsResult = await client.query(`
			SELECT
				p.proname AS function_name,
				t.typname AS return_type,
				CASE p.provolatile
					WHEN 'i' THEN 'IMMUTABLE'
					WHEN 's' THEN 'STABLE'
					WHEN 'v' THEN 'VOLATILE'
				END AS volatility
			FROM pg_proc p
			JOIN pg_namespace n ON n.oid = p.pronamespace
			JOIN pg_type t ON t.oid = p.prorettype
			WHERE n.nspname = 'public'
				AND p.proname LIKE 'fn\\_%'
			ORDER BY p.proname
		`);
        if (functionsResult.rows.length === 0) {
            logger.debug("No fn_* functions found in public schema");
            return [];
        }
        const functionNames = functionsResult.rows.map((r) => r.function_name);
        logger.debug(`Found ${functionNames.length} fn_* functions: ${functionNames.join(", ")}`);
        // Get parameter details for all discovered functions.
        // Uses a CTE to unnest all arrays in parallel with ordinality,
        // avoiding set-returning functions inside CASE expressions.
        const paramsResult = await client.query(`
			WITH fn_params AS (
				SELECT
					p.proname AS function_name,
					t.type_oid,
					t.ord,
					n.name,
					CASE COALESCE(m.mode, 'i')
						WHEN 'i' THEN 'IN'
						WHEN 'o' THEN 'OUT'
						WHEN 'b' THEN 'INOUT'
						WHEN 'v' THEN 'VARIADIC'
						ELSE 'IN'
					END AS param_mode
				FROM pg_proc p
				JOIN pg_namespace ns ON ns.oid = p.pronamespace
				CROSS JOIN LATERAL unnest(p.proargtypes) WITH ORDINALITY AS t(type_oid, ord)
				LEFT JOIN LATERAL unnest(p.proargnames) WITH ORDINALITY AS n(name, ord)
					ON n.ord = t.ord
				LEFT JOIN LATERAL unnest(p.proargmodes) WITH ORDINALITY AS m(mode, ord)
					ON m.ord = t.ord
				WHERE ns.nspname = 'public'
					AND p.proname = ANY($1)
			)
			SELECT
				function_name,
				COALESCE(name, 'p' || ord) AS param_name,
				format_type(type_oid, NULL) AS param_type,
				ord::int AS ordinal,
				param_mode
			FROM fn_params
			ORDER BY function_name, ord
		`, [functionNames]);
        // Group params by function
        const paramsByFunction = new Map();
        for (const row of paramsResult.rows) {
            if (row.param_mode === "OUT")
                continue; // Skip output params
            const params = paramsByFunction.get(row.function_name) || [];
            params.push({
                name: row.param_name,
                type: row.param_type,
                ordinalPosition: row.ordinal,
                tsType: sqlTypeToTs(row.param_type),
            });
            paramsByFunction.set(row.function_name, params);
        }
        // Build final PgFunction objects
        const functions = functionsResult.rows.map((fn) => {
            const params = paramsByFunction.get(fn.function_name) || [];
            return {
                name: fn.function_name,
                returnType: fn.return_type,
                returnTsType: sqlTypeToTs(fn.return_type),
                params,
                isOrgScoped: params.some((p) => p.name === "p_org_id" || p.name === "p_organisation_id"),
                isUserScoped: params.some((p) => p.name === "p_user_id"),
                volatility: fn.volatility,
            };
        });
        return functions;
    }
    finally {
        await client.end();
        logger.debug("Disconnected from database after PG function introspection");
    }
}
//# sourceMappingURL=pg-function-introspector.js.map