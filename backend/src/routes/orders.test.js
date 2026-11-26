import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { businessDate } from '../lib/wib.js';
import { hashSecret } from '../services/auth.js';
import { createQrisCharge } from '../services/midtrans.js';
import { resetDb } from '../test/db.js';

vi.mock('../services/midtrans.js', async (importOriginal) => ({
  ...(await importOriginal()),
  createQrisCharge: vi.fn(async ({ orderId, amount }) => ({
    status_code: '201',
    transaction_id: 'tx-qris-1',
    order_id: orderId,
    gross_amount: `${amount}.00`,
    payment_type: 'qris',
    transaction_status: 'pending',
    qr_string: 'QR-STRING-TEST',
    expiry_time: '2026-11-26 11:27:33',
    actions: [{ name: 'generate-qr-code', method: 'GET', url: 'https://api.sandbox.midtrans.com/v2/qris/tx-qris-1/qr-code' }],
  })),
}));

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

  it('membuat QRIS lewat Midtrans dan menunggu pelunasan', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', cashierCookie)
      .send(body([{ productId: 'm1', qty: 1 }], { payment: 'QRIS', receivedAmount: undefined }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      payment: 'QRIS',
      status: 'menunggu',
      queue: '001',
      qr: {
        string: 'QR-STRING-TEST',
        imageUrl: 'https://api.sandbox.midtrans.com/v2/qris/tx-qris-1/qr-code',
      },
    });

    const payment = await prisma.payment.findFirstOrThrow();
    expect(payment).toMatchObject({
      method: 'QRIS',
      status: 'PENDING',
      midtransOrderId: `${res.body.data.id}-1`,
      midtransTransactionId: 'tx-qris-1',
      qrString: 'QR-STRING-TEST',
      receivedAmount: null,
    });
    expect(payment.expiresAt.toISOString()).toBe('2026-11-26T04:27:33.000Z');

    const today = await request(app).get('/api/orders').set('Cookie', cashierCookie);
    expect(today.body.data).toEqual([]);
  });

  it('membatalkan pesanan bila Midtrans menolak membuat pembayaran', async () => {
    createQrisCharge.mockRejectedValueOnce(new Error('qris is not enabled'));

    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', cashierCookie)
      .send(body([{ productId: 'm1', qty: 1 }], { payment: 'QRIS', receivedAmount: undefined }));

    expect(res.status).toBe(502);
    expect(await prisma.payment.findFirstOrThrow()).toMatchObject({ status: 'FAILED' });
    expect(await prisma.order.findFirstOrThrow()).toMatchObject({ status: 'CANCELLED' });
  });

  it('menghitung harga paket dari komponen yang tidak ikut dipesan', async () => {
    await prisma.menu.create({ data: { id: 'm2', categoryId: 'makanan', name: 'Kerupuk', price: 1000 } });
    await prisma.category.create({ data: { id: 'paket', name: 'Menu Paket', sortOrder: 1, isBundle: true } });
    await prisma.menu.create({
      data: {
        id: 'b1',
        categoryId: 'paket',
        name: 'Paket Berdua',
        discountPercent: 10,
        components: { create: [{ componentId: 'm1', qty: 2 }, { componentId: 'm2', qty: 1 }] },
      },
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', cashierCookie)
      .send(body([{ productId: 'b1', qty: 1 }]));

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(36900);
    expect(res.body.data.items[0]).toMatchObject({ id: 'b1', price: 36900 });
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

  it('mengizinkan kasir melihat pesanan hari ini', async () => {
    await request(app).post('/api/orders').set('Cookie', cashierCookie).send(body([{ productId: 'm1', qty: 1 }]));
    const res = await request(app).get(`/api/orders?date=${businessDate()}`).set('Cookie', cashierCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('menolak kasir yang meminta riwayat tanggal lain', async () => {
    const res = await request(app).get('/api/orders?date=2020-01-01').set('Cookie', cashierCookie);
    expect(res.status).toBe(403);
  });

  it('menolak permintaan tanpa login', async () => {
    expect((await request(app).get('/api/orders')).status).toBe(401);
  });
});
