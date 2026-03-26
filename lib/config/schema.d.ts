/**
 * Configuration options for the oRPC generator.
 *
 * Validates inputs for customizing ORPC routers in scala-hub.
 * Parsed from Prisma generator config (Record<string, string | string[]>).
 */
declare const ModelAction: {
    readonly create: "create";
    readonly createMany: "createMany";
    readonly findFirst: "findFirst";
    readonly findFirstOrThrow: "findFirstOrThrow";
    readonly findMany: "findMany";
    readonly findUnique: "findUnique";
    readonly findUniqueOrThrow: "findUniqueOrThrow";
    readonly update: "update";
    readonly updateMany: "updateMany";
    readonly upsert: "upsert";
    readonly delete: "delete";
    readonly deleteMany: "deleteMany";
    readonly aggregate: "aggregate";
    readonly groupBy: "groupBy";
    readonly count: "count";
    readonly findRaw: "findRaw";
    readonly aggregateRaw: "aggregateRaw";
};
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
export declare function parseConfig(raw: Record<string, string | string[]>): Config;
export declare const defaultConfigs: {
    readonly basic: {};
    readonly production: {};
    readonly serverless: {};
    readonly enterprise: {
        readonly generateTests: "true";
    };
};
export { ModelAction };
//# sourceMappingURL=schema.d.ts.map