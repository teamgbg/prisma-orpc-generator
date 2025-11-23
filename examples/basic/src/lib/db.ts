import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const dbUrl = `file:${path.join(process.cwd(), 'dev.db').replace(/\\/g, '/')}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });

export const prisma = new PrismaClient({
  adapter,
  log: ['query', 'error', 'warn']
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
