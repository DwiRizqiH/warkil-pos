import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { hashSecret } from '../services/auth.js';
import { getTransactionStatus } from '../services/midtrans.js';
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
  })),
  getTransactionStatus: vi.fn(),
}));

const app = createApp();
const cookieOf = (res) => res.headers['set-cookie'][0];

const sign = (payload) =>
  createHash('sha512')
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${env.MIDTRANS_SIGNATURE_SECRET}`)
    .digest('hex');

const notification = (midtransOrderId, overrides = {}) => {
  const payload = {
    order_id: midtransOrderId,
    status_code: '200',
    gross_amount: '20000.00',
    transaction_id: 'tx-qris-1',
    transaction_status: 'settlement',
    payment_type: 'qris',
    fraud_status: 'accept',
    status_message: 'midtrans payment notification',
    ...overrides,
  };
  return { ...payload, signature_key: sign(payload) };
};

let cashierCookie = '';

async function insertCashier() {
  await prisma.category.create({ data: { id: 'makanan', name: 'Makanan', sortOrder: 0 } });
  await prisma.menu.create({ data: { id: 'm1', categoryId: 'makanan', name: 'Nasi Kikil + Empal', price: 20000 } });
  const cashier = await prisma.user.create({
    data: { role: 'CASHIER', name: 'Siti Rahma', pinHash: await hashSecret('1234') },
  });
  const login = await request(app).post('/api/auth/cashier/login').send({ cashierId: cashier.id, pin: '1234' });
  cashierCookie = cookieOf(login);
}

async function createQrisOrder() {
  const res = await request(app)
    .post('/api/orders')
    .set('Cookie', cashierCookie)
    .send({ orderType: 'dine', payment: 'QRIS', items: [{ productId: 'm1', qty: 1 }] });
  expect(res.status).toBe(201);
  return res.body.data;
}

beforeEach(async () => {
  await resetDb();
  await insertCashier();
});

describe('POST /api/payments/midtrans/notification', () => {
  it('menandai pesanan lunas dan memberinya antrean', async () => {
    const order = await createQrisOrder();

    const res = await request(app)
      .post('/api/payments/midtrans/notification')
      .send(notification(`${order.id}-1`));

    expect(res.status).toBe(200);
    const saved = await prisma.order.findUniqueOrThrow({ where: { code: order.id }, include: { payments: true } });
    expect(saved.status).toBe('READY');
    expect(saved.paidAt).not.toBeNull();
    expect(saved.payments[0]).toMatchObject({ status: 'PAID', midtransTransactionId: 'tx-qris-1' });

    const listed = await request(app).get('/api/orders').set('Cookie', cashierCookie);
    expect(listed.body.data[0]).toMatchObject({ id: order.id, queue: '001', payment: 'QRIS', status: 'siap' });
  });

  it('idempoten: notifikasi yang dikirim ulang tidak mengubah pembayaran yang sudah lunas', async () => {
    const order = await createQrisOrder();
    await request(app).post('/api/payments/midtrans/notification').send(notification(`${order.id}-1`));
    const first = await prisma.payment.findFirstOrThrow();

    const res = await request(app).post('/api/payments/midtrans/notification').send(notification(`${order.id}-1`));
    expect(res.status).toBe(200);
    const second = await prisma.payment.findFirstOrThrow();
    expect(second.paidAt).toEqual(first.paidAt);
    expect(second.status).toBe('PAID');
  });

  it('mengabaikan notifikasi pending tanpa membatalkan pesanan', async () => {
    const order = await createQrisOrder();
    const res = await request(app)
      .post('/api/payments/midtrans/notification')
      .send(notification(`${order.id}-1`, { transaction_status: 'pending' }));

    expect(res.status).toBe(200);
    expect(await prisma.order.findUniqueOrThrow({ where: { code: order.id } })).toMatchObject({ status: 'UNPAID' });
    expect(await prisma.payment.findFirstOrThrow()).toMatchObject({ status: 'PENDING' });
  });

  it('menolak signature yang tidak cocok', async () => {
    const order = await createQrisOrder();
    const res = await request(app)
      .post('/api/payments/midtrans/notification')
      .send({ ...notification(`${order.id}-1`), signature_key: 'a'.repeat(128) });
    expect(res.status).toBe(403);
    expect(await prisma.payment.findFirstOrThrow()).toMatchObject({ status: 'PENDING' });
  });

  it('menolak jumlah yang tidak cocok dengan tagihan', async () => {
    const order = await createQrisOrder();
    const res = await request(app)
      .post('/api/payments/midtrans/notification')
      .send(notification(`${order.id}-1`, { gross_amount: '1000.00' }));
    expect(res.status).toBe(400);
    expect(await prisma.payment.findFirstOrThrow()).toMatchObject({ status: 'PENDING' });
  });

  it('menolak pelunasan yang status code-nya bukan 200', async () => {
    const order = await createQrisOrder();
    const res = await request(app)
      .post('/api/payments/midtrans/notification')
      .send(notification(`${order.id}-1`, { status_code: '201' }));
    expect(res.status).toBe(400);
    expect(await prisma.payment.findFirstOrThrow()).toMatchObject({ status: 'PENDING' });
  });

  it('membatalkan pesanan saat capture ditolak fraud', async () => {
    const order = await createQrisOrder();
    const res = await request(app)
      .post('/api/payments/midtrans/notification')
      .send(notification(`${order.id}-1`, { transaction_status: 'capture', fraud_status: 'deny' }));

    expect(res.status).toBe(200);
    expect(await prisma.payment.findFirstOrThrow()).toMatchObject({ status: 'FAILED' });
    expect(await prisma.order.findUniqueOrThrow({ where: { code: order.id } })).toMatchObject({ status: 'CANCELLED' });
  });

  it('membatalkan pesanan saat QR kedaluwarsa', async () => {
    const order = await createQrisOrder();
    const res = await request(app)
      .post('/api/payments/midtrans/notification')
      .send(notification(`${order.id}-1`, { transaction_status: 'expire' }));

    expect(res.status).toBe(200);
    expect(await prisma.order.findUniqueOrThrow({ where: { code: order.id } })).toMatchObject({ status: 'CANCELLED' });
    expect(await prisma.payment.findFirstOrThrow()).toMatchObject({ status: 'EXPIRED' });
  });
});

describe('GET /api/orders/:code/payment', () => {
  it('menanyakan status ke Midtrans lalu mengembalikan pesanan yang lunas', async () => {
    const order = await createQrisOrder();
    getTransactionStatus.mockResolvedValueOnce({
      status_code: '200',
      order_id: `${order.id}-1`,
      gross_amount: '20000.00',
      transaction_id: 'tx-qris-1',
      transaction_status: 'settlement',
      payment_type: 'qris',
    });

    const res = await request(app).get(`/api/orders/${order.id}/payment`).set('Cookie', cashierCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'PAID', tx: { id: order.id, queue: '001', payment: 'QRIS' } });
    expect(await prisma.order.findUniqueOrThrow({ where: { code: order.id } })).toMatchObject({ status: 'READY' });

    const again = await request(app).get(`/api/orders/${order.id}/payment`).set('Cookie', cashierCookie);
    expect(again.body.data).toMatchObject({ status: 'PAID', tx: { id: order.id } });
  });

  it('tetap menunggu saat gateway sedang tidak bisa dihubungi', async () => {
    const order = await createQrisOrder();
    getTransactionStatus.mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'MIDTRANS' }));

    const res = await request(app).get(`/api/orders/${order.id}/payment`).set('Cookie', cashierCookie);

    expect(res.body.data).toEqual({ status: 'PENDING', tx: null });
  });

  it('menolak permintaan tanpa sesi', async () => {
    const order = await createQrisOrder();
    expect((await request(app).get(`/api/orders/${order.id}/payment`)).status).toBe(401);
  });

  it('menolak kasir membuka pembayaran dari tanggal lain', async () => {
    const cashier = await prisma.user.findFirstOrThrow({ where: { role: 'CASHIER' } });
    const businessDate = new Date('2026-01-01T00:00:00.000Z');
    const shift = await prisma.shift.create({ data: { cashierId: cashier.id, businessDate } });
    const order = await prisma.order.create({
      data: {
        code: 'TRX-20260101-0001',
        dailySeq: 1,
        queueNumber: '001',
        businessDate,
        orderType: 'DINE_IN',
        status: 'UNPAID',
        cashierId: cashier.id,
        shiftId: shift.id,
        totalAmount: 20000,
        payments: {
          create: { attemptNo: 1, method: 'QRIS', status: 'PENDING', amount: 20000, midtransOrderId: 'OLD-1' },
        },
      },
    });

    const res = await request(app).get(`/api/orders/${order.code}/payment`).set('Cookie', cashierCookie);
    expect(res.status).toBe(403);
  });
});
