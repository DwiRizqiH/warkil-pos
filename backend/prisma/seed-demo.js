import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { prisma } from '../src/lib/prisma.js';
import { addDays, businessDate, lastNDates, shiftIndexOf } from '../src/lib/wib.js';
import { orderTotal, priceOf } from '../src/services/pricing.js';
import { seedBase } from './seed.js';

// A seeded RNG, so the demo history is identical on every run and two reports can be compared.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index++) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(index)) | 0;
  }
  return hash;
}

// The mockup's own weights: how often each menu sells, and how busy each hour 08:00-21:00 is.
const MENU_WEIGHTS = {
  m1: 14, m2: 10, m3: 5, m4: 6, m5: 4, m6: 4,
  d1: 11, d2: 7.5, d3: 2, d4: 3, d5: 2, d6: 3,
  s1: 7, s2: 4, s3: 3, s4: 3, s5: 2, s6: 2,
  p1: 5, p2: 4, p3: 2,
};
const HOUR_WEIGHTS = [2, 4, 6, 9, 10, 7, 4, 3, 4, 6, 9, 10, 7, 3];

const SHIFT_HOURS = [
  { start: 8, end: 15 },
  { start: 15, end: 22 },
];

const pad = (value, size = 2) => String(value).padStart(size, '0');
const dateOf = (date) => new Date(`${date}T00:00:00.000Z`);
const wibInstant = (date, hour, minute = 0) => new Date(`${date}T${pad(hour - 7)}:${pad(minute)}:00.000Z`);

function pick(rng, weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;
  for (let index = 0; index < weights.length; index++) {
    roll -= weights[index];
    if (roll <= 0) return index;
  }
  return weights.length - 1;
}

// The relations have no cascade, so the children go first; users and menus are left alone.
export async function clearOrderHistory(client = prisma) {
  await client.$transaction([
    client.orderItem.deleteMany(),
    client.payment.deleteMany(),
    client.order.deleteMany(),
    client.shift.deleteMany(),
  ]);
}

export async function generateDemoHistory(days = 120, client = prisma) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('generateDemoHistory tidak boleh dijalankan di production');
  }
  if ((await client.order.count()) > 0) {
    throw new Error('Database sudah berisi pesanan — kosongkan dulu sebelum seed:demo');
  }

  await seedBase(client);

  const menus = await client.menu.findMany({
    where: { deletedAt: null },
    include: { components: true, category: true },
    orderBy: { id: 'asc' },
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
        components: menu.components.map((component) => ({ componentId: component.componentId, qty: component.qty })),
      },
    ])
  );
  const ids = menus.map((menu) => menu.id);
  const weights = ids.map((id) => MENU_WEIGHTS[id] ?? 3);
  const cashiers = await client.user.findMany({ where: { role: 'CASHIER', isActive: true }, orderBy: { name: 'asc' } });

  let orderCount = 0;
  for (const date of lastNDates(addDays(businessDate(), -1), days)) {
    const rng = mulberry32(hashString(date));
    const day = dateOf(date);
    const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    const perDay = 26 + Math.floor(rng() * 18) + (weekend ? 10 : 0);
    const dayNumber = Math.floor(day.getTime() / 86400000);
    const shifts = new Map();
    let seq = 0;

    for (let n = 0; n < perDay; n++) {
      const hour = 8 + pick(rng, HOUR_WEIGHTS);
      const shiftIndex = shiftIndexOf(`${pad(hour)}:00`);
      const cashier = cashiers[(dayNumber + shiftIndex) % cashiers.length];

      if (!shifts.has(shiftIndex)) {
        shifts.set(
          shiftIndex,
          await client.shift.create({
            data: {
              cashierId: cashier.id,
              businessDate: day,
              startedAt: wibInstant(date, SHIFT_HOURS[shiftIndex].start),
              endedAt: wibInstant(date, SHIFT_HOURS[shiftIndex].end),
            },
          })
        );
      }

      const chosen = new Map();
      const lineCount = 1 + Math.floor(rng() * 3);
      for (let line = 0; line < lineCount; line++) {
        const productId = ids[pick(rng, weights)];
        const qty = byId.get(productId).isBundle ? 1 : rng() < 0.25 ? 2 : 1;
        chosen.set(productId, (chosen.get(productId) ?? 0) + qty);
      }

      const items = [...chosen.entries()].map(([menuId, qty]) => {
        const unitPrice = priceOf(menuId, byId);
        return { menuId, nameSnapshot: byId.get(menuId).name, qty, unitPrice, lineTotal: unitPrice * qty };
      });
      const totalAmount = orderTotal(items);
      const method = rng() < 0.55 ? 'CASH' : 'MIDTRANS';
      const createdAt = wibInstant(date, hour, Math.floor(rng() * 60));
      seq++;

      await client.order.create({
        data: {
          code: `TRX-${date.replace(/-/g, '')}-${pad(seq, 4)}`,
          dailySeq: seq,
          queueNumber: pad(seq, 3),
          businessDate: day,
          orderType: rng() < 0.2 ? 'TAKEAWAY' : 'DINE_IN',
          status: 'COMPLETED',
          cashierId: cashier.id,
          shiftId: shifts.get(shiftIndex).id,
          totalAmount,
          createdAt,
          paidAt: createdAt,
          items: { create: items },
          payments: {
            create: {
              attemptNo: 1,
              method,
              status: 'PAID',
              amount: totalAmount,
              paymentType: method === 'MIDTRANS' ? 'qris' : null,
              paidAt: createdAt,
            },
          },
        },
      });
      orderCount++;
    }
  }

  return orderCount;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const days = Number(process.env.SEED_DEMO_DAYS ?? 120);
  if (process.env.SEED_DEMO_RESET === '1') {
    console.log('menghapus pesanan dan shift yang ada');
    await clearOrderHistory();
  }
  console.log(`riwayat demo dibuat: ${await generateDemoHistory(days)} pesanan`);
  await prisma.$disconnect();
}
