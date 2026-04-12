"use strict";
/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles output optimization such as code formatting.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationStrategy = void 0;
class OptimizationStrategy {
    constructor(config, projectManager, spinner, _logger) {
        this.config = config;
        this.projectManager = projectManager;
        this.spinner = spinner;
    }
    async optimize() {
        if (this.config.codeStyle === "prettier") {
            this.spinner.text = "Formatting generated code...";
            await this.projectManager.formatCode();
        }
    }
}
exports.OptimizationStrategy = OptimizationStrategy;
//# sourceMappingURL=optimization.js.map