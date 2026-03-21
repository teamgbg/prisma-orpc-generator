/**
 * Generates TypeScript code for oRPC routers from Prisma models.
 *
 * Produces base routers, model procedures, and app router for scala-hub's ORPC API,
 * with auth, soft deletes, and validation for AI tool delegation.
 */
import type { GeneratorOptions } from "@prisma/generator-helper";
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
export declare class CodeGenerator {
    private config;
    private outputDir;
    private projectManager;
    private logger;
    constructor(config: Config, outputDir: string, projectManager: ProjectManager, logger: Logger);
    /**
     * Normalize config flags that may arrive as strings ("true"/"false") from external generator config.
     */
    private isEnabled;
    generateBaseRouter(options: GeneratorOptions): Promise<void>;
    private generateBaseRouterContent;
    private generateUtilityFunctions;
    generateModelRouter(model: PrismaModel, modelOperations: unknown[]): Promise<void>;
    private generateModelRouterContent;
    private generateRelationProcedures;
    private capitalize;
    private generateModelProcedures;
    private generateSingleProcedure;
    private getProcedureName;
    private getProcedureType;
    generateAppRouter(models: PrismaModel[]): Promise<void>;
    private generateBasicAppRouter;
    private generateErrorHandlingModule;
}
//# sourceMappingURL=code-generator.d.ts.map