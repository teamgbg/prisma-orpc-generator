/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles output optimization such as code formatting.
 */
import type { Config } from "../config/schema";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import type { SpinnerLike } from "../utils/spinner";
export declare class OptimizationStrategy {
    private config;
    private projectManager;
    private spinner;
    constructor(config: Config, projectManager: ProjectManager, spinner: SpinnerLike, _logger: Logger);
    optimize(): Promise<void>;
}
//# sourceMappingURL=optimization.d.ts.map