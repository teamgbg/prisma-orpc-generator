/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Processes Prisma models: resolves comments, enhances with metadata, filters hidden models.
 */
import type { DMMF } from "@prisma/generator-helper";
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { SpinnerLike } from "../utils/spinner";
export declare class ModelProcessingStrategy {
    private config;
    private logger;
    private spinner;
    constructor(config: Config, logger: Logger, spinner: SpinnerLike);
    process(dmmf: DMMF.Document): PrismaModel[];
}
//# sourceMappingURL=model-processing.d.ts.map