/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates individual model router files with CRUD procedures and relation resolvers.
 */
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
export declare class ModelRouterGenerator {
    private config;
    private outputDir;
    private projectManager;
    private logger;
    constructor(config: Config, outputDir: string, projectManager: ProjectManager, logger: Logger);
    private isEnabled;
    generate(model: PrismaModel, modelOperations: unknown[]): Promise<void>;
    private generateModelRouterContent;
    private generateRelationProcedures;
    private capitalize;
    private generateModelProcedures;
    private generateSingleProcedure;
    private getProcedureName;
    private getProcedureType;
}
//# sourceMappingURL=model-router-generator.d.ts.map