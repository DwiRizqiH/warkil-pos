import { prisma } from '../lib/prisma.js';
import { businessDate, businessDayEnd } from '../lib/wib.js';

const dayOf = (date) => date.toISOString().slice(0, 10);

// No scheduler: a stale shift is closed by the cashier's next login or by logout.
export async function ensureOpenShift(cashierId, at = new Date()) {
  const date = businessDate(at);

  return prisma.$transaction(async (tx) => {
    const open = await tx.shift.findMany({ where: { cashierId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    const current = open.find((shift) => dayOf(shift.businessDate) === date);

    for (const stale of open) {
      if (stale.id === current?.id) continue;
      await tx.shift.update({
        where: { id: stale.id },
        data: { endedAt: businessDayEnd(dayOf(stale.businessDate)) },
      });
    }

    if (current) return current;
    return tx.shift.create({ data: { cashierId, startedAt: at, businessDate: new Date(`${date}T00:00:00.000Z`) } });
  });
}

export async function closeShift(shiftId, at = new Date()) {
  await prisma.shift.updateMany({ where: { id: shiftId, endedAt: null }, data: { endedAt: at } });
}

export async function closeAllOpenShifts(cashierId, at = new Date()) {
  const { count } = await prisma.shift.updateMany({
    where: { cashierId, endedAt: null, businessDate: new Date(`${businessDate(at)}T00:00:00.000Z`) },
    data: { endedAt: at },
  });
  return count;
}
