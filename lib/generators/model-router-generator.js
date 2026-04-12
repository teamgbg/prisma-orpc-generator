"use strict";
/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates individual model router files with CRUD procedures and relation resolvers.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRouterGenerator = void 0;
const node_path_1 = __importDefault(require("node:path"));
const pluralize_1 = __importDefault(require("pluralize"));
const autogen_header_1 = require("../utils/autogen-header");
const code_generation_utils_1 = require("../utils/code-generation-utils");
const operation_utils_1 = require("../utils/operation-utils");
class ModelRouterGenerator {
    constructor(config, outputDir, projectManager, logger) {
        this.config = config;
        this.outputDir = outputDir;
        this.projectManager = projectManager;
        this.logger = logger;
    }
    isEnabled(value) {
        return value === true || value === "true";
    }
    async generate(model, modelOperations) {
        const modelName = model.name;
        this.logger.debug(`Generating router for model: ${modelName}`);
        const modelRouter = this.projectManager.createSourceFile(node_path_1.default.resolve(this.outputDir, "routers", "models", `${modelName}.router.ts`), undefined, { overwrite: true });
        await this.generateModelRouterContent(modelRouter, model, modelOperations);
        modelRouter.insertText(0, autogen_header_1.AUTOGEN_HEADER);
        modelRouter.formatText({ indentSize: 2 });
        this.logger.debug(`Router generated for model: ${modelName}`);
    }
    async generateModelRouterContent(sourceFile, model, modelOperations) {
        const modelName = model.name;
        const routerName = (0, pluralize_1.default)(modelName.toLowerCase());
        const hasPublicOps = !!model.documentation?.match(/@orpc\.public\s+/);
        const baseImports = hasPublicOps
            ? ["publicProcedure", "protectedProcedure"]
            : ["protectedProcedure"];
        if (this.isEnabled(this.config.wrapResponses)) {
            baseImports.push("createSuccessResponse");
        }
        sourceFile.addImportDeclaration({
            moduleSpecifier: "../helpers/createRouter",
            namedImports: baseImports,
        });
        sourceFile.addImportDeclaration({
            moduleSpecifier: "../helpers/createRouter",
            isTypeOnly: true,
            namedImports: ["Context"],
        });
        sourceFile.addImportDeclaration({
            moduleSpecifier: "@orpc/server",
            namedImports: ["ORPCError"],
        });
        sourceFile.addImportDeclaration({
            moduleSpecifier: this.config.prismaClientPath || "@prisma/client",
            namedImports: ["Prisma"],
        });
        let procedures = await this.generateModelProcedures(model, modelOperations);
        if (this.config.generateRelationResolvers && !model.isView) {
            const relProcedures = this.generateRelationProcedures(model);
            if (relProcedures) {
                procedures = procedures + (procedures ? ",\n\n" : "") + relProcedures;
            }
        }
        const routerComment = model.isView
            ? `${modelName} router — read-only (database view)`
            : `${modelName} router with comprehensive CRUD operations`;
        sourceFile.addStatements(`
/**
 * ${routerComment}
 * Generated with strong type safety
 */
const ${routerName}Procedures = {
${procedures}
};
// Export procedures directly instead of wrapping in or.router() for OpenAPIHandler compatibility
export const ${routerName}Router = ${routerName}Procedures;
export type ${modelName}Router = typeof ${routerName}Router;
export { ${routerName}Procedures };
`);
    }
    generateRelationProcedures(model) {
        const modelName = model.name;
        const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        const relFields = model.fields.filter((f) => f.relationName && f.kind === "object");
        if (!relFields.length)
            return "";
        return relFields
            .map((field) => {
            const relName = field.name;
            const procedureName = `${modelVar}${this.capitalize(relName)}`;
            return `  /**
   * ${procedureName} - relation resolver for ${modelName}.${relName}
   */
  ${procedureName}: publicProcedure
    .handler(async (opt: import('@orpc/server').ProcedureHandlerOptions<Context, unknown, any, any>) => {
      const { input, context } = opt;
      const id = (input as any)?.id;
      const related = await context.prisma.${modelVar}.findUnique({
        where: { id }
      }).${relName}();
      return related;
    })`;
        })
            .join(",\n\n");
    }
    capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
    async generateModelProcedures(model, modelOperations) {
        const modelName = model.name;
        const operations = modelOperations.find((op) => op.model === modelName);
        if (!operations)
            return "";
        const procedures = [];
        const generatedOperations = new Set();
        const essentialOperations = model.isView
            ? ["findMany", "findFirst", "count"]
            : ["create", "findMany", "findUnique", "update", "delete", "count"];
        for (const [opType, opName] of Object.entries(operations)) {
            if (opType === "model")
                continue;
            const baseOpType = opType.replace("OrThrow", "").replace(/One$/, "");
            if (generatedOperations.has(baseOpType))
                continue;
            if (model.isView && !(0, operation_utils_1.isReadOnlyOperation)(baseOpType))
                continue;
            if ((0, operation_utils_1.shouldGenerateOperation)(baseOpType, this.config)) {
                const procedureCode = await this.generateSingleProcedure(modelName, opName, opType, baseOpType, model);
                procedures.push(procedureCode);
                generatedOperations.add(baseOpType);
            }
        }
        for (const essentialOp of essentialOperations) {
            if (!generatedOperations.has(essentialOp) &&
                (0, operation_utils_1.shouldGenerateOperation)(essentialOp, this.config)) {
                const procedureCode = await this.generateSingleProcedure(modelName, essentialOp, essentialOp, essentialOp, model);
                procedures.push(procedureCode);
                generatedOperations.add(essentialOp);
            }
        }
        return procedures.join(",\n\n");
    }
    async generateSingleProcedure(modelName, operationName, opType, baseOpType, model) {
        const procedureName = this.getProcedureName(baseOpType, modelName);
        const inputType = (0, operation_utils_1.getInputTypeByOpName)(baseOpType, modelName);
        const outputType = (0, operation_utils_1.getOutputTypeByOpName)(baseOpType, modelName);
        const procedureType = this.getProcedureType(baseOpType, model);
        const exposedName = (0, operation_utils_1.getExposedName)(baseOpType);
        const _routePath = `/${modelName.toLowerCase()}/${exposedName}`;
        return (0, code_generation_utils_1.generateProcedureCode)({
            name: procedureName,
            operationName,
            inputType,
            outputType,
            procedureType,
            openApiRoute: null,
            modelName,
            opType,
            baseOpType,
            model,
            config: this.config,
        });
    }
    getProcedureName(baseOpType, modelName) {
        const prefix = this.config.showModelNameInProcedure
            ? modelName.charAt(0).toLowerCase() + modelName.slice(1)
            : "";
        const operation = (0, operation_utils_1.getExposedName)(baseOpType);
        return prefix
            ? `${prefix}${operation.charAt(0).toUpperCase()}${operation.slice(1)}`
            : operation;
    }
    getProcedureType(baseOpType, model) {
        if (model?.documentation) {
            const match = model.documentation.match(/@orpc\.public\s+([\w,\s]+)/);
            if (match) {
                const publicOps = match[1].split(",").map((s) => s.trim().toLowerCase());
                if (publicOps.includes(baseOpType.toLowerCase())) {
                    return "public";
                }
            }
        }
        return "protected";
    }
}
exports.ModelRouterGenerator = ModelRouterGenerator;
//# sourceMappingURL=model-router-generator.js.map