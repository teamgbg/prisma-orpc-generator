"use strict";
/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles output directory setup, directory structure creation, and schema drift advisory.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaSetupStrategy = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
class SchemaSetupStrategy {
    constructor(options, outputDir, projectManager, logger, spinner) {
        this.options = options;
        this.outputDir = outputDir;
        this.projectManager = projectManager;
        this.logger = logger;
        this.spinner = spinner;
    }
    async setup() {
        this.spinner.text = "Setting up output directory...";
        await node_fs_1.promises.mkdir(this.outputDir, { recursive: true });
        await this.projectManager.cleanOutputDirectory();
        const baseDirs = ["routers", "routers/models", "routers/helpers"];
        await this.projectManager.createDirectoryStructure(baseDirs);
        this.logger.debug("Output directory structure created");
        await this.writeSchemaDriftHash();
    }
    async writeSchemaDriftHash() {
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
}
exports.SchemaSetupStrategy = SchemaSetupStrategy;
//# sourceMappingURL=schema-setup.js.map