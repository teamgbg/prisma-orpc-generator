import { Config } from '../config/schema';
import { PrismaModel } from '../types/generator-types';
import { Logger } from '../utils/logger';
import { ProjectManager } from '../utils/project-manager';
export declare class TestGenerator {
    private config;
    private outputDir;
    private projectManager;
    private logger;
    constructor(config: Config, outputDir: string, projectManager: ProjectManager, logger: Logger);
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