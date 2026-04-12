/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates unit tests for individual model routers.
 */
import type { PrismaModel } from "../types/generator-types";
import type { ProjectManager } from "../utils/project-manager";
export declare class UnitTestGenerator {
    private outputDir;
    private projectManager;
    constructor(outputDir: string, projectManager: ProjectManager);
    generate(models: PrismaModel[]): Promise<void>;
    private generateModelUnitTests;
    private generateTimestampFields;
    private generateTestData;
}
//# sourceMappingURL=unit-test-generator.d.ts.map