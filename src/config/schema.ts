/**
 * Configuration options for the oRPC generator.
 *
 * Validates inputs for customizing ORPC routers in scala-hub.
 * Parsed from Prisma generator config (Record<string, string | string[]>).
 */

// Enhanced model actions
const ModelAction = {
	// Basic CRUD
	create: "create",
	createMany: "createMany",
	findFirst: "findFirst",
	findFirstOrThrow: "findFirstOrThrow",
	findMany: "findMany",
	findUnique: "findUnique",
	findUniqueOrThrow: "findUniqueOrThrow",
	update: "update",
	updateMany: "updateMany",
	upsert: "upsert",
	delete: "delete",
	deleteMany: "deleteMany",

	// Advanced operations
	aggregate: "aggregate",
	groupBy: "groupBy",
	count: "count",
	findRaw: "findRaw",
	aggregateRaw: "aggregateRaw",
} as const;

export interface Config {
	output: string;
	contextPath: string;
	generateInputValidation: boolean;
	generateOutputValidation: boolean;
	strictValidation: boolean;
	apiTitle: string;
	apiDescription: string;
	apiVersion: string;
	serverPort: number;
	apiPrefix: string;
	generateModelActions: string[];
	showModelNameInProcedure: boolean;
	enableSoftDeletes: boolean;
	generateRelationResolvers: boolean;
	generateDocumentation: boolean;
	generateTests: boolean;
	enableDebugLogging: boolean;
	useBarrelExports: boolean;
	codeStyle: "prettier" | "none";
	wrapResponses: boolean;
	generateErrorHandling: boolean;
	prismaClientPath: string;
	/** Enable generation of ORPC routers for fn_* PostgreSQL functions (requires DATABASE_URL) */
	generatePgFunctions: boolean;
	/** Prefix filter for PG functions to include (default: "fn_") */
	pgFunctionPrefix: string;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
	if (value === undefined) return defaultValue;
	return value === "true";
}

function parseNumber(value: string | undefined, defaultValue: number): number {
	if (value === undefined) return defaultValue;
	const n = parseInt(value, 10);
	return isNaN(n) ? defaultValue : n;
}

function parseArray(value: string | string[] | undefined, defaultValue: string[]): string[] {
	if (value === undefined) return defaultValue;
	if (Array.isArray(value)) return value;
	return value.split(",").map((s) => s.trim());
}

function parseString(value: string | undefined, defaultValue: string): string {
	return value ?? defaultValue;
}

function parseEnum<T extends string>(
	value: string | undefined,
	allowed: readonly T[],
	defaultValue: T,
): T {
	if (value === undefined) return defaultValue;
	return allowed.includes(value as T) ? (value as T) : defaultValue;
}

const allModelActions = Object.values(ModelAction) as readonly string[];

export function parseConfig(raw: Record<string, string | string[]>): Config {
	const modelActions = parseArray(raw.generateModelActions, [...allModelActions]).filter((a) =>
		allModelActions.includes(a),
	);

	return {
		output: parseString(raw.output as string, "./src/generated/orpc"),
		contextPath: parseString(raw.contextPath as string, ""),
		generateInputValidation: parseBoolean(raw.generateInputValidation as string, true),
		generateOutputValidation: parseBoolean(raw.generateOutputValidation as string, true),
		strictValidation: parseBoolean(raw.strictValidation as string, true),
		apiTitle: parseString(raw.apiTitle as string, "Generated API"),
		apiDescription: parseString(
			raw.apiDescription as string,
			"Auto-generated API from Prisma schema",
		),
		apiVersion: parseString(raw.apiVersion as string, "1.0.0"),
		serverPort: parseNumber(raw.serverPort as string, 3000),
		apiPrefix: parseString(raw.apiPrefix as string, ""),
		generateModelActions: modelActions,
		showModelNameInProcedure: parseBoolean(raw.showModelNameInProcedure as string, true),
		enableSoftDeletes: parseBoolean(raw.enableSoftDeletes as string, false),
		generateRelationResolvers: parseBoolean(raw.generateRelationResolvers as string, true),
		generateDocumentation: parseBoolean(raw.generateDocumentation as string, false),
		generateTests: parseBoolean(raw.generateTests as string, false),
		enableDebugLogging: parseBoolean(raw.enableDebugLogging as string, false),
		useBarrelExports: parseBoolean(raw.useBarrelExports as string, true),
		codeStyle: parseEnum(raw.codeStyle as string, ["prettier", "none"] as const, "prettier"),
		wrapResponses: parseBoolean(raw.wrapResponses as string, false),
		generateErrorHandling: parseBoolean(raw.generateErrorHandling as string, true),
		prismaClientPath: parseString(raw.prismaClientPath as string, "@prisma/client"),
		generatePgFunctions: parseBoolean(raw.generatePgFunctions as string, true),
		pgFunctionPrefix: parseString(raw.pgFunctionPrefix as string, "fn_"),
	};
}

// Default configuration for different scenarios
export const defaultConfigs = {
	basic: {},

	production: {},

	serverless: {},

	enterprise: {
		generateTests: "true",
	},
} as const;

export { ModelAction };
