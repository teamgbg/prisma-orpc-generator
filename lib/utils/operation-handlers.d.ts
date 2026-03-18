/**
 * Generators for Prisma operation handler bodies in ORPC procedures.
 *
 * Applies org-scoping and soft-delete logic via shared helpers for CRUD, aggregate, and groupBy
 * operations in generated routers powering scala-hub's AI tools.
 */
interface CodeGenField {
    name: string;
    type: string;
    isId?: boolean;
    isOptional?: boolean;
    hasDefaultValue?: boolean;
    isUpdatedAt?: boolean;
    relationName?: string;
    kind?: string;
    isList?: boolean;
}
export interface CodeGenModel {
    name: string;
    fields: CodeGenField[];
}
export interface HandlerContext {
    modelName: string;
    modelVar: string;
    isOrgScoped: boolean;
    hasSoftDelete: boolean;
}
export declare function generateFindMany(ctx: HandlerContext): string;
export declare function generateFindFirst(ctx: HandlerContext): string;
export declare function generateFindById(ctx: HandlerContext): string;
export declare function generateCreate(ctx: HandlerContext): string;
export declare function generateCreateMany(ctx: HandlerContext): string;
export declare function generateUpdate(ctx: HandlerContext): string;
export declare function generateUpdateMany(ctx: HandlerContext): string;
export declare function generateDelete(ctx: HandlerContext): string;
export declare function generateDeleteMany(ctx: HandlerContext): string;
export declare function generateUpsert(ctx: HandlerContext): string;
export declare function generateCount(ctx: HandlerContext): string;
export declare function generateAggregate(ctx: HandlerContext): string;
export declare function generateGroupBy(ctx: HandlerContext, model: CodeGenModel): string;
export {};
//# sourceMappingURL=operation-handlers.d.ts.map