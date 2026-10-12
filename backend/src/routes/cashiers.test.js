import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hashSecret } from '../services/auth.js';
import { resetDb } from '../test/db.js';

const app = createApp();
const cookieOf = (res) => res.headers['set-cookie'][0];
let ownerCookie = '';
let cashierId = '';

beforeEach(async () => {
  await resetDb();
  await prisma.user.create({
    data: { role: 'OWNER', name: 'Pemilik', username: 'owner', passwordHash: await hashSecret('rahasia123') },
  });
  const cashier = await prisma.user.create({
    data: { role: 'CASHIER', name: 'Siti Rahma', pinHash: await hashSecret('1234') },
  });
  cashierId = cashier.id;
  const login = await request(app).post('/api/auth/owner/login').send({ username: 'owner', password: 'rahasia123' });
  ownerCookie = cookieOf(login);
});

describe('GET /api/auth/cashiers', () => {
  it('hanya membuka id dan nama kasir aktif, tanpa login', async () => {
    await prisma.user.create({ data: { role: 'CASHIER', name: 'Nonaktif', pinHash: await hashSecret('1234'), isActive: false } });
    const res = await request(app).get('/api/auth/cashiers');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: cashierId, name: 'Siti Rahma' }]);
  });
});

describe('manajemen kasir', () => {
  it('menolak akses tanpa login', async () => {
    expect((await request(app).get('/api/cashiers')).status).toBe(401);
  });

  it('menolak kasir yang membuka daftar kasir', async () => {
    const login = await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: '1234' });
    const res = await request(app).get('/api/cashiers').set('Cookie', cookieOf(login));
    expect(res.status).toBe(403);
  });

  it('membuat kasir baru dengan PIN yang di-hash', async () => {
    const res = await request(app).post('/api/cashiers').set('Cookie', ownerCookie).send({ name: 'Budi Santoso', pin: '5678' });
    expect(res.status).toBe(201);
    const created = await prisma.user.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(created.pinHash).not.toBe('5678');
    expect(res.body.data).not.toHaveProperty('pinHash');
  });

  it('menolak nama kasir yang sudah dipakai', async () => {
    const res = await request(app)
      .post('/api/cashiers')
      .set('Cookie', ownerCookie)
      .send({ name: 'Siti Rahma', pin: '5678' });
    expect(res.status).toBe(409);
  });

  it('mengganti nama dan menonaktifkan kasir tanpa menghapus riwayatnya', async () => {
    const res = await request(app)
      .patch(`/api/cashiers/${cashierId}`)
      .set('Cookie', ownerCookie)
      .send({ name: 'Siti Rahmawati', isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Siti Rahmawati');
    expect(res.body.data.isActive).toBe(false);
    expect(await prisma.user.count({ where: { id: cashierId } })).toBe(1);
  });

  it('menolak perubahan kasir yang tidak ada', async () => {
    const res = await request(app).patch('/api/cashiers/tidak-ada').set('Cookie', ownerCookie).send({ isActive: false });
    expect(res.status).toBe(404);
  });

  it('mengganti PIN kasir dan membuka kuncinya', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: '9999' });
    }
    const res = await request(app).post(`/api/cashiers/${cashierId}/pin`).set('Cookie', ownerCookie).send({ pin: '4321' });
    expect(res.status).toBe(204);
    expect((await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: '4321' })).status).toBe(200);
    expect((await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: '1234' })).status).toBe(401);
  });
});
