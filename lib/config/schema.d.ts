/**
 * Zod schema defining configuration options for the oRPC generator.
 *
 * Validates inputs for customizing ORPC routers in scala-hub, including Zod integration
 * and model actions exposed as AI-executable procedures.
 */
import { z } from 'zod';
declare const SchemaLibrary: {
    readonly zod: "zod";
};
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
export declare const configSchema: z.ZodObject<{
    output: z.ZodDefault<z.ZodString>;
    contextPath: z.ZodDefault<z.ZodString>;
    schemaLibrary: z.ZodDefault<z.ZodEnum<{
        readonly zod: "zod";
    }>>;
    generateInputValidation: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    generateOutputValidation: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    strictValidation: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    zodSchemasOutputPath: z.ZodDefault<z.ZodString>;
    externalZodImportPath: z.ZodDefault<z.ZodString>;
    zodDateTimeStrategy: z.ZodDefault<z.ZodEnum<{
        date: "date";
        coerce: "coerce";
        isoString: "isoString";
    }>>;
    zodConfigPath: z.ZodOptional<z.ZodString>;
    apiTitle: z.ZodDefault<z.ZodString>;
    apiDescription: z.ZodDefault<z.ZodString>;
    apiVersion: z.ZodDefault<z.ZodString>;
    serverPort: z.ZodDefault<z.ZodPipe<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>, z.ZodTransform<number, string | number>>, z.ZodNumber>>;
    apiPrefix: z.ZodDefault<z.ZodString>;
    generateModelActions: z.ZodDefault<z.ZodPipe<z.ZodPipe<z.ZodPipe<z.ZodUnion<readonly [z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>, z.ZodString]>, z.ZodTransform<unknown[], string | unknown[]>>, z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>, z.ZodTransform<string[], unknown[]>>>;
    showModelNameInProcedure: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    enableSoftDeletes: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    generateRelationResolvers: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    generateDocumentation: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    generateTests: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    enableDebugLogging: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    useBarrelExports: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    codeStyle: z.ZodDefault<z.ZodEnum<{
        prettier: "prettier";
        none: "none";
    }>>;
    wrapResponses: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    generateErrorHandling: z.ZodDefault<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<any, "true" | "false">>>;
    prismaClientPath: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type Config = z.infer<typeof configSchema>;
export declare const defaultConfigs: {
    readonly basic: {};
    readonly production: {};
    readonly serverless: {};
    readonly enterprise: {
        readonly generateTests: "true";
    };
};
export { ModelAction, SchemaLibrary };
//# sourceMappingURL=schema.d.ts.map