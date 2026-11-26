import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hashSecret } from '../services/auth.js';
import { resetDb } from '../test/db.js';

const app = createApp();
const cookieOf = (res) => res.headers['set-cookie'][0];

let ownerCookie = '';
let cashierCookie = '';

async function login() {
  await prisma.user.create({
    data: { role: 'OWNER', name: 'Pemilik', username: 'owner', passwordHash: await hashSecret('rahasia123') },
  });
  const cashier = await prisma.user.create({
    data: { role: 'CASHIER', name: 'Siti Rahma', pinHash: await hashSecret('1234') },
  });
  ownerCookie = cookieOf(await request(app).post('/api/auth/owner/login').send({ username: 'owner', password: 'rahasia123' }));
  cashierCookie = cookieOf(
    await request(app).post('/api/auth/cashier/login').send({ cashierId: cashier.id, pin: '1234' })
  );
}

beforeEach(async () => {
  await resetDb();
  await prisma.category.create({ data: { id: 'makanan', name: 'Makanan', sortOrder: 0 } });
  await prisma.menu.create({ data: { id: 'm1', categoryId: 'makanan', name: 'Nasi Kikil + Empal', price: 20000 } });
  await login();
});

describe('GET /api/menus', () => {
  it('mengembalikan kategori dan menu dalam bentuk yang dipakai frontend', async () => {
    const res = await request(app).get('/api/menus').set('Cookie', cashierCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.categories).toEqual([{ id: 'makanan', name: 'Makanan', isBundle: false }]);
    expect(res.body.data.menus[0]).toMatchObject({
      id: 'm1',
      name: 'Nasi Kikil + Empal',
      cat: 'makanan',
      price: 20000,
      isBundle: false,
    });
  });

  it('menolak permintaan tanpa sesi', async () => {
    expect((await request(app).get('/api/menus')).status).toBe(401);
  });
});

describe('menu pemilik', () => {
  const plain = { name: 'Es Teh', cat: 'makanan', emoji: '🧋', price: 2000 };

  it('membuat menu dan langsung masuk katalog', async () => {
    const res = await request(app).post('/api/menus').set('Cookie', ownerCookie).send(plain);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Es Teh', cat: 'makanan', price: 2000 });
    expect(await prisma.menu.count({ where: { name: 'Es Teh', deletedAt: null } })).toBe(1);
  });

  it('hanya pemilik yang boleh mengubah menu', async () => {
    const res = await request(app).post('/api/menus').set('Cookie', cashierCookie).send(plain);
    expect(res.status).toBe(403);
  });

  it('menolak harga nol atau negatif', async () => {
    const res = await request(app).post('/api/menus').set('Cookie', ownerCookie).send({ ...plain, price: 0 });
    expect(res.status).toBe(400);
  });

  it('memperbarui harga menu', async () => {
    const res = await request(app).patch('/api/menus/m1').set('Cookie', ownerCookie).send({ price: 21000 });
    expect(res.status).toBe(200);
    expect((await prisma.menu.findUniqueOrThrow({ where: { id: 'm1' } })).price).toBe(21000);
  });

  it('menghapus menu secara lunak sehingga hilang dari katalog', async () => {
    const res = await request(app).delete('/api/menus/m1').set('Cookie', ownerCookie);
    expect(res.status).toBe(204);
    const list = await request(app).get('/api/menus').set('Cookie', cashierCookie);
    expect(list.body.data.menus).toEqual([]);
    expect((await prisma.menu.findUniqueOrThrow({ where: { id: 'm1' } })).deletedAt).not.toBeNull();
  });

  it('menyimpan paket beserta komponen dan diskonnya', async () => {
    await prisma.category.create({ data: { id: 'paket', name: 'Paket', sortOrder: 1, isBundle: true } });
    const res = await request(app)
      .post('/api/menus')
      .set('Cookie', ownerCookie)
      .send({ name: 'Paket Hemat', cat: 'paket', emoji: '🎁', discount: 10, items: [{ id: 'm1', qty: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      cat: 'paket',
      isBundle: true,
      discount: 10,
      items: [{ id: 'm1', qty: 2 }],
    });
    expect(res.body.data.price).toBeUndefined();
  });

  it('menolak paket tanpa isi', async () => {
    await prisma.category.create({ data: { id: 'paket', name: 'Paket', sortOrder: 1, isBundle: true } });
    const res = await request(app)
      .post('/api/menus')
      .set('Cookie', ownerCookie)
      .send({ name: 'Paket Kosong', cat: 'paket', items: [] });
    expect(res.status).toBe(400);
  });
});

describe('kategori', () => {
  it('membuat kategori paket lalu paket di dalamnya', async () => {
    const category = await request(app)
      .post('/api/categories')
      .set('Cookie', ownerCookie)
      .send({ name: 'Paket', isBundle: true });
    expect(category.status).toBe(201);
    expect(category.body.data.isBundle).toBe(true);

    const menu = await request(app)
      .post('/api/menus')
      .set('Cookie', ownerCookie)
      .send({ name: 'Paket Hemat', cat: category.body.data.id, items: [{ id: 'm1', qty: 2 }] });

    expect(menu.status).toBe(201);
    expect(menu.body.data).toMatchObject({ isBundle: true, items: [{ id: 'm1', qty: 2 }] });
  });

  it('membuat, mengganti nama, dan menghapus kategori kosong', async () => {
    const created = await request(app).post('/api/categories').set('Cookie', ownerCookie).send({ name: 'Paket' });
    expect(created.status).toBe(201);

    const renamed = await request(app)
      .patch(`/api/categories/${created.body.data.id}`)
      .set('Cookie', ownerCookie)
      .send({ name: 'Paket Hemat' });
    expect(renamed.body.data.name).toBe('Paket Hemat');

    const removed = await request(app).delete(`/api/categories/${created.body.data.id}`).set('Cookie', ownerCookie);
    expect(removed.status).toBe(204);
  });

  it('menolak menghapus kategori yang masih berisi menu', async () => {
    const res = await request(app).delete('/api/categories/makanan').set('Cookie', ownerCookie);
    expect(res.status).toBe(409);
  });
});
