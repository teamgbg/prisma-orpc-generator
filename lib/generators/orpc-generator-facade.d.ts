/**
 * Main orchestrator for the Prisma oRPC code generator.
 *
 * Coordinates schema analysis and generation of ORPC routers for scala-hub's
 * Prisma-backed API, enabling AI tool execution via scala-hub-tool-mcp.
 */
import type { GeneratorOptions } from "@prisma/generator-helper";
export declare class ORPCGenerator {
    private options;
    private config;
    private outputDir;
    private projectManager;
    private logger;
    private spinner;
    private pgFunctions;
    constructor(options: GeneratorOptions);
    private isEnabled;
    generate(): Promise<void>;
    private startGeneration;
    private validatePrismaClient;
    private generateCoreFiles;
    private writeToolManifest;
    private completeGeneration;
    private handleGenerationError;
    private displayGenerationSummary;
    private loadPlugins;
    private runPreModelHooks;
    private runPostWriteHooks;
    private plugins;
}
export type { ORPCGeneratorPlugin, PluginModule } from "../types/plugin-types";
export type { SpinnerLike } from "../utils/spinner";
export declare function generate(options: GeneratorOptions): Promise<void>;
//# sourceMappingURL=orpc-generator-facade.d.ts.map