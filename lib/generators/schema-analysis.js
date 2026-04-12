"use strict";
/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Analyzes Prisma schema using DMMF to extract models and their metadata.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaAnalysisStrategy = void 0;
const internals_1 = require("@prisma/internals");
class SchemaAnalysisStrategy {
    constructor(options, logger, spinner) {
        this.options = options;
        this.logger = logger;
        this.spinner = spinner;
    }
    async analyze() {
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
}
exports.SchemaAnalysisStrategy = SchemaAnalysisStrategy;
//# sourceMappingURL=schema-analysis.js.map