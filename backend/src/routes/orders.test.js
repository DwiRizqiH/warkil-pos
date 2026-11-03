import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { businessDate } from '../lib/wib.js';
import { hashSecret } from '../services/auth.js';
import { resetDb } from '../test/db.js';

const app = createApp();
const cookieOf = (res) => res.headers['set-cookie'][0];
const body = (items, extra = {}) => ({ orderType: 'dine', payment: 'Cash', receivedAmount: 50000, items, ...extra });

let cashierCookie = '';
let ownerCookie = '';

beforeEach(async () => {
  await resetDb();
  await prisma.category.create({ data: { id: 'makanan', name: 'Makanan', sortOrder: 0 } });
  await prisma.menu.create({ data: { id: 'm1', categoryId: 'makanan', name: 'Nasi Kikil + Empal', price: 20000 } });
  await prisma.user.create({
    data: { role: 'OWNER', name: 'Pemilik', username: 'owner', passwordHash: await hashSecret('rahasia123') },
  });
  const cashier = await prisma.user.create({
    data: { role: 'CASHIER', name: 'Siti Rahma', pinHash: await hashSecret('1234') },
  });

  const cashierLogin = await request(app).post('/api/auth/cashier/login').send({ cashierId: cashier.id, pin: '1234' });
  cashierCookie = cookieOf(cashierLogin);
  const ownerLogin = await request(app).post('/api/auth/owner/login').send({ username: 'owner', password: 'rahasia123' });
  ownerCookie = cookieOf(ownerLogin);
});

describe('POST /api/orders', () => {
  it('menghitung harga, kode dan antrian di server lalu menyimpan pembayaran tunai', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', cashierCookie)
      .send(body([{ productId: 'm1', qty: 2, price: 1 }]));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: `TRX-${businessDate().replaceAll('-', '')}-0001`,
      queue: '001',
      total: 40000,
      payment: 'Cash',
      status: 'siap',
      cashier: 'Siti Rahma',
      items: [{ id: 'm1', name: 'Nasi Kikil + Empal', qty: 2, price: 20000 }],
    });

    const order = await prisma.order.findUniqueOrThrow({
      where: { code: res.body.data.id },
      include: { payments: true, items: true },
    });
    expect(order.totalAmount).toBe(40000);
    expect(order.items[0].lineTotal).toBe(40000);
    expect(order.payments[0]).toMatchObject({ method: 'CASH', status: 'PAID', receivedAmount: 50000, changeAmount: 10000 });
  });

  it('memberi nomor urut berikutnya pada pesanan kedua hari itu', async () => {
    await request(app).post('/api/orders').set('Cookie', cashierCookie).send(body([{ productId: 'm1', qty: 1 }]));
    const res = await request(app).post('/api/orders').set('Cookie', cashierCookie).send(body([{ productId: 'm1', qty: 1 }]));
    expect(res.body.data.queue).toBe('002');
    expect(res.body.data.id.endsWith('-0002')).toBe(true);
  });

  it('menerima QRIS tanpa uang tunai dan menyimpan metode QRIS', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', cashierCookie)
      .send(body([{ productId: 'm1', qty: 1 }], { payment: 'QRIS', receivedAmount: undefined }));
    expect(res.status).toBe(201);
    expect(res.body.data.payment).toBe('QRIS');
    const payment = await prisma.payment.findFirstOrThrow();
    expect(payment.method).toBe('QRIS');
    expect(payment.receivedAmount).toBeNull();
  });

  it('menolak uang tunai yang kurang dari total', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', cashierCookie)
      .send(body([{ productId: 'm1', qty: 2 }], { receivedAmount: 10000 }));
    expect(res.status).toBe(400);
  });

  it('menolak menu yang tidak ada', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', cashierCookie)
      .send(body([{ productId: 'hilang', qty: 1 }]));
    expect(res.status).toBe(400);
  });

  it('hanya kasir yang boleh mencatat pesanan', async () => {
    expect((await request(app).post('/api/orders').send(body([{ productId: 'm1', qty: 1 }]))).status).toBe(401);
    const res = await request(app).post('/api/orders').set('Cookie', ownerCookie).send(body([{ productId: 'm1', qty: 1 }]));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/orders', () => {
  it('mengembalikan pesanan hari ini untuk pemilik', async () => {
    await request(app).post('/api/orders').set('Cookie', cashierCookie).send(body([{ productId: 'm1', qty: 1 }]));
    const res = await request(app).get('/api/orders').set('Cookie', ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].queue).toBe('001');
  });

  it('mengembalikan daftar kosong untuk tanggal lain', async () => {
    await request(app).post('/api/orders').set('Cookie', cashierCookie).send(body([{ productId: 'm1', qty: 1 }]));
    const res = await request(app).get('/api/orders?date=2020-01-01').set('Cookie', ownerCookie);
    expect(res.body.data).toEqual([]);
  });

  it('menolak permintaan tanpa login', async () => {
    expect((await request(app).get('/api/orders')).status).toBe(401);
  });
});
