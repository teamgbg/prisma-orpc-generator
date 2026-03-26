/**
 * Introspects PostgreSQL to discover fn_* functions and their signatures.
 *
 * Queries information_schema to extract parameter names, types, and return
 * types so the generator can produce typed ORPC procedures for each function.
 */

import { Client } from "pg";
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
function sqlTypeToTs(sqlType: string): string {
	const t = sqlType.toLowerCase();
	if (t === "jsonb" || t === "json") return "unknown";
	if (t === "text" || t === "character varying" || t === "varchar" || t === "char" || t === "uuid")
		return "string";
	if (t === "integer" || t === "int" || t === "smallint" || t === "bigint") return "number";
	if (t === "numeric" || t === "decimal" || t === "real" || t === "double precision")
		return "number";
	if (t === "boolean" || t === "bool") return "boolean";
	if (t === "timestamp" || t === "timestamptz" || t === "date" || t === "time") return "string";
	if (t === "ARRAY" || t.endsWith("[]")) return "string[]";
	return "unknown";
}

/** Map SQL parameter types to Prisma $queryRawUnsafe placeholder compatibility */
function sqlTypeToPlaceholderCast(sqlType: string): string | null {
	const t = sqlType.toLowerCase();
	// Arrays need explicit casting in $queryRawUnsafe
	if (t === "ARRAY" || t.endsWith("[]")) return "::text[]";
	if (t === "jsonb") return "::jsonb";
	if (t === "json") return "::json";
	return null;
}

/**
 * Discover all fn_* functions in the public schema.
 *
 * Uses pg_proc + pg_type + information_schema.parameters for full signatures.
 */
export async function introspectPgFunctions(
	databaseUrl: string,
	logger: Logger,
): Promise<PgFunction[]> {
	const client = new Client({ connectionString: databaseUrl });

	try {
		await client.connect();
		logger.debug("Connected to database for PG function introspection");

		// Query function metadata from pg_proc joined with pg_type for return type
		// and information_schema.parameters for argument details
		const functionsResult = await client.query<{
			function_name: string;
			return_type: string;
			volatility: string;
			num_defaults: number;
			total_params: number;
		}>(`
			SELECT
				p.proname AS function_name,
				t.typname AS return_type,
				CASE p.provolatile
					WHEN 'i' THEN 'IMMUTABLE'
					WHEN 's' THEN 'STABLE'
					WHEN 'v' THEN 'VOLATILE'
				END AS volatility,
				COALESCE(p.pronargdefaults, 0) AS num_defaults,
				COALESCE(array_length(p.proargtypes, 1), 0) AS total_params
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
		const paramsResult = await client.query<{
			function_name: string;
			param_name: string;
			param_type: string;
			ordinal: number;
			param_mode: string;
		}>(`
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

		// Group params by function (without hasDefault — added below per-function)
		const rawParamsByFunction = new Map<
			string,
			Array<{ name: string; type: string; ordinal: number; tsType: string }>
		>();
		for (const row of paramsResult.rows) {
			if (row.param_mode === "OUT") continue;
			const params = rawParamsByFunction.get(row.function_name) || [];
			params.push({
				name: row.param_name,
				type: row.param_type,
				ordinal: row.ordinal,
				tsType: sqlTypeToTs(row.param_type),
			});
			rawParamsByFunction.set(row.function_name, params);
		}

		// Build final PgFunction objects with DEFAULT detection.
		// PostgreSQL guarantees DEFAULT params are the last N (pronargdefaults).
		const functions: PgFunction[] = functionsResult.rows.map((fn) => {
			const rawParams = rawParamsByFunction.get(fn.function_name) || [];
			const numDefaults = fn.num_defaults;
			const requiredCount = rawParams.length - numDefaults;

			const params: PgFunctionParam[] = rawParams.map((p, idx) => ({
				name: p.name,
				type: p.type,
				ordinalPosition: p.ordinal,
				tsType: p.tsType,
				hasDefault: idx >= requiredCount,
			}));

			return {
				name: fn.function_name,
				returnType: fn.return_type,
				returnTsType: sqlTypeToTs(fn.return_type),
				params,
				isOrgScoped: params.some(
					(p) => p.name === "p_org_id" || p.name === "p_organisation_id",
				),
				isUserScoped: params.some((p) => p.name === "p_user_id"),
				volatility: fn.volatility,
				numDefaults,
				hasOptionalParams: numDefaults > 0,
			};
		});

		return functions;
	} finally {
		await client.end();
		logger.debug("Disconnected from database after PG function introspection");
	}
}

export { sqlTypeToTs, sqlTypeToPlaceholderCast };
