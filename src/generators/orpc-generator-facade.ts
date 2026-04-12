/**
 * Main orchestrator for the Prisma oRPC code generator.
 *
 * Coordinates schema analysis and generation of ORPC routers for scala-hub's
 * Prisma-backed API, enabling AI tool execution via scala-hub-tool-mcp.
 */

import type { DMMF, EnvValue, GeneratorOptions } from "@prisma/generator-helper";
import { parseEnvValue } from "@prisma/internals";
import chalk from "chalk";
import { type Config, parseConfig } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import { type SpinnerLike, createSpinner } from "../utils/spinner";
import { Logger } from "../utils/logger";
import { ProjectManager } from "../utils/project-manager";
import { generateToolManifest } from "./manifest-generator";
import { SchemaSetupStrategy } from "./schema-setup";
import { SchemaAnalysisStrategy } from "./schema-analysis";
import { ModelProcessingStrategy } from "./model-processing";
import { PgFunctionStrategy } from "./pg-function-strategy";
import { AdvancedFeaturesStrategy } from "./advanced-features";
import { OptimizationStrategy } from "./optimization";
import { FinalizationStrategy } from "./finalization";
import { CodeGeneratorFacade } from "./code-generator-facade";

export class ORPCGenerator {
	private config: Config;
	private outputDir: string;
	private projectManager: ProjectManager;
	private logger: Logger;
	private spinner: SpinnerLike;
	private pgFunctions: ReturnType<PgFunctionStrategy["getFunctions"]> = [];

	constructor(private options: GeneratorOptions) {
		this.config = parseConfig(options.generator.config as Record<string, string | string[]>);
		this.outputDir = parseEnvValue(options.generator.output as EnvValue);
		this.projectManager = new ProjectManager(this.outputDir);
		this.logger = new Logger(this.config.enableDebugLogging);
		this.spinner = createSpinner(this.config.enableDebugLogging);
	}

	private isEnabled(value: unknown): boolean {
		return value === true || value === "true";
	}

	async generate(): Promise<void> {
		try {
			this.startGeneration();
			await this.loadPlugins();

			const schemaSetup = new SchemaSetupStrategy(
				this.options,
				this.outputDir,
				this.projectManager,
				this.logger,
				this.spinner,
			);
			await schemaSetup.setup();

			await this.validatePrismaClient();

			const schemaAnalysis = new SchemaAnalysisStrategy(this.options, this.logger, this.spinner);
			const dmmf = await schemaAnalysis.analyze();

			const modelProcessing = new ModelProcessingStrategy(this.config, this.logger, this.spinner);
			const models = modelProcessing.process(dmmf);

			await this.generateCoreFiles(models, dmmf);

			const pgFunctionStrategy = new PgFunctionStrategy(
				this.config,
				this.outputDir,
				this.projectManager,
				this.logger,
				this.spinner,
			);
			pgFunctionStrategy.setOptions(this.options);
			await pgFunctionStrategy.introspect();
			this.pgFunctions = pgFunctionStrategy.getFunctions();

			await this.writeToolManifest(models);

			const advancedFeatures = new AdvancedFeaturesStrategy(
				this.config,
				this.outputDir,
				this.projectManager,
				this.logger,
				this.spinner,
			);
			await advancedFeatures.generate(this.options, models);

			const optimization = new OptimizationStrategy(
				this.config,
				this.projectManager,
				this.spinner,
				this.logger,
			);
			await optimization.optimize();

			const finalization = new FinalizationStrategy(
				this.config,
				this.outputDir,
				this.projectManager,
				this.logger,
				this.spinner,
			);
			await finalization.finalize();

			if (this.pgFunctions.length > 0) {
				await pgFunctionStrategy.regenerateAppRouter(models);
			}

			await this.runPostWriteHooks();

			this.completeGeneration();
		} catch (error) {
			this.handleGenerationError(error);
			throw error;
		}
	}

	private startGeneration(): void {
		this.spinner.start(chalk.blue("🚀 Generating oRPC routers..."));
		this.logger.info("Starting oRPC generation with configuration:", this.config);
	}

