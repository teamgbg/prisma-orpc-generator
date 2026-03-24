"use strict";
/**
 * Generators for Prisma operation handler bodies in ORPC procedures.
 *
 * Applies org-scoping and soft-delete logic via shared helpers for CRUD, aggregate, and groupBy
 * operations in generated routers powering scala-hub's AI tools.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFindMany = generateFindMany;
exports.generateFindFirst = generateFindFirst;
exports.generateFindById = generateFindById;
exports.generateCreate = generateCreate;
exports.generateCreateMany = generateCreateMany;
exports.generateUpdate = generateUpdate;
exports.generateUpdateMany = generateUpdateMany;
exports.generateDelete = generateDelete;
exports.generateDeleteMany = generateDeleteMany;
exports.generateUpsert = generateUpsert;
exports.generateCount = generateCount;
exports.generateAggregate = generateAggregate;
exports.generateGroupBy = generateGroupBy;
const model_utils_1 = require("./model-utils");
// ─── Shared Helpers (used by generated code at runtime) ──────────────────────
// These are NOT called at generation time. They produce code strings that
// become part of the generated router file.
/**
 * Generate code that injects organisation_id into a where clause.
 * Returns the variable name holding the scoped where object.
 */
function orgScopeWhere(varName, sourceExpr, ctx) {
    if (!ctx.isOrgScoped)
        return "";
    return `
      const ${varName} = { ...${sourceExpr} };
      if (ctx.orgId) {
        (${varName} as any).organisation_id = ctx.orgId;
      }`;
}
/**
 * Generate code that injects deletedAt: null into a where clause.
 */
function softDeleteWhere(whereExpr, ctx) {
    if (!ctx.hasSoftDelete)
        return "";
    return `
      if (!${whereExpr}) ${whereExpr} = {};
      if ((${whereExpr} as any).deletedAt === undefined) (${whereExpr} as any).deletedAt = null;`;
}
/**
 * Generate code that injects organisation_id into an existing where object (in-place).
 */
