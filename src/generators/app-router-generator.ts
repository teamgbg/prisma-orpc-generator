/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates the main application router combining all model routers.
 */

import path from "node:path";
import pluralize from "pluralize";
import type { PrismaModel } from "../types/generator-types";
import { AUTOGEN_HEADER } from "../utils/autogen-header";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";

export class AppRouterGenerator {
	constructor(
		private outputDir: string,
		private projectManager: ProjectManager,
		private logger: Logger,
	) {}

	async generate(models: PrismaModel[]): Promise<void> {
		this.logger.debug("Generating main application router...");

		const appRouter = this.projectManager.createSourceFile(
			path.resolve(this.outputDir, "routers", "index.ts"),
			undefined,
			{ overwrite: true },
		);

		for (const model of models) {
			const routerName = pluralize(model.name.toLowerCase());
			appRouter.addImportDeclaration({
				moduleSpecifier: `./models/${model.name}.router`,
				namedImports: [`${routerName}Router`],
			});
		}

		const routerEntries = models
			.map((model) => {
				const routerName = pluralize(model.name.toLowerCase());
				return `  ${model.name.toLowerCase()}: ${routerName}Router`;
			})
			.join(",\n");

		const routerContent = this.generateBasicAppRouter(routerEntries, models);

		appRouter.addStatements(routerContent);

		appRouter.insertText(0, AUTOGEN_HEADER);
		appRouter.formatText({ indentSize: 2 });
		this.logger.debug("Main application router generated");
	}

	private generateBasicAppRouter(routerEntries: string, models: PrismaModel[]): string {
		return `
/**
 * Main application router combining all model routers
 * Generated with advanced oRPC architecture
 */
export const appRouter = {
${routerEntries}
};

/**
 * Type definition for the complete app router
 */
export type AppRouter = typeof appRouter;

/**
 * Export individual routers for modular usage
 */
export {${models
			.map((m) => {
				const r = pluralize(m.name.toLowerCase());
				return `${r}Router`;
			})
			.join(", ")}};
`;
	}
}
