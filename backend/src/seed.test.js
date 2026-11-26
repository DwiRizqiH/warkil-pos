import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from './lib/prisma.js';
import { seedBase } from '../prisma/seed.js';
import { resetDb } from './test/db.js';

beforeEach(async () => {
  await resetDb();
});

const plainMenus = { category: { isBundle: false }, deletedAt: null };

describe('seedBase', () => {
  it('mengisi kategori, menu, kasir dan pemilik', async () => {
    await seedBase();
    expect(await prisma.category.count()).toBe(3);
    expect(await prisma.menu.count({ where: plainMenus })).toBe(11);
    expect(await prisma.user.count({ where: { role: 'CASHIER', isActive: true } })).toBe(3);
    expect(await prisma.user.count({ where: { role: 'OWNER' } })).toBe(1);
  });

  it('menyimpan menu asli Warung Kikil Abang', async () => {
    await seedBase();
    const menus = await prisma.menu.findMany({ where: plainMenus, orderBy: { id: 'asc' } });
    expect(menus.filter((menu) => menu.categoryId === 'makanan')).toHaveLength(7);
    expect(menus.find((menu) => menu.id === 'm1')?.name).toBe('Nasi Kikil + Empal');
    expect(menus.find((menu) => menu.id === 'm1')?.price).toBe(20000);
    expect(menus.find((menu) => menu.id === 'd1')?.price).toBe(3000);
    expect(menus.find((menu) => menu.id === 's1')?.price).toBe(1000);
  });

  it('bisa dijalankan dua kali tanpa menggandakan data', async () => {
    await seedBase();
    await seedBase();
    expect(await prisma.menu.count()).toBe(11);
    expect(await prisma.user.count({ where: { role: 'CASHIER' } })).toBe(3);
  });

  it('tidak menimpa nama atau harga yang sudah diubah pemilik', async () => {
    await seedBase();
    await prisma.menu.update({ where: { id: 'd1' }, data: { name: 'Es Teh Manis', price: 2500 } });
    await prisma.category.update({ where: { id: 'minuman' }, data: { name: 'Minuman Dingin' } });

    await seedBase();

    const menu = await prisma.menu.findUniqueOrThrow({ where: { id: 'd1' } });
    expect(menu.name).toBe('Es Teh Manis');
    expect(menu.price).toBe(2500);
    expect((await prisma.category.findUniqueOrThrow({ where: { id: 'minuman' } })).name).toBe('Minuman Dingin');
  });
});
