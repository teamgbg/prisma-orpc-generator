/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates test utilities: mock context, test server, vitest config, tsconfig, and setup files.
 */
import type { PrismaModel } from "../types/generator-types";
import type { ProjectManager } from "../utils/project-manager";
export declare class TestUtilsGenerator {
    private outputDir;
    private projectManager;
    constructor(outputDir: string, projectManager: ProjectManager);
    generate(models: PrismaModel[]): Promise<void>;
    private generateMockContext;
    private generateTestServer;
    private generateVitestConfig;
    private generateTsProjectConfig;
    private generateTestTypes;
    private generateTestSetup;
}
//# sourceMappingURL=test-utils-generator.d.ts.map