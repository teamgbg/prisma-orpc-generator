"use strict";
/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Processes Prisma models: resolves comments, enhances with metadata, filters hidden models.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelProcessingStrategy = void 0;
const model_utils_1 = require("../utils/model-utils");
class ModelProcessingStrategy {
    constructor(config, logger, spinner) {
        this.config = config;
        this.logger = logger;
        this.spinner = spinner;
    }
    process(dmmf) {
        this.spinner.text = "Processing Prisma models...";
        const models = [...dmmf.datamodel.models];
        const hiddenModels = [];
        (0, model_utils_1.resolveModelsComments)(models, hiddenModels);
        const enhancedModels = (0, model_utils_1.enhanceModelsWithMetadata)(models, this.config);
        const visibleModels = enhancedModels.filter((model) => !hiddenModels.includes(model.name));
        const convertedModels = (0, model_utils_1.convertDMMFModelsToPrismaModels)(visibleModels);
        this.logger.debug(`Processed ${convertedModels.length} visible models (${hiddenModels.length} hidden)`);
        return convertedModels;
    }
}
exports.ModelProcessingStrategy = ModelProcessingStrategy;
//# sourceMappingURL=model-processing.js.map