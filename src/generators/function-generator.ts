/**
 * Generates ORPC router files for PostgreSQL fn_* functions.
 *
 * Each function gets a single "call" procedure that accepts typed parameters
 * and returns the function result via $queryRawUnsafe. Functions are included
 * in the app router and tool manifest so they flow through to MCP tools.
 */

import path from "node:path";
import type { Config } from "../config/schema";
import type { PgFunction, PgFunctionParam } from "../utils/pg-function-introspector";
import { AUTOGEN_HEADER } from "../utils/autogen-header";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";

/**
 * Generate a router file for a single PG function.
 */
export function generateFunctionRouterCode(fn: PgFunction): string {
	const routerName = fn.name;
	const paramEntries = fn.params
		.map((p) => `${p.name}: ${p.tsType}`)
		.join("; ");
	const inputType = fn.params.length > 0 ? `{ ${paramEntries} }` : "void";

	// Build the SQL call: SELECT fn_name($1, $2, ...) AS data
	const placeholders = fn.params.map((_, i) => `$${i + 1}`).join(", ");
	const sqlCall = `SELECT ${fn.name}(${placeholders}) AS data`;

	// Build the parameter extraction from input
	const paramExtractions = fn.params
		.map((p) => `      (input as any).${p.name}`)
		.join(",\n");

	// Determine procedure type based on scoping
	const procedureType = fn.isOrgScoped || fn.isUserScoped ? "protectedProcedure" : "publicProcedure";
	const imports = fn.isOrgScoped || fn.isUserScoped
		? ["protectedProcedure"]
		: ["publicProcedure"];

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
		contextInjections.length > 0
			? `\n${contextInjections.join("\n")}\n`
			: "";

	const paramArrayItems = fn.params
		.map((p) => `params.${p.name}`)
		.join(", ");

	return `${AUTOGEN_HEADER}
import { ${imports.join(", ")} } from "../helpers/createRouter";
import type { Context } from "../helpers/createRouter";

/**
 * ${routerName} — PostgreSQL function router
 * Parameters: ${fn.params.map((p) => `${p.name} (${p.type})`).join(", ") || "none"}
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
      const rows = await (ctx.prisma.$queryRawUnsafe as Function)(
        '${sqlCall}',
${fn.params.length > 0 ? `        ${paramArrayItems}\n` : ""}      );
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
