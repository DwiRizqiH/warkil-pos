import { badRequest, notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { publishOrderCreated } from '../lib/realtime.js';
import { getTransactionStatus } from './midtrans.js';
import { toTx } from './orders.js';

const statusByTransaction = {
  settlement: 'PAID',
  capture: 'PAID',
  expire: 'EXPIRED',
  cancel: 'CANCELLED',
  deny: 'FAILED',
  failure: 'FAILED',
};

function paymentStatusOf({ transaction_status, fraud_status }) {
  if (transaction_status === 'capture' && fraud_status === 'challenge') return 'PENDING';
  return statusByTransaction[transaction_status] ?? 'PENDING';
}

const orderInclude = { items: true, payments: true, cashier: { select: { name: true } } };

export async function applyMidtransStatus(payload) {
  const payment = await prisma.payment.findUnique({
    where: { midtransOrderId: payload.order_id },
    select: { id: true, orderId: true, amount: true, midtransTransactionId: true },
  });
  if (!payment) throw notFound('Pembayaran tidak ditemukan');
  if (Number(payload.gross_amount) !== payment.amount) throw badRequest('Jumlah pembayaran tidak cocok');
  if (payment.midtransTransactionId && payment.midtransTransactionId !== payload.transaction_id) {
    throw badRequest('Transaksi tidak cocok');
  }

  const status = paymentStatusOf(payload);
  if (status === 'PENDING') return null;

  const paidAt = status === 'PAID' ? new Date() : null;

  const order = await prisma.$transaction(async (tx) => {
    // Only a PENDING row may move, so a repeated notification cannot create a second paid order.
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: {
        status,
        midtransTransactionId: payload.transaction_id,
        paymentType: payload.payment_type,
        rawPayload: payload,
        failureReason: status === 'FAILED' ? (payload.status_message ?? null) : null,
        paidAt,
      },
    });
    if (count === 0) return null;
    return tx.order.update({
      where: { id: payment.orderId },
      data: status === 'PAID' ? { status: 'READY', paidAt } : { status: 'CANCELLED' },
      include: orderInclude,
    });
  });

  if (order) {
    if (status === 'PAID') publishOrderCreated(toTx(order));
    return toTx(order);
  }
  const current = await prisma.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: orderInclude });
  return toTx(current);
}

export async function refreshQrisPayment(orderCode) {
  const order = await prisma.order.findUnique({
    where: { code: orderCode },
    include: { payments: { orderBy: { attemptNo: 'desc' } }, items: true, cashier: { select: { name: true } } },
  });
  if (!order) throw notFound('Pesanan tidak ditemukan');

  const payment = order.payments[0];
  if (!payment?.midtransOrderId || payment.status !== 'PENDING') {
    return { status: payment?.status ?? 'PENDING', tx: payment?.status === 'PAID' ? toTx(order) : null };
  }

  try {
    const payload = await getTransactionStatus(payment.midtransOrderId);
    const tx = await applyMidtransStatus(payload);
    if (!tx) return { status: 'PENDING', tx: null };
    // The gateway may report a late settlement after the order already expired; the stored row wins.
    const paid = tx.status === 'siap' || tx.status === 'selesai';
    return { status: paid ? 'PAID' : 'CANCELLED', tx: paid ? tx : null };
  } catch (err) {
    // Keep the cashier polling: a gateway hiccup is temporary, and the webhook stays the source of truth.
    if (err.code !== 'MIDTRANS') throw err;
    logger.warn({ err }, 'gagal memeriksa status pembayaran Midtrans');
    return { status: 'PENDING', tx: null };
  }
}
