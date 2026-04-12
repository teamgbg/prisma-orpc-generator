/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles PostgreSQL function introspection and function router generation.
 */
import type { GeneratorOptions } from "@prisma/generator-helper";
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import type { SpinnerLike } from "../utils/spinner";
import type { PgFunction } from "../utils/pg-function-introspector";
export declare class PgFunctionStrategy {
    private config;
    private outputDir;
    private projectManager;
    private logger;
    private spinner;
    private pgFunctions;
    private options?;
    constructor(config: Config, outputDir: string, projectManager: ProjectManager, logger: Logger, spinner: SpinnerLike);
    getFunctions(): PgFunction[];
    isEnabled(): boolean;
    setOptions(options: GeneratorOptions): void;
    introspect(): Promise<void>;
    regenerateAppRouter(models: PrismaModel[]): Promise<void>;
}
//# sourceMappingURL=pg-function-strategy.d.ts.map