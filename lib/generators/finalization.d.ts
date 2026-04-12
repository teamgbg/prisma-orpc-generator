/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles finalization: saving project, generating barrel exports, package info, and config.
 */
import type { Config } from "../config/schema";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import type { SpinnerLike } from "../utils/spinner";
export declare class FinalizationStrategy {
    private config;
    private outputDir;
    private projectManager;
    private logger;
    private spinner;
    constructor(config: Config, outputDir: string, projectManager: ProjectManager, logger: Logger, spinner: SpinnerLike);
    finalize(): Promise<void>;
    private writeEffectiveConfig;
}
//# sourceMappingURL=finalization.d.ts.map