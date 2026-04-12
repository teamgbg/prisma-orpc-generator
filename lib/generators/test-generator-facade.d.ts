/**
 * Generates Vitest tests for oRPC routers.
 *
 * Produces unit and integration tests for model procedures, ensuring reliability
 * of scala-hub ORPC endpoints in AI tool execution flows.
 */
import type { PrismaModel } from "../types/generator-types";
import type { ProjectManager } from "../utils/project-manager";
export declare class TestGeneratorFacade {
    private outputDir;
    private projectManager;
    constructor(outputDir: string, projectManager: ProjectManager);
    generateTests(models: PrismaModel[]): Promise<void>;
}
//# sourceMappingURL=test-generator-facade.d.ts.map