/**
 * Generates TypeScript code for oRPC routers from Prisma models.
 *
 * Produces base routers, model procedures, and app router for scala-hub's ORPC API,
 * with auth, soft deletes, and validation for AI tool delegation.
 */

import type { GeneratorOptions } from "@prisma/generator-helper";
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import { BaseRouterGenerator } from "./base-router-generator";
import { ModelRouterGenerator } from "./model-router-generator";
import { AppRouterGenerator } from "./app-router-generator";


export class CodeGeneratorFacade {
	constructor(
		private config: Config,
		private outputDir: string,
		private projectManager: ProjectManager,
		private logger: Logger,
	) {}

	async generateBaseRouter(options: GeneratorOptions): Promise<void> {
		const baseRouterGenerator = new BaseRouterGenerator(
			this.config,
			this.outputDir,
			this.projectManager,
			this.logger,
		);
		await baseRouterGenerator.generate(options);
	}

	async generateModelRouter(model: PrismaModel, modelOperations: unknown[]): Promise<void> {
		const modelRouterGenerator = new ModelRouterGenerator(
			this.config,
			this.outputDir,
			this.projectManager,
			this.logger,
		);
		await modelRouterGenerator.generate(model, modelOperations);
	}

	async generateAppRouter(models: PrismaModel[]): Promise<void> {
		const appRouterGenerator = new AppRouterGenerator(this.outputDir, this.projectManager, this.logger);
		await appRouterGenerator.generate(models);
	}
}
