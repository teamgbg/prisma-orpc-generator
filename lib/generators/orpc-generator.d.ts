import type { DMMF } from '@prisma/generator-helper';
import { GeneratorOptions } from '@prisma/generator-helper';
import { Config } from '../config/schema';
import { PrismaModel } from '../types/generator-types';
import { Logger } from '../utils/logger';
import { ProjectManager } from '../utils/project-manager';
export interface SpinnerLike {
    start(_text?: string): void;
    stop(): void;
    succeed(_text?: string): void;
    fail(_text?: string): void;
    text: string;
}
export declare class ORPCGenerator {
    private options;
    private config;
    private outputDir;
    private projectManager;
    private logger;
    private spinner;
    private plugins;
    constructor(options: GeneratorOptions);
    /**
     * Normalize config flags that may arrive as strings ("true"/"false") from external generator config.
     */
    private isEnabled;
    generate(): Promise<void>;
    private startGeneration;
    private setupOutputDirectory;
    private validatePrismaClient;
    private analyzePrismaSchema;
    private processModels;
    private generateCoreFiles;
    private generateAdvancedFeatures;
    private generateDocumentation;
    private generateTests;
    private generateZodSchemasProgrammatically;
    private createZodConfig;
    private optimizeOutput;
    private finalizeGeneration;
    private completeGeneration;
    private handleGenerationError;
    private displayGenerationSummary;
    private loadPlugins;
    private runPreModelHooks;
    private runPostWriteHooks;
}
export interface ORPCGeneratorPlugin {
    name: string;
    preModelHook?(model: PrismaModel, ctx: {
        dmmf: DMMF.Document;
        config: Config;
        logger: Logger;
    }): Promise<void> | void;
    postWriteHook?(ctx: {
        outputDir: string;
        config: Config;
        logger: Logger;
        project: ProjectManager;
    }): Promise<void> | void;
}
export type PluginModule = {
    default?: ORPCGeneratorPlugin;
} | ORPCGeneratorPlugin;
export declare function generate(options: GeneratorOptions): Promise<void>;
//# sourceMappingURL=orpc-generator.d.ts.map