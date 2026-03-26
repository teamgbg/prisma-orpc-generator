/**
 * Generates tool-manifest.json alongside ORPC routers.
 *
 * The manifest is the contract between prisma-orpc-generator and scala-ai-tool-generator.
 * It describes each model's fields, scoping, procedures, and annotations so that
 * the tool generator reads ORPC metadata instead of raw Postgres introspection.
 */

import type { Config } from "../config/schema";
import type { PrismaModel, PrismaField } from "../types/generator-types";
import type { PgFunction } from "../utils/pg-function-introspector";

// ---------------------------------------------------------------------------
// Manifest types
// ---------------------------------------------------------------------------

export interface ManifestField {
	name: string;
	type: string;
	kind: string;
	isId: boolean;
	isOptional: boolean;
	isList: boolean;
	hasDefault: boolean;
	isReadOnly: boolean;
	isUpdatedAt: boolean;
}

export interface ManifestModel {
	fields: ManifestField[];
	isOrgScoped: boolean;
	hasSoftDelete: boolean;
	isView: boolean;
	documentation: string | null;
	publicProcedures: string[];
	procedures: string[];
}

export interface ManifestFunctionParam {
	name: string;
	type: string;
	tsType: string;
	hasDefault: boolean;
}

export interface ManifestFunction {
	params: ManifestFunctionParam[];
	returnType: string;
	returnTsType: string;
	isOrgScoped: boolean;
	isUserScoped: boolean;
	volatility: string;
	hasOptionalParams: boolean;
	procedures: string[];
}

export interface ToolManifest {
	version: number;
	generatedAt: string;
	models: Record<string, ManifestModel>;
	functions: Record<string, ManifestFunction>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function convertField(field: PrismaField): ManifestField | null {
	// Skip relation fields — they're not columns
	if (field.kind === "object" || field.relationName) return null;

	return {
		name: field.name,
		type: field.type,
		kind: field.kind,
		isId: field.isId,
		isOptional: field.isOptional,
		isList: field.isList,
		hasDefault: field.hasDefaultValue ?? false,
		isReadOnly: field.isReadOnly,
		isUpdatedAt: field.isUpdatedAt ?? false,
	};
}

/**
 * Parse @orpc.public annotations from model documentation.
 * Format: `/// @orpc.public findMany, findFirst`
 */
function parsePublicProcedures(documentation?: string): string[] {
	if (!documentation) return [];

	const match = documentation.match(/@orpc\.public\s+(.+)/);
	if (!match) return [];

	return match[1]
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export function generateToolManifest(
	models: PrismaModel[],
	config: Config,
	functions: PgFunction[] = [],
): ToolManifest {
	const manifest: ToolManifest = {
		version: 2,
		generatedAt: new Date().toISOString(),
		models: {},
		functions: {},
	};

	for (const model of models) {
		// Skip views — they don't get CRUD procedures
		const isView = model.isView ?? false;

		// Convert fields, filtering out relations
		const fields = model.fields
			.map(convertField)
			.filter((f): f is ManifestField => f !== null);

		// Determine scoping from field presence
		const isOrgScoped = fields.some((f) => f.name === "organisation_id");
		const hasSoftDelete =
			(config.enableSoftDeletes || fields.some((f) => f.name === "deletedAt")) &&
			fields.some((f) => f.name === "deletedAt");

		// Parse public procedure annotations
		const publicProcedures = parsePublicProcedures(model.documentation);

		// Available procedures from config (views only get read operations)
		let procedures = [...config.generateModelActions];
		if (isView) {
			procedures = procedures.filter((p) =>
				["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"].includes(p),
			);
		}

		manifest.models[model.name] = {
			fields,
			isOrgScoped,
			hasSoftDelete,
			isView,
			documentation: model.documentation ?? null,
			publicProcedures,
			procedures,
		};
	}

	// Add PG functions to manifest
	for (const fn of functions) {
		manifest.functions[fn.name] = {
			params: fn.params.map((p) => ({
				name: p.name,
				type: p.type,
				tsType: p.tsType,
				hasDefault: p.hasDefault,
			})),
			returnType: fn.returnType,
			returnTsType: fn.returnTsType,
			isOrgScoped: fn.isOrgScoped,
			isUserScoped: fn.isUserScoped,
			volatility: fn.volatility,
			hasOptionalParams: fn.hasOptionalParams,
			procedures: ["call"],
		};
	}

	return manifest;
}
