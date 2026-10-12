import { prisma } from '../lib/prisma.js';

export async function resetDb() {
  const rows = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (rows.length === 0) return;
  const tables = rows.map((row) => `"public"."${row.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

export async function countRows(table) {
  const rows = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${table}"`);
  return rows[0].count;
}
