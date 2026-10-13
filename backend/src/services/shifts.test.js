import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { resetDb } from '../test/db.js';
import { closeAllOpenShifts, ensureOpenShift } from './shifts.js';

const at = (iso) => new Date(iso);
const dayOf = (date) => date.toISOString().slice(0, 10);
let cashierId = '';

beforeEach(async () => {
  await resetDb();
  const cashier = await prisma.user.create({
    data: { role: 'CASHIER', name: 'Siti Rahma', pinHash: 'x' },
  });
  cashierId = cashier.id;
});

describe('ensureOpenShift', () => {
  it('membuat shift baru saat login pertama', async () => {
    const shift = await ensureOpenShift(cashierId, at('2026-10-13T01:00:00Z'));
    expect(dayOf(shift.businessDate)).toBe('2026-10-13');
    expect(shift.endedAt).toBeNull();
  });

  it('memakai ulang shift terbuka pada hari bisnis yang sama', async () => {
    const first = await ensureOpenShift(cashierId, at('2026-10-13T01:00:00Z'));
    const second = await ensureOpenShift(cashierId, at('2026-10-13T09:00:00Z'));
    expect(second.id).toBe(first.id);
    expect(await prisma.shift.count()).toBe(1);
  });

  it('menutup shift kemarin saat kasir lupa logout', async () => {
    const yesterday = await ensureOpenShift(cashierId, at('2026-10-12T01:00:00Z'));
    const today = await ensureOpenShift(cashierId, at('2026-10-13T01:00:00Z'));
    expect(dayOf(today.businessDate)).toBe('2026-10-13');
    const stale = await prisma.shift.findUniqueOrThrow({ where: { id: yesterday.id } });
    expect(stale.endedAt.toISOString()).toBe('2026-10-12T17:00:00.000Z');
    expect(await prisma.shift.count({ where: { endedAt: null } })).toBe(1);
  });

  it('membuka shift baru saat hari bisnis berganti', async () => {
    const first = await ensureOpenShift(cashierId, at('2026-10-13T16:59:00Z'));
    const second = await ensureOpenShift(cashierId, at('2026-10-13T17:00:00Z'));
    expect(second.id).not.toBe(first.id);
    expect(dayOf(second.businessDate)).toBe('2026-10-14');
  });

  it('menutup shift kembar hari ini pada jam login, bukan di akhir hari', async () => {
    await prisma.shift.create({
      data: { cashierId, startedAt: at('2026-10-13T00:30:00Z'), businessDate: at('2026-10-13T00:00:00Z') },
    });
    const current = await prisma.shift.create({
      data: { cashierId, startedAt: at('2026-10-13T01:00:00Z'), businessDate: at('2026-10-13T00:00:00Z') },
    });
    const shift = await ensureOpenShift(cashierId, at('2026-10-13T05:00:00Z'));
    expect(shift.id).toBe(current.id);
    const sibling = await prisma.shift.findFirstOrThrow({ where: { id: { not: current.id } } });
    expect(sibling.endedAt.toISOString()).toBe('2026-10-13T05:00:00.000Z');
  });
});

describe('closeAllOpenShifts', () => {
  it('menutup shift terbuka milik kasir saat logout', async () => {
    await ensureOpenShift(cashierId, at('2026-10-13T01:00:00Z'));
    expect(await closeAllOpenShifts(cashierId, at('2026-10-13T06:00:00Z'))).toBe(1);
    expect(await prisma.shift.count({ where: { endedAt: null } })).toBe(0);
  });
});
