/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates the main application router combining all model routers.
 */
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
export declare class AppRouterGenerator {
    private outputDir;
    private projectManager;
    private logger;
    constructor(outputDir: string, projectManager: ProjectManager, logger: Logger);
    generate(models: PrismaModel[]): Promise<void>;
    private generateBasicAppRouter;
}
//# sourceMappingURL=app-router-generator.d.ts.map