	private async validatePrismaClient(): Promise<void> {
		this.spinner.text = "Validating Prisma Client configuration...";

		const prismaClientProvider = this.options.otherGenerators.find((generator) => {
			const provider = parseEnvValue(generator.provider);
			return provider === "prisma-client-js" || provider === "prisma-client";
		});

		if (!prismaClientProvider) {
			throw new Error(
				"oRPC Generator requires a Prisma Client generator. Please add the following to your schema:\n\n" +
					"generator client {\n" +
					'  provider = "prisma-client-js"\n' +
					"}",
			);
		}

		this.logger.debug("Prisma Client validation completed");
	}

	private async generateCoreFiles(models: PrismaModel[], dmmf: DMMF.Document): Promise<void> {
		this.spinner.text = "Generating core oRPC files...";

		const codeGenerator = new CodeGeneratorFacade(
			this.config,
			this.outputDir,
			this.projectManager,
			this.logger,
		);

		await codeGenerator.generateBaseRouter(this.options);

		for (const model of models) {
			await this.runPreModelHooks(model, dmmf);
			await codeGenerator.generateModelRouter(model, [...dmmf.mappings.modelOperations]);
		}

		await codeGenerator.generateAppRouter(models);

		this.logger.debug("Core files generation completed");
	}

	private async writeToolManifest(models: PrismaModel[]): Promise<void> {
		this.spinner.text = "Generating tool manifest...";

		const manifest = generateToolManifest(models, this.config, this.pgFunctions);
		const manifestPath = `${this.outputDir}/tool-manifest.json`;
		const { promises: fs } = await import("node:fs");
		await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

		this.logger.debug(
			`Tool manifest written: ${Object.keys(manifest.models).length} models`,
		);
	}

	private completeGeneration(): void {
		this.spinner.succeed(chalk.green("✅ oRPC routers generated successfully!"));

		this.displayGenerationSummary();
	}

	private handleGenerationError(error: Error | unknown): void {
		this.spinner.fail(chalk.red("❌ Generation failed"));
		this.logger.error("Generation error:", error);
	}

	private displayGenerationSummary(): void {
		this.logger.info(chalk.cyan("\n📊 Generation Summary:"));
		this.logger.info(chalk.gray("─".repeat(50)));

		const features: string[] = [];
		if (this.isEnabled(this.config.generateTests)) features.push("Test Generation");

		this.logger.info(chalk.white(`📁 Output Directory: ${this.outputDir}`));
		this.logger.info(chalk.white(`✨ Generated Features: ${features.join(", ")}`));

		const stats = this.projectManager.getGenerationStats();
		if (stats.skippedWrites !== undefined) {
			this.logger.info(chalk.white(`🧩 Skipped Writes (incremental): ${stats.skippedWrites}`));
		}

		this.logger.info(chalk.gray("─".repeat(50)));
		this.logger.info(chalk.green("🚀 Your oRPC API is ready to use!\n"));
	}

	private async loadPlugins(): Promise<void> {
		return;
	}

	private async runPreModelHooks(model: PrismaModel, dmmf: DMMF.Document): Promise<void> {
		for (const p of this.plugins) {
			if (p.preModelHook) {
				try {
					await p.preModelHook(model, {
						dmmf,
						config: this.config,
						logger: this.logger,
					});
				} catch (e) {
					this.logger.error(`preModelHook failed (${p.name})`, e);
				}
			}
		}
	}

	private async runPostWriteHooks(): Promise<void> {
		for (const p of this.plugins) {
			if (p.postWriteHook) {
				try {
					await p.postWriteHook({
						outputDir: this.outputDir,
						config: this.config,
						logger: this.logger,
						project: this.projectManager,
					});
				} catch (e) {
					this.logger.error(`postWriteHook failed (${p.name})`, e);
				}
			}
		}
	}

	private plugins: import("../types/plugin-types").ORPCGeneratorPlugin[] = [];
}

import type { ORPCGeneratorPlugin } from "../types/plugin-types";

// Re-export for backward compatibility
export type { ORPCGeneratorPlugin, PluginModule } from "../types/plugin-types";
export type { SpinnerLike } from "../utils/spinner";

// Main generator function for Prisma
export async function generate(options: GeneratorOptions): Promise<void> {
	const generator = new ORPCGenerator(options);
	await generator.generate();
}
