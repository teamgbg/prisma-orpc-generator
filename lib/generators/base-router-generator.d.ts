/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates the base router with context and procedure definitions.
 */
import type { GeneratorOptions } from "@prisma/generator-helper";
import type { Config } from "../config/schema";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
export declare class BaseRouterGenerator {
    private config;
    private outputDir;
    private projectManager;
    private logger;
    constructor(config: Config, outputDir: string, projectManager: ProjectManager, logger: Logger);
    private isEnabled;
    generate(options: GeneratorOptions): Promise<void>;
    private generateBaseRouterContent;
    private generateUtilityFunctions;
    private generateErrorHandlingModule;
}
//# sourceMappingURL=base-router-generator.d.ts.map