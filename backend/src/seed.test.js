import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from './lib/prisma.js';
import { priceOf } from './services/pricing.js';
import { seedBase } from '../prisma/seed.js';
import { MENU_SEED } from '../prisma/seed-data.js';
import { resetDb } from './test/db.js';

beforeEach(async () => {
  await resetDb();
});

const plainMenus = { category: { isBundle: false }, deletedAt: null };
const bundleMenus = { category: { isBundle: true } };

describe('seedBase', () => {
  it('mengisi kategori, menu, kasir dan pemilik', async () => {
    await seedBase();
    expect(await prisma.category.count()).toBe(4);
    expect(await prisma.menu.count({ where: plainMenus })).toBe(18);
    expect(await prisma.menu.count({ where: bundleMenus })).toBe(3);
    expect(await prisma.user.count({ where: { role: 'CASHIER', isActive: true } })).toBe(3);
    expect(await prisma.user.count({ where: { role: 'OWNER' } })).toBe(1);
  });

  it('menandai kategori paket dan menyimpan diskonnya', async () => {
    await seedBase();
    expect((await prisma.category.findUniqueOrThrow({ where: { id: 'paket' } })).isBundle).toBe(true);
    const bundles = await prisma.menu.findMany({ where: bundleMenus });
    expect(bundles.every((menu) => menu.price === null)).toBe(true);
    expect(bundles.map((menu) => menu.discountPercent).sort((a, b) => a - b)).toEqual([5, 10, 15]);
    expect((await prisma.category.findUniqueOrThrow({ where: { id: 'makanan' } })).isBundle).toBe(false);
  });

  it('menyimpan komponen paket dengan qty dari data mockup', async () => {
    await seedBase();
    const expected = MENU_SEED.filter((menu) => menu.items).reduce((sum, menu) => sum + menu.items.length, 0);
    expect(await prisma.menuComponent.count()).toBe(expected);
  });

  it('bisa dijalankan dua kali tanpa menggandakan data', async () => {
    await seedBase();
    await seedBase();
    expect(await prisma.menu.count()).toBe(21);
    expect(await prisma.menuComponent.count()).toBe(9);
    expect(await prisma.user.count({ where: { role: 'CASHIER' } })).toBe(3);
  });

  it('menghitung harga tiap paket dengan aturan mockup', async () => {
    await seedBase();
    const menus = await prisma.menu.findMany({ include: { components: true, category: true } });
    const byId = new Map(
      menus.map((menu) => [
        menu.id,
        {
          id: menu.id,
          name: menu.name,
          price: menu.price,
          discountPct: menu.discountPercent,
          isBundle: menu.category.isBundle,
          components: menu.components.map((component) => ({ componentId: component.componentId, qty: component.qty })),
        },
      ])
    );
    const bundles = menus.filter((menu) => menu.category.isBundle);
    expect(bundles).toHaveLength(3);
    for (const bundle of bundles) {
      expect(priceOf(bundle.id, byId)).toBeGreaterThan(0);
    }
    expect(priceOf('p2', byId)).toBe(34200);
    expect(priceOf('p3', byId)).toBe(67200);
  });
});