function orgScopeInPlace(whereExpr, ctx) {
    if (!ctx.isOrgScoped)
        return "";
    return `
      if (ctx.orgId) {
        (${whereExpr} as any).organisation_id = ctx.orgId;
      }`;
}
// ─── Operation Handlers ──────────────────────────────────────────────────────
function generateFindMany(ctx) {
    const { modelName, modelVar } = ctx;
    if (!ctx.isOrgScoped && !ctx.hasSoftDelete) {
        return `
      const result = await ctx.prisma.${modelVar}.findMany((input) as Prisma.${modelName}FindManyArgs);`;
    }
    let code = `
      const queryArgs = { ...input };
      if (!queryArgs.where) queryArgs.where = {};`;
    code += softDeleteWhere("queryArgs.where", ctx);
    code += orgScopeInPlace("queryArgs.where", ctx);
    code += `
      const result = await ctx.prisma.${modelVar}.findMany(queryArgs as Prisma.${modelName}FindManyArgs);`;
    return code;
}
function generateFindFirst(ctx) {
    const { modelName, modelVar } = ctx;
    if (!ctx.isOrgScoped && !ctx.hasSoftDelete) {
        return `
      const result = await ctx.prisma.${modelVar}.findFirst((input) as Prisma.${modelName}FindFirstArgs);`;
    }
    let code = `
      const queryArgs = { ...input };
      if (!queryArgs.where) queryArgs.where = {};`;
    code += softDeleteWhere("queryArgs.where", ctx);
    code += orgScopeInPlace("queryArgs.where", ctx);
    code += `
      const result = await ctx.prisma.${modelVar}.findFirst(queryArgs as Prisma.${modelName}FindFirstArgs);`;
    return code;
}
function generateFindById(ctx) {
    // Always uses findFirst for org-scoped models because Prisma's findUnique
    // only accepts @unique/@id constraint fields. organisation_id is never part
    // of a unique constraint, so adding it to findUnique silently returns null.
    const { modelName, modelVar } = ctx;
    if (!ctx.isOrgScoped && !ctx.hasSoftDelete) {
        return `
      const result = await ctx.prisma.${modelVar}.findUnique((input) as Prisma.${modelName}FindUniqueArgs);`;
    }
    let code = `
      const where = { ...input.where };`;
    code += softDeleteWhere("where", ctx);
    if (ctx.isOrgScoped) {
        code += orgScopeInPlace("where", ctx);
        code += `
      const result = await ctx.prisma.${modelVar}.findFirst({ where } as Prisma.${modelName}FindFirstArgs);`;
    }
    else {
        code += `
      const result = await ctx.prisma.${modelVar}.findUnique({ where } as Prisma.${modelName}FindUniqueArgs);`;
    }
    return code;
}
function generateCreate(ctx) {
    const { modelName, modelVar } = ctx;
    if (!ctx.isOrgScoped) {
        return `
      const result = await ctx.prisma.${modelVar}.create((input) as Prisma.${modelName}CreateArgs);`;
    }
    return `
      const createData = { ...input.data };
      if (ctx.orgId && !createData.organisation_id) {
        createData.organisation_id = ctx.orgId;
      }
      const result = await ctx.prisma.${modelVar}.create({ data: createData } as Prisma.${modelName}CreateArgs);`;
}
function generateCreateMany(ctx) {
    const { modelName, modelVar } = ctx;
    if (!ctx.isOrgScoped) {
        return `
      const result = await ctx.prisma.${modelVar}.createMany((input) as Prisma.${modelName}CreateManyArgs);`;
    }
    return `
      const createManyData = Array.isArray(input.data)
        ? input.data.map((item: any) => {
            if (ctx.orgId && !item.organisation_id) return { ...item, organisation_id: ctx.orgId };
            return item;
          })
        : (() => { const d = { ...input.data }; if (ctx.orgId && !d.organisation_id) d.organisation_id = ctx.orgId; return d; })();
      const result = await ctx.prisma.${modelVar}.createMany({ data: createManyData } as Prisma.${modelName}CreateManyArgs);`;
}
function generateUpdate(ctx) {
    const { modelName, modelVar } = ctx;
    if (!ctx.isOrgScoped) {
        return `
      const result = await ctx.prisma.${modelVar}.update((input) as Prisma.${modelName}UpdateArgs);`;
    }
    return `${orgScopeWhere("updateWhere", "input.where", ctx)}
      const result = await ctx.prisma.${modelVar}.update({ where: updateWhere, data: input.data } as Prisma.${modelName}UpdateArgs);`;
}
function generateUpdateMany(ctx) {
    const { modelName, modelVar } = ctx;
    if (!ctx.isOrgScoped) {
        return `
      const result = await ctx.prisma.${modelVar}.updateMany((input) as Prisma.${modelName}UpdateManyArgs);`;
    }
    return `${orgScopeWhere("updateManyWhere", "(input.where || {})", ctx)}
      const result = await ctx.prisma.${modelVar}.updateMany({ where: updateManyWhere, data: input.data } as Prisma.${modelName}UpdateManyArgs);`;
}
function generateDelete(ctx) {
    const { modelName, modelVar } = ctx;
    // Soft delete: convert to update with deletedAt
    if (ctx.hasSoftDelete) {
        if (!ctx.isOrgScoped) {
            return `
      const result = await ctx.prisma.${modelVar}.update({ where: input.where, data: { deletedAt: new Date() } });`;
        }
        return `${orgScopeWhere("deleteWhere", "input.where", ctx)}
      const result = await ctx.prisma.${modelVar}.update({ where: deleteWhere, data: { deletedAt: new Date() } });`;
    }
    // Hard delete
    if (!ctx.isOrgScoped) {
        return `
      const result = await ctx.prisma.${modelVar}.delete({ where: input.where } as Prisma.${modelName}DeleteArgs);`;
    }
    return `${orgScopeWhere("deleteWhere", "input.where", ctx)}
      const result = await ctx.prisma.${modelVar}.delete({ where: deleteWhere } as Prisma.${modelName}DeleteArgs);`;
}
function generateDeleteMany(ctx) {
    const { modelName, modelVar } = ctx;
    // Soft delete: convert to updateMany with deletedAt
    if (ctx.hasSoftDelete) {
        if (!ctx.isOrgScoped) {
            return `
      const result = await ctx.prisma.${modelVar}.updateMany({ where: input.where, data: { deletedAt: new Date() } });`;
        }
        return `${orgScopeWhere("deleteManyWhere", "(input.where || {})", ctx)}
      const result = await ctx.prisma.${modelVar}.updateMany({ where: deleteManyWhere, data: { deletedAt: new Date() } });`;
    }
    // Hard delete
    if (!ctx.isOrgScoped) {
        return `
      const result = await ctx.prisma.${modelVar}.deleteMany({ where: input.where } as Prisma.${modelName}DeleteManyArgs);`;
    }
    return `${orgScopeWhere("deleteManyWhere", "(input.where || {})", ctx)}
      const result = await ctx.prisma.${modelVar}.deleteMany({ where: deleteManyWhere } as Prisma.${modelName}DeleteManyArgs);`;
}
function generateUpsert(ctx) {
    const { modelName, modelVar } = ctx;
    if (!ctx.isOrgScoped) {
        return `
      const result = await ctx.prisma.${modelVar}.upsert((input) as Prisma.${modelName}UpsertArgs);`;
    }
    return `${orgScopeWhere("upsertWhere", "input.where", ctx)}
      const result = await ctx.prisma.${modelVar}.upsert({
        where: upsertWhere,
        create: (() => { const d = { ...input.create }; if (ctx.orgId && !d.organisation_id) d.organisation_id = ctx.orgId; return d; })(),
        update: input.update,
      } as Prisma.${modelName}UpsertArgs);`;
}
function generateCount(ctx) {
    const { modelName, modelVar } = ctx;
    if (!ctx.isOrgScoped) {
        return `
      const result = await ctx.prisma.${modelVar}.count((input) as Prisma.${modelName}CountArgs);`;
    }
    let code = `
      const countArgs = { ...input };
      if (!countArgs.where) countArgs.where = {};`;
    code += orgScopeInPlace("countArgs.where", ctx);
    code += `
      const result = await ctx.prisma.${modelVar}.count(countArgs as Prisma.${modelName}CountArgs);`;
    return code;
}
function generateAggregate(ctx) {
    const { modelName, modelVar } = ctx;
    let code = `
  const aggArgs: { [k: string]: unknown; _count?: unknown; _avg?: unknown; _sum?: unknown; _min?: unknown; _max?: unknown; where?: unknown } = input ? { ...(input as Record<string, unknown>) } : {};
      if (!aggArgs._count && !aggArgs._avg && !aggArgs._sum && !aggArgs._min && !aggArgs._max) {
        (aggArgs as { [k: string]: unknown })._count = { _all: true };
      }`;
    if (ctx.isOrgScoped) {
        code += `
      if (ctx.orgId) {
        if (!aggArgs.where) aggArgs.where = {};
        (aggArgs.where as any).organisation_id = ctx.orgId;
      }`;
    }
    code += `
      const result = await ctx.prisma.${modelVar}.aggregate(aggArgs as Prisma.${modelName}AggregateArgs);`;
    return code;
}
function generateGroupBy(ctx, model) {
    const { modelName, modelVar } = ctx;
    const aggregations = (0, model_utils_1.getAvailableAggregations)(model);
    let code = `
  type _GroupByArgs = Partial<Prisma.${modelName}GroupByArgs> & { by: Prisma.${modelName}ScalarFieldEnum[] };
      const args: _GroupByArgs = {} as _GroupByArgs;
      if (input?.by) (args as any).by = (input.by as any[]).length ? input.by : ['id'];
      if (input?.where) (args as any).where = input.where as Prisma.${modelName}WhereInput;
      if (input?.orderBy) (args as any).orderBy = input.orderBy as any;
      if (input?.having) (args as any).having = input.having as any;
      if (input?.take) (args as any).take = Math.min(input.take as number, 500);
      if (input?.skip) (args as any).skip = input.skip as number;
      if (((args as any).take || (args as any).skip) && !(args as any).orderBy) { (args as any).orderBy = [{ id: 'asc' }] as any; }`;
    if (aggregations.supportsCount)
        code += `
      if (input?._count) args._count = input._count;`;
    if (aggregations.supportsSum)
        code += `
      if (input?._sum) args._sum = input._sum;`;
    if (aggregations.supportsAvg)
        code += `
      if (input?._avg) args._avg = input._avg;`;
    if (aggregations.supportsMin)
        code += `
      if (input?._min) args._min = input._min;`;
    if (aggregations.supportsMax)
        code += `
      if (input?._max) args._max = input._max;`;
    if (ctx.isOrgScoped) {
        code += `
      if (ctx.orgId) {
        if (!(args as any).where) (args as any).where = {};
        (args.where as any).organisation_id = ctx.orgId;
      }`;
    }
    code += `
  const result = await ctx.prisma.${modelVar}.groupBy(args as any);`;
    return code;
}
//# sourceMappingURL=operation-handlers.js.map