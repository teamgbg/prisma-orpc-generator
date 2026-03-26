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

import path from "node:path";
import type { Config } from "../config/schema";
import type { PgFunction, PgFunctionParam } from "../utils/pg-function-introspector";
import { AUTOGEN_HEADER } from "../utils/autogen-header";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";

/**
 * Generate SQL call and param wiring for a function WITHOUT optional params.
 * Simple positional: SELECT fn_name($1, $2, ...) AS data
 */
function generateSimpleCall(fn: PgFunction): {
	sqlCallCode: string;
	paramWiringCode: string;
} {
	const placeholders = fn.params.map((_, i) => `$${i + 1}`).join(", ");
	const sqlCall = `SELECT ${fn.name}(${placeholders}) AS data`;
	const paramItems = fn.params.map((p) => `params.${p.name}`).join(", ");

	return {
		sqlCallCode: `      const rows = await (ctx.prisma.$queryRawUnsafe as Function)(
        '${sqlCall}'${fn.params.length > 0 ? `,\n        ${paramItems}` : ""}
      );`,
		paramWiringCode: "",
	};
}

/**
 * Generate SQL call and param wiring for a function WITH optional (DEFAULT) params.
 * Uses PostgreSQL named-parameter syntax: fn_name(p_required := $1, p_optional := $2)
 * Only includes params that are present in the input object.
 */
function generateDynamicCall(fn: PgFunction): {
	sqlCallCode: string;
	paramWiringCode: string;
} {
	const requiredParams = fn.params.filter((p) => !p.hasDefault);
	const optionalParams = fn.params.filter((p) => p.hasDefault);

	// Build the dynamic SQL construction code
	const lines: string[] = [];
	lines.push(`      // Build dynamic SQL with named params (supports DEFAULT values)`);
	lines.push(`      const sqlParts: string[] = [];`);
	lines.push(`      const sqlValues: unknown[] = [];`);
	lines.push(`      let idx = 1;`);

	// Required params are always included
	for (const p of requiredParams) {
		lines.push(`      sqlParts.push('${p.name} := $' + idx++);`);
		lines.push(`      sqlValues.push(params.${p.name});`);
	}

	// Optional params are only included if present in input
	for (const p of optionalParams) {
		lines.push(`      if (params.${p.name} !== undefined) {`);
		lines.push(`        sqlParts.push('${p.name} := $' + idx++);`);
		lines.push(`        sqlValues.push(params.${p.name});`);
		lines.push(`      }`);
	}

	lines.push(
		`      const sql = 'SELECT ${fn.name}(' + sqlParts.join(', ') + ') AS data';`,
	);
	lines.push(
		`      const rows = await (ctx.prisma.$queryRawUnsafe as Function)(sql, ...sqlValues);`,
	);

	return {
		sqlCallCode: lines.join("\n"),
		paramWiringCode: "",
	};
}

/**
 * Generate a router file for a single PG function.
 */
export function generateFunctionRouterCode(fn: PgFunction): string {
	const routerName = fn.name;

	// Determine procedure type based on scoping
	const procedureType =
		fn.isOrgScoped || fn.isUserScoped ? "protectedProcedure" : "publicProcedure";
	const imports =
		fn.isOrgScoped || fn.isUserScoped ? ["protectedProcedure"] : ["publicProcedure"];

	// For org/user scoped functions, auto-inject context values when params match
	const contextInjections: string[] = [];
	for (const p of fn.params) {
		if (p.name === "p_user_id") {
			contextInjections.push(
				`    if (!params.${p.name} && ctx.user?.id) params.${p.name} = ctx.user.id;`,
			);
		}
		if (p.name === "p_org_id" || p.name === "p_organisation_id") {
			contextInjections.push(
				`    if (!params.${p.name} && ctx.orgId) params.${p.name} = ctx.orgId;`,
			);
		}
	}

	const contextInjectionBlock =
		contextInjections.length > 0 ? `\n${contextInjections.join("\n")}\n` : "";

	// Choose SQL generation strategy
	const { sqlCallCode } = fn.hasOptionalParams
		? generateDynamicCall(fn)
		: generateSimpleCall(fn);

	// Build param doc string
	const paramDoc = fn.params
		.map((p) => `${p.name} (${p.type}${p.hasDefault ? ", DEFAULT" : ""})`)
		.join(", ") || "none";

	return `${AUTOGEN_HEADER}
import { ${imports.join(", ")} } from "../helpers/createRouter";
import type { Context } from "../helpers/createRouter";

/**
 * ${routerName} — PostgreSQL function router
 * Parameters: ${paramDoc}
 * Returns: ${fn.returnType}
 * Volatility: ${fn.volatility}
 */
const ${routerName}Procedures = {
  /**
   * call - Execute ${fn.name}(${fn.params.map((p) => p.name).join(", ")})
   */
  call: ${procedureType}
    .handler((async (opt: import('@orpc/server').ProcedureHandlerOptions<Context, unknown, any, any>) => {
      const { input, context: ctx } = opt;
      const params: Record<string, any> = { ...(input as any) };${contextInjectionBlock}
${sqlCallCode}
      // Auto-unwrap single-row single-column jsonb results
      if (Array.isArray(rows) && rows.length === 1) {
        const row = rows[0];
        const keys = Object.keys(row);
        if (keys.length === 1) return row[keys[0]];
        return row;
      }
      return rows;
    }) as any)
};

export const ${routerName}Router = ${routerName}Procedures;
export type ${routerName}RouterType = typeof ${routerName}Router;
export { ${routerName}Procedures };
`;
}

/**
 * Generate router files for all discovered PG functions and return
 * metadata needed for the app router index and manifest.
 */
export async function generateFunctionRouters(
	functions: PgFunction[],
	outputDir: string,
	projectManager: ProjectManager,
	logger: Logger,
): Promise<void> {
	for (const fn of functions) {
		const code = generateFunctionRouterCode(fn);
		const filePath = path.resolve(outputDir, "routers", "models", `${fn.name}.router.ts`);

		const sourceFile = projectManager.createSourceFile(filePath, undefined, {
			overwrite: true,
		});
		sourceFile.replaceWithText(code);

		logger.debug(`Generated function router: ${fn.name}`);
	}
}
