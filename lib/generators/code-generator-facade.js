"use strict";
/**
 * Generates TypeScript code for oRPC routers from Prisma models.
 *
 * Produces base routers, model procedures, and app router for scala-hub's ORPC API,
 * with auth, soft deletes, and validation for AI tool delegation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGeneratorFacade = void 0;
const base_router_generator_1 = require("./base-router-generator");
const model_router_generator_1 = require("./model-router-generator");
const app_router_generator_1 = require("./app-router-generator");
class CodeGeneratorFacade {
    constructor(config, outputDir, projectManager, logger) {
        this.config = config;
        this.outputDir = outputDir;
        this.projectManager = projectManager;
        this.logger = logger;
    }
    async generateBaseRouter(options) {
        const baseRouterGenerator = new base_router_generator_1.BaseRouterGenerator(this.config, this.outputDir, this.projectManager, this.logger);
        await baseRouterGenerator.generate(options);
    }
    async generateModelRouter(model, modelOperations) {
        const modelRouterGenerator = new model_router_generator_1.ModelRouterGenerator(this.config, this.outputDir, this.projectManager, this.logger);
        await modelRouterGenerator.generate(model, modelOperations);
    }
    async generateAppRouter(models) {
        const appRouterGenerator = new app_router_generator_1.AppRouterGenerator(this.outputDir, this.projectManager, this.logger);
        await appRouterGenerator.generate(models);
    }
}
exports.CodeGeneratorFacade = CodeGeneratorFacade;
//# sourceMappingURL=code-generator-facade.js.map