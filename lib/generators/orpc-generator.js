"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORPCGenerator = void 0;
exports.generate = generate;
const internals_1 = require("@prisma/internals");
const chalk_1 = __importDefault(require("chalk"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const prisma_generator_1 = require("prisma-zod-generator/lib/prisma-generator");
const schema_1 = require("../config/schema");
const logger_1 = require("../utils/logger");
const model_utils_1 = require("../utils/model-utils");
const project_manager_1 = require("../utils/project-manager");
const code_generator_1 = require("./code-generator");
const documentation_generator_1 = require("./documentation-generator");
const shield_generator_1 = require("./shield-generator");
const test_generator_1 = require("./test-generator");
function createSpinner(enabled = false) {
    // Spinner output is DISABLED by default.
    // Enable with any of:
    // - ORPC_SPINNER=true
    // - ORPC_DEBUG / DEBUG contains 'orpc'
    // - ORPC_LOG_LEVEL / ORPC_LOG in {info, debug, warn, 1, true}
    // - enableDebugLogging generator config (passed via 'enabled')
    const rawLevel = (process.env.ORPC_LOG_LEVEL || process.env.ORPC_LOG || '')
        .toString()
        .toLowerCase();
    const dbg = (process.env.ORPC_DEBUG || process.env.DEBUG || '').toString().toLowerCase();
    const spinnerEnv = (process.env.ORPC_SPINNER || '').toString().toLowerCase();
    const explicitlyDisable = spinnerEnv === 'false' ||
        rawLevel === 'silent' ||
        rawLevel === 'none' ||
        rawLevel === '0' ||
        rawLevel === 'off';
    const explicitlyEnable = spinnerEnv === 'true' ||
        dbg.includes('orpc') ||
        rawLevel === 'info' ||
        rawLevel === 'debug' ||
        rawLevel === 'warn' ||
        rawLevel === '1' ||
        rawLevel === 'true';
    const canLog = explicitlyDisable ? false : enabled || explicitlyEnable;
    let text = '';
    let state = 'idle';
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
            if (state === 'running')
                log('⏳');
        },
        start(t) {
            state = 'running';
            if (t)
                text = t;
            log('⏳', t);
        },
        stop() {
            state = 'stopped';
        },
        succeed(t) {
            state = 'stopped';
            log('✅', t);
        },
        fail(t) {
            state = 'stopped';
            log('❌', t);
        },
    };
}
class ORPCGenerator {
    constructor(options) {
        this.options = options;
        this.plugins = [];
        const results = schema_1.configSchema.safeParse(options.generator.config);
        if (!results.success) {
            throw new Error(`Invalid generator configuration: ${results.error.message}`);
        }
        this.config = results.data;
        this.outputDir = (0, internals_1.parseEnvValue)(options.generator.output);
        this.projectManager = new project_manager_1.ProjectManager(this.outputDir);
        this.logger = new logger_1.Logger(this.config.enableDebugLogging);
        this.spinner = createSpinner(this.config.enableDebugLogging);
    }
    /**
     * Normalize config flags that may arrive as strings ("true"/"false") from external generator config.
     */
    isEnabled(value) {
        return value === true || value === 'true';
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
            // Phase 3: Core generation
            await this.generateCoreFiles(models, dmmf);
            // Phase 4: Advanced features
            await this.generateAdvancedFeatures(this.options, models);
            // Phase 5: Optimization and finalization
            await this.optimizeOutput();
            await this.finalizeGeneration();
            await this.runPostWriteHooks();
            this.completeGeneration();
        }
        catch (error) {
            this.handleGenerationError(error);
            throw error;
        }
    }
    startGeneration() {
        this.spinner.start(chalk_1.default.blue('🚀 Generating oRPC routers...'));
        this.logger.info('Starting oRPC generation with configuration:', this.config);
    }
    async setupOutputDirectory() {
        this.spinner.text = 'Setting up output directory...';
        await fs_1.promises.mkdir(this.outputDir, { recursive: true });
        // Clean existing generated files
        await this.projectManager.cleanOutputDirectory();
        // Create minimal directory structure; optional features will create their own folders when enabled
        const baseDirs = ['routers', 'routers/models', 'routers/helpers'];
        await this.projectManager.createDirectoryStructure(baseDirs);
        this.logger.debug('Output directory structure created');
        // Schema drift advisory hash compare
        try {
            const datamodel = this.options.datamodel || '';
            const currentHash = crypto_1.default.createHash('sha256').update(datamodel).digest('hex');
            const hashFile = path_1.default.join(this.outputDir, '.schema-hash');
            let previousHash = null;
            try {
                previousHash = await fs_1.promises.readFile(hashFile, 'utf8');
            }
            catch {
                // ignore - first run
            }
            if (previousHash && previousHash !== currentHash) {
                this.logger.info('⚠️  Schema drift advisory: detected Prisma schema change since last generation.');
            }
            await fs_1.promises.writeFile(hashFile, currentHash, 'utf8');
        }
        catch (e) {
            this.logger.debug('Schema drift advisory skipped:', e);
        }
    }
    async validatePrismaClient() {
        this.spinner.text = 'Validating Prisma Client configuration...';
        const prismaClientProvider = this.options.otherGenerators.find((generator) => {
            const provider = (0, internals_1.parseEnvValue)(generator.provider);
            return provider === 'prisma-client-js' || provider === 'prisma-client';
        });
        if (!prismaClientProvider) {
            throw new Error('oRPC Generator requires a Prisma Client generator. Please add the following to your schema:\n\n' +
                'generator client {\n' +
                '  provider = "prisma-client-js"\n' +
                '}');
        }
        this.logger.debug('Prisma Client validation completed');
    }
    async analyzePrismaSchema() {
        this.spinner.text = 'Analyzing Prisma schema...';
        const prismaClientProvider = this.options.otherGenerators.find((generator) => {
            const provider = (0, internals_1.parseEnvValue)(generator.provider);
            return provider === 'prisma-client-js' || provider === 'prisma-client';
        });
        const dmmf = await (0, internals_1.getDMMF)({
            datamodel: this.options.datamodel,
            previewFeatures: prismaClientProvider?.previewFeatures || [],
        });
        this.logger.debug(`Analyzed ${dmmf.datamodel.models.length} models from Prisma schema`);
        return dmmf;
    }
    processModels(dmmf) {
        this.spinner.text = 'Processing Prisma models...';
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
        this.spinner.text = 'Generating core oRPC files...';
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
        // Generate shield rules if enabled
        if (this.isEnabled(this.config.generateShield)) {
            const shieldGenerator = new shield_generator_1.ShieldGenerator(this.config, this.outputDir, this.projectManager, this.logger);
            await shieldGenerator.generateShield(models);
        }
        this.logger.debug('Core files generation completed');
    }
    async generateAdvancedFeatures(options, models) {
        const tasks = [];
        const shouldGenerateValidationSchemas = this.config.generateInputValidation || this.config.generateOutputValidation;
        // Only generate Zod schemas when Zod is selected and validation is actually enabled.
        if (this.config.schemaLibrary === 'zod' && shouldGenerateValidationSchemas) {
            this.spinner.text = 'Generating Zod schemas (prisma-zod-generator)...';
            tasks.push(this.generateZodSchemasProgrammatically(options, models));
        }
        else if (this.config.schemaLibrary === 'zod') {
            this.logger.debug('Skipping prisma-zod-generator because both generateInputValidation and generateOutputValidation are disabled');
        }
        // Documentation
        if (this.isEnabled(this.config.generateDocumentation)) {
            this.spinner.text = 'Generating documentation...';
            tasks.push(this.generateDocumentation(models));
        }
        // Tests
        if (this.isEnabled(this.config.generateTests)) {
            this.spinner.text = 'Generating tests...';
            tasks.push(this.generateTests(models));
        }
        // Run tasks in parallel for performance
        await Promise.all(tasks);
        this.logger.debug('Advanced features generation completed');
    }
    async generateDocumentation(models) {
        const docGenerator = new documentation_generator_1.DocumentationGenerator(this.config, this.outputDir, this.logger);
        await docGenerator.generateDocumentation(models);
    }
    async generateTests(models) {
        const testGenerator = new test_generator_1.TestGenerator(this.config, this.outputDir, this.projectManager, this.logger);
        await testGenerator.generateTests(models);
    }
    async generateZodSchemasProgrammatically(options, _models) {
        try {
            const rawOutput = (0, internals_1.parseEnvValue)(options.generator.output);
            // Base resolution: like Prisma would (relative to schema file)
            const outputDir = path_1.default.isAbsolute(rawOutput)
                ? rawOutput
                : path_1.default.resolve(path_1.default.dirname(options.schemaPath), rawOutput);
            // Call prisma-zod-generator directly, redirecting output to our schemas folder
            const zodOutput = path_1.default.relative(path_1.default.dirname(options.schemaPath), path_1.default.join(outputDir, 'zod-schemas'));
            // Create zod.config.json dynamically with relative paths
            const zodConfigPath = await this.createZodConfig(options, zodOutput);
            // Ensure datasources is provided for prisma-zod-generator
            const generatorOptions = {
                ...options,
                generator: {
                    ...options.generator,
                    config: {
                        ...options.generator.config,
                        config: zodConfigPath,
                    },
                },
                // Provide default datasources if missing
                datasources: options.datasources || [
                    {
                        name: 'db',
                        provider: 'sqlite',
                        url: { value: 'file:./dev.db', fromEnvVar: null },
                        directUrl: null,
                    },
                ],
            };
            await (0, prisma_generator_1.generate)(generatorOptions);
            this.logger.debug(`Generated Zod schemas using prisma-zod-generator to ${zodOutput}`);
            this.logger.debug(`Zod configuration saved to ${zodConfigPath} for customization`);
        }
        catch (error) {
            this.logger.error(`Failed to generate Zod schemas: ${error}`);
            // Log the error but continue - schemas are optional
            this.logger.warn('Continuing without Zod schemas - validation will be disabled');
        }
    }
    async createZodConfig(options, zodOutput) {
        // Check if user provided a custom config path
        if (this.config.zodConfigPath) {
            const customConfigPath = path_1.default.isAbsolute(this.config.zodConfigPath)
                ? this.config.zodConfigPath
                : path_1.default.resolve(path_1.default.dirname(options.schemaPath), this.config.zodConfigPath);
            try {
                await fs_1.promises.access(customConfigPath);
                this.logger.debug(`Using custom Zod configuration from ${customConfigPath}`);
                return customConfigPath;
            }
            catch {
                throw new Error(`Custom Zod config file not found: ${customConfigPath}`);
            }
        }
        // Default config path alongside schema
        const defaultConfigPath = path_1.default.join(path_1.default.dirname(options.schemaPath), 'zod.config.json');
        // Check if default config already exists
        try {
            await fs_1.promises.access(defaultConfigPath);
            this.logger.debug(`Using existing Zod configuration from ${defaultConfigPath}`);
            // Don't modify existing config file - settings are passed as generator options instead
            return defaultConfigPath;
        }
        catch {
            // Config doesn't exist, create it with pure Zod configuration
        }
        // Start with minimal config
        const minimalZodConfig = {
            mode: 'full',
            output: zodOutput,
        };
        // Add oRPC-managed settings only if they differ from defaults or are explicitly set
        const zodConfigWithORPCSettings = {
            ...minimalZodConfig,
            // Only add dateTimeStrategy if it's not the default
            ...(this.config.zodDateTimeStrategy !== 'coerce'
                ? { dateTimeStrategy: this.config.zodDateTimeStrategy }
                : {}),
        };
        // Use minimal config if no oRPC overrides, otherwise use the merged config
        const finalZodConfig = this.config.zodDateTimeStrategy !== 'coerce' ? zodConfigWithORPCSettings : minimalZodConfig;
        await fs_1.promises.writeFile(defaultConfigPath, JSON.stringify(finalZodConfig, null, 2), 'utf8');
        this.logger.debug(`Created ${finalZodConfig === minimalZodConfig ? 'minimal' : 'customized'} Zod configuration at ${defaultConfigPath}`);
        return defaultConfigPath;
    }
    async optimizeOutput() {
        // Format generated code
        if (this.config.codeStyle === 'prettier') {
            this.spinner.text = 'Formatting generated code...';
            await this.projectManager.formatCode();
        }
    }
    async finalizeGeneration() {
        this.spinner.text = 'Finalizing generation...';
        // Save all generated files
        await this.projectManager.saveProject();
        // Generate barrel exports if enabled
        if (this.config.useBarrelExports) {
            await this.projectManager.generateBarrelExports();
        }
        // Create package.json for generated code if needed
        await this.projectManager.generatePackageInfo(this.config);
        this.logger.debug('Generation finalization completed');
        // Export effective resolved config JSON
        try {
            const effectivePath = path_1.default.join(this.outputDir, 'config-effective.json');
            await fs_1.promises.writeFile(effectivePath, JSON.stringify(this.config, null, 2), 'utf8');
        }
        catch (e) {
            this.logger.error('Failed to write config-effective.json', e);
        }
    }
    completeGeneration() {
        this.spinner.succeed(chalk_1.default.green('✅ oRPC routers generated successfully!'));
        // Display generation summary
        this.displayGenerationSummary();
    }
    handleGenerationError(error) {
        this.spinner.fail(chalk_1.default.red('❌ Generation failed'));
        this.logger.error('Generation error:', error);
    }
    displayGenerationSummary() {
        // Respect logger level for summary output
        this.logger.info(chalk_1.default.cyan('\n📊 Generation Summary:'));
        this.logger.info(chalk_1.default.gray('─'.repeat(50)));
        const features = [];
        if (this.isEnabled(this.config.generateTests))
            features.push('Test Generation');
        this.logger.info(chalk_1.default.white(`📁 Output Directory: ${this.outputDir}`));
        this.logger.info(chalk_1.default.white(`🛠️  Schema Library: ${this.config.schemaLibrary}`));
        this.logger.info(chalk_1.default.white(`✨ Generated Features: ${features.join(', ')}`));
        const stats = this.projectManager.getGenerationStats();
        if (stats.skippedWrites !== undefined) {
            this.logger.info(chalk_1.default.white(`🧩 Skipped Writes (incremental): ${stats.skippedWrites}`));
        }
        this.logger.info(chalk_1.default.gray('─'.repeat(50)));
        this.logger.info(chalk_1.default.green('🚀 Your oRPC API is ready to use!\n'));
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