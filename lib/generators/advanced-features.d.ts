/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Orchestrates generation of documentation and tests as advanced features.
 */
import type { GeneratorOptions } from "@prisma/generator-helper";
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import type { SpinnerLike } from "../utils/spinner";
export declare class AdvancedFeaturesStrategy {
    private config;
    private outputDir;
    private projectManager;
    private logger;
    private spinner;
    constructor(config: Config, outputDir: string, projectManager: ProjectManager, logger: Logger, spinner: SpinnerLike);
    private isEnabled;
    generate(_options: GeneratorOptions, models: PrismaModel[]): Promise<void>;
    private generateDocumentation;
    private generateTests;
}
//# sourceMappingURL=advanced-features.d.ts.map