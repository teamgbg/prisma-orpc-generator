"use strict";
/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles finalization: saving project, generating barrel exports, package info, and config.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalizationStrategy = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
class FinalizationStrategy {
    constructor(config, outputDir, projectManager, logger, spinner) {
        this.config = config;
        this.outputDir = outputDir;
        this.projectManager = projectManager;
        this.logger = logger;
        this.spinner = spinner;
    }
    async finalize() {
        this.spinner.text = "Finalizing generation...";
        await this.projectManager.saveProject();
        if (this.config.useBarrelExports) {
            await this.projectManager.generateBarrelExports();
        }
        await this.projectManager.generatePackageInfo(this.config);
        this.logger.debug("Generation finalization completed");
        await this.writeEffectiveConfig();
    }
    async writeEffectiveConfig() {
        try {
            const effectivePath = node_path_1.default.join(this.outputDir, "config-effective.json");
            await node_fs_1.promises.writeFile(effectivePath, JSON.stringify(this.config, null, 2), "utf8");
        }
        catch (e) {
            this.logger.error("Failed to write config-effective.json", e);
        }
    }
}
exports.FinalizationStrategy = FinalizationStrategy;
//# sourceMappingURL=finalization.js.map