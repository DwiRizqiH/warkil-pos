import { beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hashSecret } from '../services/auth.js';
import { resetDb } from '../test/db.js';
import { createLoginLimiter } from './auth.js';

const app = createApp();
const PIN = '1234';
const cookieOf = (res) => res.headers['set-cookie']?.[0] ?? '';
let cashierId = '';

beforeEach(async () => {
  await resetDb();
  const cashier = await prisma.user.create({
    data: { role: 'CASHIER', name: 'Siti Rahma', pinHash: await hashSecret(PIN) },
  });
  cashierId = cashier.id;
  await prisma.user.create({
    data: { role: 'OWNER', name: 'Pemilik', username: 'owner', passwordHash: await hashSecret('rahasia123') },
  });
});

describe('login kasir', () => {
  it('menerima PIN yang benar, lalu memasang cookie httpOnly', async () => {
    const res = await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: PIN });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Siti Rahma');
    expect(res.body.data.user).not.toHaveProperty('pinHash');
    const cookie = cookieOf(res);
    expect(cookie).toContain('wk_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('membuka shift saat login', async () => {
    await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: PIN });
    expect(await prisma.shift.count({ where: { cashierId, endedAt: null } })).toBe(1);
  });

  it('menolak PIN salah', async () => {
    const res = await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: '9999' });
    expect(res.status).toBe(401);
  });

  it('mengunci setelah 5 percobaan gagal, dan tetap menolak PIN yang benar', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: '9999' });
    }
    const correct = await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: PIN });
    expect(correct.status).toBe(423);
    expect(correct.body.error.code).toBe('LOCKED');
  });

  it('mereset hitungan gagal setelah PIN yang benar', async () => {
    await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: '9999' });
    await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: PIN });
    const cashier = await prisma.user.findUniqueOrThrow({ where: { id: cashierId } });
    expect(cashier.failedPinCount).toBe(0);
  });

  it('menolak kasir nonaktif', async () => {
    await prisma.user.update({ where: { id: cashierId }, data: { isActive: false } });
    const res = await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: PIN });
    expect(res.status).toBe(401);
  });

  it('menolak PIN yang bukan 4 digit sebelum menyentuh database', async () => {
    const res = await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: 'abcd' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });
});

describe('login pemilik', () => {
  it('menerima username dan password yang benar', async () => {
    const res = await request(app).post('/api/auth/owner/login').send({ username: 'owner', password: 'rahasia123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('OWNER');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('menolak password salah', async () => {
    const res = await request(app).post('/api/auth/owner/login').send({ username: 'owner', password: 'salah' });
    expect(res.status).toBe(401);
  });
});

describe('sesi', () => {
  it('GET /api/auth/me mengembalikan sesi dari cookie', async () => {
    const login = await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: PIN });
    const res = await request(app).get('/api/auth/me').set('Cookie', cookieOf(login));
    expect(res.body.data.user.name).toBe('Siti Rahma');
    expect(res.body.data.shiftId).toBeTruthy();
  });

  it('menolak request tanpa cookie', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('menutup shift saat logout dan menghapus cookie', async () => {
    const login = await request(app).post('/api/auth/cashier/login').send({ cashierId, pin: PIN });
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookieOf(login));
    expect(res.status).toBe(204);
    expect(await prisma.shift.count({ where: { cashierId, endedAt: null } })).toBe(0);
    expect(cookieOf(res)).toContain('wk_session=;');
  });

  it('menolak cookie yang ditandatangani kunci lain', async () => {
    const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6Ik9XTkVSIn0.zzzz';
    const res = await request(app).get('/api/auth/me').set('Cookie', `wk_session=${forged}`);
    expect(res.status).toBe(401);
  });
});

describe('pembatas percobaan login', () => {
  it('membalas 429 setelah batas terlampaui', async () => {
    const probe = express();
    probe.post('/x', createLoginLimiter(2), (_req, res) => res.json({ ok: true }));
    expect((await request(probe).post('/x')).status).toBe(200);
    expect((await request(probe).post('/x')).status).toBe(200);
    const blocked = await request(probe).post('/x');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});
