import { badRequest, conflict } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { publishOrderCreated } from '../lib/realtime.js';
import { businessDate, businessTime } from '../lib/wib.js';
import { orderTotal, priceLines } from './pricing.js';
import { ensureOpenShift } from './shifts.js';

const MAX_SEQUENCE_ATTEMPTS = 5;

const orderTypeToDb = { dine: 'DINE_IN', take: 'TAKEAWAY' };
const orderTypeFromDb = { DINE_IN: 'dine', TAKEAWAY: 'take' };
const paymentToDb = { Cash: 'CASH', QRIS: 'QRIS' };
const paymentFromDb = { CASH: 'Cash', QRIS: 'QRIS', MIDTRANS: 'QRIS' };

const dayStart = (date) => new Date(`${date}T00:00:00.000Z`);
const pad = (value) => String(value).padStart(3, '0');

export function toTx(order) {
  const paidAt = order.paidAt ?? order.createdAt;
  return {
    id: order.code,
    date: order.businessDate.toISOString().slice(0, 10),
    time: businessTime(paidAt),
    queue: order.queueNumber,
    orderType: orderTypeFromDb[order.orderType],
    payment: paymentFromDb[order.payments[0]?.method] ?? 'Cash',
    items: order.items.map((item) => ({
      id: item.menuId,
      name: item.nameSnapshot,
      qty: item.qty,
      price: item.unitPrice,
      note: item.note ?? '',
    })),
    note: order.note ?? '',
    total: order.totalAmount,
    status: order.status === 'COMPLETED' ? 'selesai' : 'siap',
    cashier: order.cashier.name,
    createdAt: paidAt.getTime(),
  };
}

async function priceOrder(items) {
  const menus = await prisma.menu.findMany({
    where: { id: { in: [...new Set(items.map((item) => item.productId))] }, deletedAt: null },
    include: { components: true, category: { select: { isBundle: true } } },
  });
  const byId = new Map(
    menus.map((menu) => [
      menu.id,
      {
        id: menu.id,
        name: menu.name,
        price: menu.price,
        discountPct: menu.discountPercent,
        isBundle: menu.category.isBundle,
        components: menu.components,
      },
    ])
  );
  return priceLines(items, byId).map((line, index) => ({ ...line, note: items[index].note }));
}

export async function createPaidOrder({ cashier, input, at = new Date() }) {
  const lines = await priceOrder(input.items);
  const total = orderTotal(lines);
  const isCash = input.payment === 'Cash';
  if (isCash && (input.receivedAmount ?? 0) < total) throw badRequest('Uang diterima kurang dari total');

  // The JWT may carry yesterday's shiftId, so the shift is resolved again for the current business date.
  const shift = await ensureOpenShift(cashier.id, at);
  const date = businessDate(at);

  for (let attempt = 0; attempt < MAX_SEQUENCE_ATTEMPTS; attempt += 1) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        const last = await tx.order.findFirst({
          where: { businessDate: dayStart(date) },
          orderBy: { dailySeq: 'desc' },
          select: { dailySeq: true },
        });
        const dailySeq = (last?.dailySeq ?? 0) + 1;
        const code = `TRX-${date.replaceAll('-', '')}-${String(dailySeq).padStart(4, '0')}`;
        return tx.order.create({
          data: {
            code,
            dailySeq,
            queueNumber: pad(dailySeq),
            businessDate: dayStart(date),
            orderType: orderTypeToDb[input.orderType],
            status: 'READY',
            cashierId: cashier.id,
            shiftId: shift.id,
            totalAmount: total,
            note: input.note || null,
            paidAt: at,
            items: {
              create: lines.map((line) => ({
                menuId: line.productId,
                nameSnapshot: line.name,
                unitPrice: line.unitPrice,
                qty: line.qty,
                note: line.note || null,
                lineTotal: line.subtotal,
              })),
            },
            payments: {
              create: {
                attemptNo: 1,
                method: paymentToDb[input.payment],
                status: 'PAID',
                amount: total,
                receivedAmount: isCash ? input.receivedAmount : null,
                changeAmount: isCash ? input.receivedAmount - total : null,
                paidAt: at,
              },
            },
          },
          include: { items: true, payments: true, cashier: { select: { name: true } } },
        });
      });
      const txOrder = toTx(order);
      publishOrderCreated(txOrder);
      return txOrder;
    } catch (err) {
      if (err.code !== 'P2002') throw err;
    }
  }
  throw conflict('Antrean pesanan sedang sibuk, coba lagi');
}

export async function ordersForDate(date = businessDate()) {
  const orders = await prisma.order.findMany({
    where: { businessDate: dayStart(date), status: { in: ['READY', 'COMPLETED'] } },
    include: { items: true, payments: true, cashier: { select: { name: true } } },
    orderBy: [{ dailySeq: 'asc' }],
  });
  return orders.map(toTx);
}
