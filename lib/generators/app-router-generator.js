"use strict";
/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates the main application router combining all model routers.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppRouterGenerator = void 0;
const node_path_1 = __importDefault(require("node:path"));
const pluralize_1 = __importDefault(require("pluralize"));
const autogen_header_1 = require("../utils/autogen-header");
class AppRouterGenerator {
    constructor(outputDir, projectManager, logger) {
        this.outputDir = outputDir;
        this.projectManager = projectManager;
        this.logger = logger;
    }
    async generate(models) {
        this.logger.debug("Generating main application router...");
        const appRouter = this.projectManager.createSourceFile(node_path_1.default.resolve(this.outputDir, "routers", "index.ts"), undefined, { overwrite: true });
        for (const model of models) {
            const routerName = (0, pluralize_1.default)(model.name.toLowerCase());
            appRouter.addImportDeclaration({
                moduleSpecifier: `./models/${model.name}.router`,
                namedImports: [`${routerName}Router`],
            });
        }
        const routerEntries = models
            .map((model) => {
            const routerName = (0, pluralize_1.default)(model.name.toLowerCase());
            return `  ${model.name.toLowerCase()}: ${routerName}Router`;
        })
            .join(",\n");
        const routerContent = this.generateBasicAppRouter(routerEntries, models);
        appRouter.addStatements(routerContent);
        appRouter.insertText(0, autogen_header_1.AUTOGEN_HEADER);
        appRouter.formatText({ indentSize: 2 });
        this.logger.debug("Main application router generated");
    }
    generateBasicAppRouter(routerEntries, models) {
        return `
/**
 * Main application router combining all model routers
 * Generated with advanced oRPC architecture
 */
export const appRouter = {
${routerEntries}
};

/**
 * Type definition for the complete app router
 */
export type AppRouter = typeof appRouter;

/**
 * Export individual routers for modular usage
 */
export {${models
            .map((m) => {
            const r = (0, pluralize_1.default)(m.name.toLowerCase());
            return `${r}Router`;
        })
            .join(", ")}};
`;
    }
}
exports.AppRouterGenerator = AppRouterGenerator;
//# sourceMappingURL=app-router-generator.js.map