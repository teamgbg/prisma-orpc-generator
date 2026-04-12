/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates integration tests for the complete API.
 */
import type { PrismaModel } from "../types/generator-types";
import type { ProjectManager } from "../utils/project-manager";
export declare class IntegrationTestGenerator {
    private outputDir;
    private projectManager;
    constructor(outputDir: string, projectManager: ProjectManager);
    generate(models: PrismaModel[]): Promise<void>;
    private generateTestData;
}
//# sourceMappingURL=integration-test-generator.d.ts.map