/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Analyzes Prisma schema using DMMF to extract models and their metadata.
 */
import type { DMMF, GeneratorOptions } from "@prisma/generator-helper";
import type { Logger } from "../utils/logger";
import type { SpinnerLike } from "../utils/spinner";
export declare class SchemaAnalysisStrategy {
    private options;
    private logger;
    private spinner;
    constructor(options: GeneratorOptions, logger: Logger, spinner: SpinnerLike);
    analyze(): Promise<DMMF.Document>;
}
//# sourceMappingURL=schema-analysis.d.ts.map