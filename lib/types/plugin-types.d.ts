import type { DMMF } from "@prisma/generator-helper";
import type { Config } from "../config/schema";
import type { PrismaModel } from "./generator-types";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
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
//# sourceMappingURL=plugin-types.d.ts.map