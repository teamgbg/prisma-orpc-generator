import { Config } from '../config/schema';
import { PrismaModel } from '../types/generator-types';
import { Logger } from '../utils/logger';
import { ProjectManager } from '../utils/project-manager';
export declare class ShieldGenerator {
    private config;
    private outputDir;
    private projectManager;
    private logger;
    constructor(config: Config, outputDir: string, projectManager: ProjectManager, logger: Logger);
    generateShield(models: PrismaModel[]): Promise<void>;
    private generateShieldContent;
    private generateBuiltInRules;
    private generateModelRules;
    private generateRulesForModel;
    private generateShieldConfig;
    private toLowerCamelCase;
    private generateModelShieldConfig;
    private isWriteOperation;
    private generateShieldOptions;
}
//# sourceMappingURL=shield-generator.d.ts.map