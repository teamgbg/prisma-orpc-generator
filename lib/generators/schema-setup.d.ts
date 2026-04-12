/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles output directory setup, directory structure creation, and schema drift advisory.
 */
import type { GeneratorOptions } from "@prisma/generator-helper";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import type { SpinnerLike } from "../utils/spinner";
export declare class SchemaSetupStrategy {
    private options;
    private outputDir;
    private projectManager;
    private logger;
    private spinner;
    constructor(options: GeneratorOptions, outputDir: string, projectManager: ProjectManager, logger: Logger, spinner: SpinnerLike);
    setup(): Promise<void>;
    private writeSchemaDriftHash;
}
//# sourceMappingURL=schema-setup.d.ts.map