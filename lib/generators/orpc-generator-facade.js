"use strict";
/**
 * Main orchestrator for the Prisma oRPC code generator.
 *
 * Coordinates schema analysis and generation of ORPC routers for scala-hub's
 * Prisma-backed API, enabling AI tool execution via scala-hub-tool-mcp.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORPCGenerator = void 0;
exports.generate = generate;
const internals_1 = require("@prisma/internals");
const chalk_1 = __importDefault(require("chalk"));
const schema_1 = require("../config/schema");
const spinner_1 = require("../utils/spinner");
const logger_1 = require("../utils/logger");
const project_manager_1 = require("../utils/project-manager");
const manifest_generator_1 = require("./manifest-generator");
const schema_setup_1 = require("./schema-setup");
const schema_analysis_1 = require("./schema-analysis");
const model_processing_1 = require("./model-processing");
const pg_function_strategy_1 = require("./pg-function-strategy");
const advanced_features_1 = require("./advanced-features");
const optimization_1 = require("./optimization");
const finalization_1 = require("./finalization");
const code_generator_facade_1 = require("./code-generator-facade");
class ORPCGenerator {
    constructor(options) {
        this.options = options;
        this.pgFunctions = [];
        this.plugins = [];
        this.config = (0, schema_1.parseConfig)(options.generator.config);
        this.outputDir = (0, internals_1.parseEnvValue)(options.generator.output);
        this.projectManager = new project_manager_1.ProjectManager(this.outputDir);
        this.logger = new logger_1.Logger(this.config.enableDebugLogging);
        this.spinner = (0, spinner_1.createSpinner)(this.config.enableDebugLogging);
    }
    isEnabled(value) {
        return value === true || value === "true";
    }
    async generate() {
        try {
            this.startGeneration();
            await this.loadPlugins();
            const schemaSetup = new schema_setup_1.SchemaSetupStrategy(this.options, this.outputDir, this.projectManager, this.logger, this.spinner);
            await schemaSetup.setup();
            await this.validatePrismaClient();
            const schemaAnalysis = new schema_analysis_1.SchemaAnalysisStrategy(this.options, this.logger, this.spinner);
            const dmmf = await schemaAnalysis.analyze();
            const modelProcessing = new model_processing_1.ModelProcessingStrategy(this.config, this.logger, this.spinner);
            const models = modelProcessing.process(dmmf);
            await this.generateCoreFiles(models, dmmf);
            const pgFunctionStrategy = new pg_function_strategy_1.PgFunctionStrategy(this.config, this.outputDir, this.projectManager, this.logger, this.spinner);
            pgFunctionStrategy.setOptions(this.options);
            await pgFunctionStrategy.introspect();
            this.pgFunctions = pgFunctionStrategy.getFunctions();
            await this.writeToolManifest(models);
            const advancedFeatures = new advanced_features_1.AdvancedFeaturesStrategy(this.config, this.outputDir, this.projectManager, this.logger, this.spinner);
            await advancedFeatures.generate(this.options, models);
            const optimization = new optimization_1.OptimizationStrategy(this.config, this.projectManager, this.spinner, this.logger);
            await optimization.optimize();
            const finalization = new finalization_1.FinalizationStrategy(this.config, this.outputDir, this.projectManager, this.logger, this.spinner);
            await finalization.finalize();
            if (this.pgFunctions.length > 0) {
                await pgFunctionStrategy.regenerateAppRouter(models);
            }
            await this.runPostWriteHooks();
            this.completeGeneration();
        }
        catch (error) {
            this.handleGenerationError(error);
            throw error;
        }
    }
    startGeneration() {
        this.spinner.start(chalk_1.default.blue("🚀 Generating oRPC routers..."));
        this.logger.info("Starting oRPC generation with configuration:", this.config);
    }
    async validatePrismaClient() {
        this.spinner.text = "Validating Prisma Client configuration...";
        const prismaClientProvider = this.options.otherGenerators.find((generator) => {
            const provider = (0, internals_1.parseEnvValue)(generator.provider);
            return provider === "prisma-client-js" || provider === "prisma-client";
        });
        if (!prismaClientProvider) {
            throw new Error("oRPC Generator requires a Prisma Client generator. Please add the following to your schema:\n\n" +
                "generator client {\n" +
                '  provider = "prisma-client-js"\n' +
                "}");
        }
        this.logger.debug("Prisma Client validation completed");
    }
    async generateCoreFiles(models, dmmf) {
        this.spinner.text = "Generating core oRPC files...";
        const codeGenerator = new code_generator_facade_1.CodeGeneratorFacade(this.config, this.outputDir, this.projectManager, this.logger);
        await codeGenerator.generateBaseRouter(this.options);
        for (const model of models) {
            await this.runPreModelHooks(model, dmmf);
            await codeGenerator.generateModelRouter(model, [...dmmf.mappings.modelOperations]);
        }
        await codeGenerator.generateAppRouter(models);
        this.logger.debug("Core files generation completed");
    }
    async writeToolManifest(models) {
        this.spinner.text = "Generating tool manifest...";
        const manifest = (0, manifest_generator_1.generateToolManifest)(models, this.config, this.pgFunctions);
        const manifestPath = `${this.outputDir}/tool-manifest.json`;
        const { promises: fs } = await Promise.resolve().then(() => __importStar(require("node:fs")));
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
        this.logger.debug(`Tool manifest written: ${Object.keys(manifest.models).length} models`);
    }
    completeGeneration() {
        this.spinner.succeed(chalk_1.default.green("✅ oRPC routers generated successfully!"));
        this.displayGenerationSummary();
    }
    handleGenerationError(error) {
        this.spinner.fail(chalk_1.default.red("❌ Generation failed"));
        this.logger.error("Generation error:", error);
    }
    displayGenerationSummary() {
        this.logger.info(chalk_1.default.cyan("\n📊 Generation Summary:"));
        this.logger.info(chalk_1.default.gray("─".repeat(50)));
        const features = [];
        if (this.isEnabled(this.config.generateTests))
            features.push("Test Generation");
        this.logger.info(chalk_1.default.white(`📁 Output Directory: ${this.outputDir}`));
        this.logger.info(chalk_1.default.white(`✨ Generated Features: ${features.join(", ")}`));
        const stats = this.projectManager.getGenerationStats();
        if (stats.skippedWrites !== undefined) {
            this.logger.info(chalk_1.default.white(`🧩 Skipped Writes (incremental): ${stats.skippedWrites}`));
        }
        this.logger.info(chalk_1.default.gray("─".repeat(50)));
        this.logger.info(chalk_1.default.green("🚀 Your oRPC API is ready to use!\n"));
    }
    async loadPlugins() {
        return;
    }
    async runPreModelHooks(model, dmmf) {
        for (const p of this.plugins) {
            if (p.preModelHook) {
                try {
                    await p.preModelHook(model, {
                        dmmf,
                        config: this.config,
                        logger: this.logger,
                    });
                }
                catch (e) {
                    this.logger.error(`preModelHook failed (${p.name})`, e);
                }
            }
        }
    }
    async runPostWriteHooks() {
        for (const p of this.plugins) {
            if (p.postWriteHook) {
                try {
                    await p.postWriteHook({
                        outputDir: this.outputDir,
                        config: this.config,
                        logger: this.logger,
                        project: this.projectManager,
                    });
                }
                catch (e) {
                    this.logger.error(`postWriteHook failed (${p.name})`, e);
                }
            }
        }
    }
}
exports.ORPCGenerator = ORPCGenerator;
// Main generator function for Prisma
async function generate(options) {
    const generator = new ORPCGenerator(options);
    await generator.generate();
}
//# sourceMappingURL=orpc-generator-facade.js.map