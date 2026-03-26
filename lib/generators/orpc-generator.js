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
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const internals_1 = require("@prisma/internals");
const chalk_1 = __importDefault(require("chalk"));
const schema_1 = require("../config/schema");
const logger_1 = require("../utils/logger");
const model_utils_1 = require("../utils/model-utils");
const project_manager_1 = require("../utils/project-manager");
const autogen_header_1 = require("../utils/autogen-header");
const code_generator_1 = require("./code-generator");
const documentation_generator_1 = require("./documentation-generator");
const function_generator_1 = require("./function-generator");
const manifest_generator_1 = require("./manifest-generator");
const test_generator_1 = require("./test-generator");
const pg_function_introspector_1 = require("../utils/pg-function-introspector");
function createSpinner(enabled = false) {
    // Spinner output is DISABLED by default.
    // Enable with any of:
    // - ORPC_SPINNER=true
    // - ORPC_DEBUG / DEBUG contains 'orpc'
    // - ORPC_LOG_LEVEL / ORPC_LOG in {info, debug, warn, 1, true}
    // - enableDebugLogging generator config (passed via 'enabled')
    const rawLevel = (process.env.ORPC_LOG_LEVEL || process.env.ORPC_LOG || "")
        .toString()
        .toLowerCase();
    const dbg = (process.env.ORPC_DEBUG || process.env.DEBUG || "").toString().toLowerCase();
    const spinnerEnv = (process.env.ORPC_SPINNER || "").toString().toLowerCase();
    const explicitlyDisable = spinnerEnv === "false" ||
        rawLevel === "silent" ||
        rawLevel === "none" ||
        rawLevel === "0" ||
        rawLevel === "off";
    const explicitlyEnable = spinnerEnv === "true" ||
        dbg.includes("orpc") ||
        rawLevel === "info" ||
        rawLevel === "debug" ||
        rawLevel === "warn" ||
        rawLevel === "1" ||
        rawLevel === "true";
    const canLog = explicitlyDisable ? false : enabled || explicitlyEnable;
    let text = "";
    let state = "idle";
    const log = (prefix, t) => {
        if (!canLog)
            return;
        const msg = t ?? text;
        if (msg) {
            // Keep logs concise; avoid overwriting lines in non-TTY
            console.log(`${prefix} ${msg}`);
        }
    };
    return {
        get text() {
            return text;
        },
        set text(v) {
            text = v;
            if (state === "running")
                log("⏳");
        },
        start(t) {
            state = "running";
            if (t)
                text = t;
            log("⏳", t);
        },
        stop() {
            state = "stopped";
        },
        succeed(t) {
            state = "stopped";
            log("✅", t);
        },
        fail(t) {
            state = "stopped";
            log("❌", t);
        },
    };
}
class ORPCGenerator {
    constructor(options) {
        this.options = options;
        this.plugins = [];
        this.pgFunctions = [];
        this.config = (0, schema_1.parseConfig)(options.generator.config);
        this.outputDir = (0, internals_1.parseEnvValue)(options.generator.output);
        this.projectManager = new project_manager_1.ProjectManager(this.outputDir);
        this.logger = new logger_1.Logger(this.config.enableDebugLogging);
        this.spinner = createSpinner(this.config.enableDebugLogging);
    }
    /**
     * Normalize config flags that may arrive as strings ("true"/"false") from external generator config.
     */
    isEnabled(value) {
        return value === true || value === "true";
    }
    async generate() {
        try {
            this.startGeneration();
            await this.loadPlugins();
            // Phase 1: Setup and validation
            await this.setupOutputDirectory();
            await this.validatePrismaClient();
            // Phase 2: Schema analysis
            const dmmf = await this.analyzePrismaSchema();
            const models = this.processModels(dmmf);
            // Phase 3: Core generation (models + views)
            await this.generateCoreFiles(models, dmmf);
            // Phase 3.1: PG function introspection and generation
            await this.introspectAndGeneratePgFunctions();
            // Phase 3.5: Tool manifest — contract for scala-ai-tool-generator
            await this.writeToolManifest(models);
            // Phase 4: Advanced features
            await this.generateAdvancedFeatures(this.options, models);
            // Phase 5: Optimization and finalization
            await this.optimizeOutput();
            await this.finalizeGeneration();
            // Phase 5.1: Regenerate app router with functions (must happen AFTER
            // finalizeGeneration saves the ts-morph project to disk, otherwise
            // ts-morph's in-memory version overwrites our changes)
            if (this.pgFunctions.length > 0) {
                await this.regenerateAppRouterWithFunctions(models);
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
    async setupOutputDirectory() {
        this.spinner.text = "Setting up output directory...";
        await node_fs_1.promises.mkdir(this.outputDir, { recursive: true });
        // Clean existing generated files
        await this.projectManager.cleanOutputDirectory();
        // Create minimal directory structure; optional features will create their own folders when enabled
        const baseDirs = ["routers", "routers/models", "routers/helpers"];
        await this.projectManager.createDirectoryStructure(baseDirs);
        this.logger.debug("Output directory structure created");
        // Schema drift advisory hash compare
        try {
            const datamodel = this.options.datamodel || "";
            const currentHash = node_crypto_1.default.createHash("sha256").update(datamodel).digest("hex");
            const hashFile = node_path_1.default.join(this.outputDir, ".schema-hash");
            let previousHash = null;
            try {
                previousHash = await node_fs_1.promises.readFile(hashFile, "utf8");
            }
            catch {
                // ignore - first run
            }
            if (previousHash && previousHash !== currentHash) {
                this.logger.info("⚠️  Schema drift advisory: detected Prisma schema change since last generation.");
            }
            await node_fs_1.promises.writeFile(hashFile, currentHash, "utf8");
        }
        catch (e) {
            this.logger.debug("Schema drift advisory skipped:", e);
        }
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
    async analyzePrismaSchema() {
        this.spinner.text = "Analyzing Prisma schema...";
        const prismaClientProvider = this.options.otherGenerators.find((generator) => {
            const provider = (0, internals_1.parseEnvValue)(generator.provider);
            return provider === "prisma-client-js" || provider === "prisma-client";
        });
        const dmmf = await (0, internals_1.getDMMF)({
            datamodel: this.options.datamodel,
            previewFeatures: prismaClientProvider?.previewFeatures || [],
        });
        this.logger.debug(`Analyzed ${dmmf.datamodel.models.length} models from Prisma schema`);
        return dmmf;
    }
    processModels(dmmf) {
        this.spinner.text = "Processing Prisma models...";
        const models = [...dmmf.datamodel.models];
        const hiddenModels = [];
        // Resolve model comments and metadata
        (0, model_utils_1.resolveModelsComments)(models, hiddenModels);
        const enhancedModels = (0, model_utils_1.enhanceModelsWithMetadata)(models, this.config);
        // Filter visible models
        const visibleModels = enhancedModels.filter((model) => !hiddenModels.includes(model.name));
        // Convert DMMF models to PrismaModel format
        const convertedModels = (0, model_utils_1.convertDMMFModelsToPrismaModels)(visibleModels);
        this.logger.debug(`Processed ${convertedModels.length} visible models (${hiddenModels.length} hidden)`);
        return convertedModels;
    }
    async generateCoreFiles(models, dmmf) {
        this.spinner.text = "Generating core oRPC files...";
        const codeGenerator = new code_generator_1.CodeGenerator(this.config, this.outputDir, this.projectManager, this.logger);
        // Generate base router and utilities
        await codeGenerator.generateBaseRouter(this.options);
        // Generate model routers
        for (const model of models) {
            await this.runPreModelHooks(model, dmmf);
            await codeGenerator.generateModelRouter(model, [...dmmf.mappings.modelOperations]);
        }
        // Generate main app router
        await codeGenerator.generateAppRouter(models);
        this.logger.debug("Core files generation completed");
    }
    async introspectAndGeneratePgFunctions() {
        if (!this.isEnabled(this.config.generatePgFunctions)) {
            this.logger.debug("PG function generation disabled, skipping");
            return;
        }
        this.logger.debug("PG function generation enabled, resolving DATABASE_URL...");
        // Resolve DATABASE_URL from environment.
        // Prisma CLI loads .env but not .env.local — try loading it ourselves if needed.
        let dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            // Try .env.local relative to the schema path (project root)
            const schemaDir = this.options.schemaPath
                ? node_path_1.default.dirname(this.options.schemaPath)
                : process.cwd();
            const projectRoot = node_path_1.default.resolve(schemaDir, "..");
            const candidates = [
                node_path_1.default.resolve(projectRoot, ".env.local"),
                node_path_1.default.resolve(projectRoot, ".env"),
                node_path_1.default.resolve(process.cwd(), ".env.local"),
                node_path_1.default.resolve(process.cwd(), ".env"),
            ];
            for (const candidate of candidates) {
                try {
                    const content = await node_fs_1.promises.readFile(candidate, "utf8");
                    const match = content.match(/^DATABASE_URL=(.+)$/m);
                    if (match?.[1]) {
                        dbUrl = match[1].trim().replace(/^["']|["']$/g, "");
                        this.logger.debug(`Found DATABASE_URL in ${candidate}`);
                        break;
                    }
                }
                catch {
                    // file doesn't exist, try next
                }
            }
        }
        else {
            this.logger.debug("DATABASE_URL found in process.env");
        }
        if (!dbUrl) {
            this.logger.info("DATABASE_URL not available — skipping PG function generation. " +
                "Set DATABASE_URL in .env or .env.local to enable function introspection.");
            return;
        }
        this.spinner.text = "Introspecting PostgreSQL functions...";
        try {
            this.pgFunctions = await (0, pg_function_introspector_1.introspectPgFunctions)(dbUrl, this.logger);
            if (this.pgFunctions.length === 0) {
                this.logger.debug("No PG functions found, skipping function router generation");
                return;
            }
            this.spinner.text = `Generating ${this.pgFunctions.length} function routers...`;
            // Generate router files for each function
            await (0, function_generator_1.generateFunctionRouters)(this.pgFunctions, this.outputDir, this.projectManager, this.logger);
            this.logger.debug(`Generated ${this.pgFunctions.length} PG function routers`);
        }
        catch (error) {
            this.logger.error("PG function introspection failed (non-fatal):", error);
            // Non-fatal: models still generate fine without functions
        }
    }
    /**
     * Regenerate the app router index.ts to include both model routers and function routers.
     * This overwrites the index created by generateCoreFiles.
     */
    async regenerateAppRouterWithFunctions(models) {
        this.spinner.text = "Regenerating app router with PG function routers...";
        const indexPath = node_path_1.default.join(this.outputDir, "routers", "index.ts");
        const pluralize = (await Promise.resolve().then(() => __importStar(require("pluralize")))).default;
        // Model imports
        const modelImports = models
            .map((m) => {
            const routerName = pluralize(m.name.toLowerCase());
            return `import { ${routerName}Router } from "./models/${m.name}.router";`;
        })
            .join("\n");
        // Function imports
        const fnImports = this.pgFunctions
            .map((fn) => `import { ${fn.name}Router } from "./models/${fn.name}.router";`)
            .join("\n");
        // Model router entries
        const modelEntries = models
            .map((m) => {
            const routerName = pluralize(m.name.toLowerCase());
            return `  ${m.name.toLowerCase()}: ${routerName}Router`;
        })
            .join(",\n");
        // Function router entries
        const fnEntries = this.pgFunctions
            .map((fn) => `  ${fn.name}: ${fn.name}Router`)
            .join(",\n");
        // All re-exports
        const modelReExports = models
            .map((m) => `${pluralize(m.name.toLowerCase())}Router`)
            .join(", ");
        const fnReExports = this.pgFunctions
            .map((fn) => `${fn.name}Router`)
            .join(", ");
        const content = `${autogen_header_1.AUTOGEN_HEADER}
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
        await node_fs_1.promises.writeFile(indexPath, content, "utf8");
        this.logger.debug(`App router regenerated with ${models.length} models + ${this.pgFunctions.length} functions`);
    }
    async writeToolManifest(models) {
        this.spinner.text = "Generating tool manifest...";
        const manifest = (0, manifest_generator_1.generateToolManifest)(models, this.config, this.pgFunctions);
        const manifestPath = node_path_1.default.join(this.outputDir, "tool-manifest.json");
        await node_fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
        this.logger.debug(`Tool manifest written: ${Object.keys(manifest.models).length} models`);
    }
    async generateAdvancedFeatures(_options, models) {
        const tasks = [];
        // Documentation
        if (this.isEnabled(this.config.generateDocumentation)) {
            this.spinner.text = "Generating documentation...";
            tasks.push(this.generateDocumentation(models));
        }
        // Tests
        if (this.isEnabled(this.config.generateTests)) {
            this.spinner.text = "Generating tests...";
            tasks.push(this.generateTests(models));
        }
        // Run tasks in parallel for performance
        await Promise.all(tasks);
        this.logger.debug("Advanced features generation completed");
    }
    async generateDocumentation(models) {
        const docGenerator = new documentation_generator_1.DocumentationGenerator(this.config, this.outputDir, this.logger);
        await docGenerator.generateDocumentation(models);
    }
    async generateTests(models) {
        const testGenerator = new test_generator_1.TestGenerator(this.config, this.outputDir, this.projectManager, this.logger);
        await testGenerator.generateTests(models);
    }
    async optimizeOutput() {
        // Format generated code
        if (this.config.codeStyle === "prettier") {
            this.spinner.text = "Formatting generated code...";
            await this.projectManager.formatCode();
        }
    }
    async finalizeGeneration() {
        this.spinner.text = "Finalizing generation...";
        // Save all generated files
        await this.projectManager.saveProject();
        // Generate barrel exports if enabled
        if (this.config.useBarrelExports) {
            await this.projectManager.generateBarrelExports();
        }
        // Create package.json for generated code if needed
        await this.projectManager.generatePackageInfo(this.config);
        this.logger.debug("Generation finalization completed");
        // Export effective resolved config JSON
        try {
            const effectivePath = node_path_1.default.join(this.outputDir, "config-effective.json");
            await node_fs_1.promises.writeFile(effectivePath, JSON.stringify(this.config, null, 2), "utf8");
        }
        catch (e) {
            this.logger.error("Failed to write config-effective.json", e);
        }
    }
    completeGeneration() {
        this.spinner.succeed(chalk_1.default.green("✅ oRPC routers generated successfully!"));
        // Display generation summary
        this.displayGenerationSummary();
    }
    handleGenerationError(error) {
        this.spinner.fail(chalk_1.default.red("❌ Generation failed"));
        this.logger.error("Generation error:", error);
    }
    displayGenerationSummary() {
        // Respect logger level for summary output
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
    // Plugin system methods (basic implementation)
    async loadPlugins() {
        // Plugin loading disabled (experimental plugin system removed)
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
//# sourceMappingURL=orpc-generator.js.map