/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles PostgreSQL function introspection and function router generation.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import pluralize from "pluralize";
import type { GeneratorOptions } from "@prisma/generator-helper";
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import type { SpinnerLike } from "../utils/spinner";
import { AUTOGEN_HEADER } from "../utils/autogen-header";
import { generateFunctionRouters } from "./function-generator";
import type { PgFunction } from "../utils/pg-function-introspector";
import { introspectPgFunctions } from "../utils/pg-function-introspector";

export class PgFunctionStrategy {
	private pgFunctions: PgFunction[] = [];
	private options?: GeneratorOptions;

	constructor(
		private config: Config,
		private outputDir: string,
		private projectManager: ProjectManager,
		private logger: Logger,
		private spinner: SpinnerLike,
	) {}

	getFunctions(): PgFunction[] {
		return this.pgFunctions;
	}

	isEnabled(): boolean {
		return this.config.generatePgFunctions;
	}

	setOptions(options: GeneratorOptions): void {
		this.options = options;
	}

	async introspect(): Promise<void> {
		if (!this.isEnabled()) {
			this.logger.debug("PG function generation disabled, skipping");
			return;
		}

		this.logger.debug("PG function generation enabled, resolving DATABASE_URL...");

		let dbUrl = process.env.DATABASE_URL;
		if (!dbUrl) {
			const schemaDir = this.options?.schemaPath
				? path.dirname(this.options.schemaPath)
				: process.cwd();
			const projectRoot = path.resolve(schemaDir, "..");
			const candidates = [
				path.resolve(projectRoot, ".env.local"),
				path.resolve(projectRoot, ".env"),
				path.resolve(process.cwd(), ".env.local"),
				path.resolve(process.cwd(), ".env"),
			];

			for (const candidate of candidates) {
				try {
					const content = await fs.readFile(candidate, "utf8");
					const match = content.match(/^DATABASE_URL=(.+)$/m);
					if (match?.[1]) {
						dbUrl = match[1].trim().replace(/^["']|["']$/g, "");
						this.logger.debug(`Found DATABASE_URL in ${candidate}`);
						break;
					}
				} catch {
					// file doesn't exist, try next
				}
			}
		} else {
			this.logger.debug("DATABASE_URL found in process.env");
		}

		if (!dbUrl) {
			this.logger.info(
				"DATABASE_URL not available — skipping PG function generation. " +
					"Set DATABASE_URL in .env or .env.local to enable function introspection.",
			);
			return;
		}

		this.spinner.text = "Introspecting PostgreSQL functions...";

		try {
			this.pgFunctions = await introspectPgFunctions(dbUrl, this.logger);

			if (this.pgFunctions.length === 0) {
				this.logger.debug("No PG functions found, skipping function router generation");
				return;
			}

			this.spinner.text = `Generating ${this.pgFunctions.length} function routers...`;

			await generateFunctionRouters(
				this.pgFunctions,
				this.outputDir,
				this.projectManager,
				this.logger,
			);

			this.logger.debug(`Generated ${this.pgFunctions.length} PG function routers`);
		} catch (error) {
			this.logger.error("PG function introspection failed (non-fatal):", error);
		}
	}

	async regenerateAppRouter(models: PrismaModel[]): Promise<void> {
		if (this.pgFunctions.length === 0) return;

		this.spinner.text = "Regenerating app router with PG function routers...";

		const indexPath = path.join(this.outputDir, "routers", "index.ts");

		const modelImports = models
			.map((m) => {
				const routerName = pluralize(m.name.toLowerCase());
				return `import { ${routerName}Router } from "./models/${m.name}.router";`;
			})
			.join("\n");

		const fnImports = this.pgFunctions
			.map((fn) => `import { ${fn.name}Router } from "./models/${fn.name}.router";`)
			.join("\n");

		const modelEntries = models
			.map((m) => {
				const routerName = pluralize(m.name.toLowerCase());
				return `  ${m.name.toLowerCase()}: ${routerName}Router`;
			})
			.join(",\n");

		const fnEntries = this.pgFunctions
			.map((fn) => `  ${fn.name}: ${fn.name}Router`)
			.join(",\n");

		const modelReExports = models
			.map((m) => `${pluralize(m.name.toLowerCase())}Router`)
			.join(", ");
		const fnReExports = this.pgFunctions
			.map((fn) => `${fn.name}Router`)
			.join(", ");

		const content = `${AUTOGEN_HEADER}
${modelImports}
${fnImports}

/**
 * Main application router combining all model and function routers
 * Generated with advanced oRPC architecture
 */
export const appRouter = {
${modelEntries},
${fnEntries}
};

/**
 * Type definition for the complete app router
 */
export type AppRouter = typeof appRouter;

/**
 * Export individual routers for modular usage
 */
export {${modelReExports}, ${fnReExports}};
`;

		await fs.writeFile(indexPath, content, "utf8");
		this.logger.debug(
			`App router regenerated with ${models.length} models + ${this.pgFunctions.length} functions`,
		);
	}
}
