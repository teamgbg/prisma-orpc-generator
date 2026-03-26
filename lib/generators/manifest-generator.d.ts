/**
 * Generates tool-manifest.json alongside ORPC routers.
 *
 * The manifest is the contract between prisma-orpc-generator and scala-ai-tool-generator.
 * It describes each model's fields, scoping, procedures, and annotations so that
 * the tool generator reads ORPC metadata instead of raw Postgres introspection.
 */
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
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
export interface ToolManifest {
    version: number;
    generatedAt: string;
    models: Record<string, ManifestModel>;
}
export declare function generateToolManifest(models: PrismaModel[], config: Config): ToolManifest;
//# sourceMappingURL=manifest-generator.d.ts.map