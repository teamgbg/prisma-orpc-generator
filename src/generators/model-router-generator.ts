/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates individual model router files with CRUD procedures and relation resolvers.
 */

import path from "node:path";
import pluralize from "pluralize";
import type { SourceFile } from "ts-morph";

import type { Config } from "../config/schema";
import type { PrismaField, PrismaModel } from "../types/generator-types";
import { AUTOGEN_HEADER } from "../utils/autogen-header";
import { generateProcedureCode } from "../utils/code-generation-utils";
import type { Logger } from "../utils/logger";
import {
	getExposedName,
	getInputTypeByOpName,
	getOutputTypeByOpName,
	isReadOnlyOperation,
	shouldGenerateOperation,
} from "../utils/operation-utils";
import type { ProjectManager } from "../utils/project-manager";

export class ModelRouterGenerator {
	constructor(
		private config: Config,
		private outputDir: string,
		private projectManager: ProjectManager,
		private logger: Logger,
	) {}

	private isEnabled(value: unknown): boolean {
		return value === true || value === "true";
	}

	async generate(model: PrismaModel, modelOperations: unknown[]): Promise<void> {
		const modelName = model.name;

		this.logger.debug(`Generating router for model: ${modelName}`);

		const modelRouter = this.projectManager.createSourceFile(
			path.resolve(this.outputDir, "routers", "models", `${modelName}.router.ts`),
			undefined,
			{ overwrite: true },
		);

		await this.generateModelRouterContent(modelRouter, model, modelOperations);

		modelRouter.insertText(0, AUTOGEN_HEADER);
		modelRouter.formatText({ indentSize: 2 });
		this.logger.debug(`Router generated for model: ${modelName}`);
	}

	private async generateModelRouterContent(
		sourceFile: SourceFile,
		model: PrismaModel,
		modelOperations: unknown[],
	): Promise<void> {
		const modelName = model.name;
		const routerName = pluralize(modelName.toLowerCase());

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

	private generateRelationProcedures(model: PrismaModel): string {
		const modelName = model.name;
		const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
		const relFields = model.fields.filter(
			(f: PrismaField) => f.relationName && f.kind === "object",
		);
		if (!relFields.length) return "";

		return relFields
			.map((field: PrismaField) => {
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

	private capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	private async generateModelProcedures(
		model: PrismaModel,
		modelOperations: unknown[],
	): Promise<string> {
		const modelName = model.name;
		const operations = modelOperations.find(
			(op: unknown) => (op as { model?: string }).model === modelName,
		);

		if (!operations) return "";

		const procedures: string[] = [];
		const generatedOperations = new Set<string>();

		const essentialOperations = model.isView
			? ["findMany", "findFirst", "count"]
			: ["create", "findMany", "findUnique", "update", "delete", "count"];

		for (const [opType, opName] of Object.entries(operations)) {
			if (opType === "model") continue;

			const baseOpType = opType.replace("OrThrow", "").replace(/One$/, "");

			if (generatedOperations.has(baseOpType)) continue;

			if (model.isView && !isReadOnlyOperation(baseOpType)) continue;

			if (shouldGenerateOperation(baseOpType, this.config)) {
				const procedureCode = await this.generateSingleProcedure(
					modelName,
					opName as string,
					opType,
					baseOpType,
					model,
				);
				procedures.push(procedureCode);
				generatedOperations.add(baseOpType);
			}
		}

		for (const essentialOp of essentialOperations) {
			if (
				!generatedOperations.has(essentialOp) &&
				shouldGenerateOperation(essentialOp, this.config)
			) {
				const procedureCode = await this.generateSingleProcedure(
					modelName,
					essentialOp,
					essentialOp,
					essentialOp,
					model,
				);
				procedures.push(procedureCode);
				generatedOperations.add(essentialOp);
			}
		}

		return procedures.join(",\n\n");
	}

	private async generateSingleProcedure(
		modelName: string,
		operationName: string,
		opType: string,
		baseOpType: string,
		model: PrismaModel,
	): Promise<string> {
		const procedureName = this.getProcedureName(baseOpType, modelName);
		const inputType = getInputTypeByOpName(baseOpType, modelName);
		const outputType = getOutputTypeByOpName(baseOpType, modelName);

		const procedureType = this.getProcedureType(baseOpType, model);

		const exposedName = getExposedName(baseOpType);
		const _routePath = `/${modelName.toLowerCase()}/${exposedName}`;

		return generateProcedureCode({
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

	private getProcedureName(baseOpType: string, modelName: string): string {
		const prefix = this.config.showModelNameInProcedure
			? modelName.charAt(0).toLowerCase() + modelName.slice(1)
			: "";

		const operation = getExposedName(baseOpType);
		return prefix
			? `${prefix}${operation.charAt(0).toUpperCase()}${operation.slice(1)}`
			: operation;
	}

	private getProcedureType(baseOpType: string, model?: PrismaModel): "public" | "protected" {
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
