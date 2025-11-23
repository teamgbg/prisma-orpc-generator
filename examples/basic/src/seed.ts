import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcrypt';

const dbUrl = `file:${path.join(process.cwd(), 'dev.db').replace(/\\/g, '/')}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password', 12);
  const alice = await prisma.user.create({ data: { email: 'alice@example.com', name: 'Alice', password } });
  const bob = await prisma.user.create({ data: { email: 'bob@example.com', name: 'Bob', password } });

  await prisma.post.create({ data: { title: 'Hello World', content: 'First post', published: true, authorId: alice.id } });
  await prisma.post.create({ data: { title: 'Draft', content: 'Work in progress', published: false, authorId: bob.id } });

  console.log('Seeded users and posts');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
