import { describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { countRows, resetDb } from './db.js';

describe('test database', () => {
  it('menjalankan migrasi sampai tabel inti ada', async () => {
    await expect(countRows('users')).resolves.toBeGreaterThanOrEqual(0);
    await expect(countRows('orders')).resolves.toBeGreaterThanOrEqual(0);
  });

  it('mengosongkan tabel dan mereset id', async () => {
    await prisma.category.create({ data: { name: 'Uji', sortOrder: 99 } });
    await resetDb();
    expect(await countRows('categories')).toBe(0);
  });
});
