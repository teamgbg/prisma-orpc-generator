"use strict";
/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Orchestrates generation of documentation and tests as advanced features.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedFeaturesStrategy = void 0;
const documentation_generator_1 = require("./documentation-generator");
const test_generator_1 = require("./test-generator");
class AdvancedFeaturesStrategy {
    constructor(config, outputDir, projectManager, logger, spinner) {
        this.config = config;
        this.outputDir = outputDir;
        this.projectManager = projectManager;
        this.logger = logger;
        this.spinner = spinner;
    }
    isEnabled(value) {
        return value === true || value === "true";
    }
    async generate(_options, models) {
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
    async generateDocumentation(models) {
        const docGenerator = new documentation_generator_1.DocumentationGenerator(this.config, this.outputDir, this.logger);
        // biome-ignore lint/suspicious/noExplicitAny: DocumentationModel is a simplified type
        await docGenerator.generateDocumentation(models);
    }
    async generateTests(models) {
        const testGenerator = new test_generator_1.TestGeneratorFacade(this.outputDir, this.projectManager);
        await testGenerator.generateTests(models);
    }
}
exports.AdvancedFeaturesStrategy = AdvancedFeaturesStrategy;
//# sourceMappingURL=advanced-features.js.map