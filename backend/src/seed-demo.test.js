import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from './lib/prisma.js';
import { seedBase } from '../prisma/seed.js';
import { clearOrderHistory, generateDemoHistory, runDemoSeed } from '../prisma/seed-demo.js';
import { resetDb } from './test/db.js';

beforeEach(async () => {
  await resetDb();
  await seedBase();
});

async function withEnv(name, value, run) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

describe('generateDemoHistory', () => {
  it('menolak jalan di production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(generateDemoHistory(5)).rejects.toThrow(/production/i);
    } finally {
      process.env.NODE_ENV = previous;
    }
  }, 30000);

  it('membuat riwayat penjualan dan shift yang saling terhubung', async () => {
    const orders = await generateDemoHistory(30);
    expect(orders).toBeGreaterThan(100);
    expect(await prisma.order.count()).toBe(orders);
    expect(await prisma.payment.count({ where: { status: 'PAID' } })).toBe(orders);
    expect(await prisma.shift.count()).toBeGreaterThan(0);
    expect(await prisma.shift.count({ where: { endedAt: null } })).toBe(0);
  }, 120000);

  it('menghasilkan data yang sama pada dua kali jalan', async () => {
    const first = await generateDemoHistory(10);
    await resetDb();
    await seedBase();
    expect(await generateDemoHistory(10)).toBe(first);
  }, 120000);

  it('menolak jalan di atas database yang sudah berisi pesanan', async () => {
    await generateDemoHistory(3);
    await expect(generateDemoHistory(3)).rejects.toThrow(/pesanan/i);
  }, 120000);

  it('tidak membuat pesanan untuk hari yang belum lewat', async () => {
    await generateDemoHistory(10);
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    expect(await prisma.order.count({ where: { businessDate: { gte: today } } })).toBe(0);
  }, 120000);
});

describe('clearOrderHistory', () => {
  it('mengosongkan pesanan dan shift tanpa menyentuh pengguna dan menu', async () => {
    await generateDemoHistory(5);
    const users = await prisma.user.count();
    const menus = await prisma.menu.count();

    await withEnv('WIPE_CONFIRMED', 'wipe', () => clearOrderHistory());

    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderItem.count()).toBe(0);
    expect(await prisma.payment.count()).toBe(0);
    expect(await prisma.shift.count()).toBe(0);
    expect(await prisma.user.count()).toBe(users);
    expect(await prisma.menu.count()).toBe(menus);
  }, 120000);

  it('menolak menghapus tanpa konfirmasi WIPE_CONFIRMED', async () => {
    await generateDemoHistory(3);

    await withEnv('WIPE_CONFIRMED', undefined, async () => {
      await expect(clearOrderHistory()).rejects.toThrow(/WIPE_CONFIRMED/);
    });

    expect(await prisma.order.count()).toBeGreaterThan(0);
  }, 120000);

  it('mengizinkan riwayat demo dibuat ulang setelah dibersihkan', async () => {
    const first = await generateDemoHistory(5);
    await withEnv('WIPE_CONFIRMED', 'wipe', () => clearOrderHistory());
    expect(await generateDemoHistory(5)).toBe(first);
  }, 120000);
});

describe('runDemoSeed', () => {
  it('menolak reset di production sebelum menghapus apa pun', async () => {
    await generateDemoHistory(3);
    const orders = await prisma.order.count();

    await withEnv('NODE_ENV', 'production', async () => {
      await withEnv('WIPE_CONFIRMED', 'wipe', async () => {
        await expect(runDemoSeed({ days: 3, reset: true })).rejects.toThrow(/production/i);
      });
    });

    expect(await prisma.order.count()).toBe(orders);
  }, 120000);
});
