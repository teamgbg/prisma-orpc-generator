/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Orchestrates generation of documentation and tests as advanced features.
 */

import type { GeneratorOptions } from "@prisma/generator-helper";
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import type { SpinnerLike } from "../utils/spinner";
import { DocumentationGenerator } from "./documentation-generator";
import { TestGeneratorFacade } from "./test-generator";

export class AdvancedFeaturesStrategy {
	constructor(
		private config: Config,
		private outputDir: string,
		private projectManager: ProjectManager,
		private logger: Logger,
		private spinner: SpinnerLike,
	) {}

	private isEnabled(value: unknown): boolean {
		return value === true || value === "true";
	}

	async generate(_options: GeneratorOptions, models: PrismaModel[]): Promise<void> {
		const tasks = [];

		if (this.isEnabled(this.config.generateDocumentation)) {
			this.spinner.text = "Generating documentation...";
			tasks.push(this.generateDocumentation(models));
		}

		if (this.isEnabled(this.config.generateTests)) {
			this.spinner.text = "Generating tests...";
			tasks.push(this.generateTests(models));
		}

		await Promise.all(tasks);

		this.logger.debug("Advanced features generation completed");
	}

	private async generateDocumentation(models: PrismaModel[]): Promise<void> {
		const docGenerator = new DocumentationGenerator(this.config, this.outputDir, this.logger);
		// biome-ignore lint/suspicious/noExplicitAny: DocumentationModel is a simplified type
		await docGenerator.generateDocumentation(models as any);
	}

	private async generateTests(models: PrismaModel[]): Promise<void> {
		const testGenerator = new TestGeneratorFacade(
			this.outputDir,
			this.projectManager,
		);
		await testGenerator.generateTests(models);
	}
}
