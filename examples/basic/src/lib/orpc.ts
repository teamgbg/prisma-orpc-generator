import { ORPCError, os } from '@orpc/server';
import type { PrismaClient } from '@prisma/client';

export interface Context {
  prisma: PrismaClient;
  user?: { id: string; roles?: string[] } | undefined;
}

export const or = os.$context<Context>();

export const publicProcedure = or.use(async ({ next, context }) => {
  // ensure prisma is present
  if (!context.prisma) throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'Missing prisma in context' });
  return next({ context });
});

export const protectedProcedure = publicProcedure.use(async ({ next, context }) => {
  if (!context.user) throw new ORPCError('UNAUTHORIZED');
  return next({ context });
});
