/**
 * Generates Vitest tests for oRPC routers.
 *
 * Produces unit and integration tests for model procedures, ensuring reliability
 * of scala-hub ORPC endpoints in AI tool execution flows.
 */
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
export declare class TestGenerator {
    private outputDir;
    private projectManager;
    private logger;
    constructor(_config: Config, outputDir: string, projectManager: ProjectManager, logger: Logger);
    generateTests(models: PrismaModel[]): Promise<void>;
    private generateUnitTests;
    private generateModelUnitTests;
    private generateIntegrationTests;
    private generateTestUtils;
    private generateMockContext;
    private generateTestServer;
    private generateVitestConfig;
    private generateTsProjectConfig;
    private generateTestTypes;
    private generateTestSetup;
    private generateTimestampFields;
    private generateTestData;
}
//# sourceMappingURL=test-generator.d.ts.map