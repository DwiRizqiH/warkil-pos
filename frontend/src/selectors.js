import { addDays, pad, parseYmd, shiftIndexOf, ymd } from './utils.js';
import { SHIFTS, scheduledCashier, shiftTimes } from './data.js';

export const NON_SALE = ['batal'];
export const isSale = (t) => !NON_SALE.includes(t.status);
export const txQty = (t) => t.items.reduce((s, i) => s + i.qty, 0);
export const orderTypeLabel = (t) => (t.orderType === 'take' ? 'Takeaway' : 'Makan di tempat');

export function statusLabel(t) {
  switch (t.status) {
    case 'batal': return 'Dibatalkan';
    case 'proses': return 'Diproses';
    case 'siap': return 'Siap diambil';
    case 'selesai': return 'Selesai';
    default: return t.status;
  }
}

export function statusTone(s) {
  if (s === 'selesai') return 'ok';
  if (s === 'proses') return 'warn';
  if (s === 'siap') return 'dark';
  return 'mute';
}

export function buildIndex(txs) {
  const byDate = new Map();
  for (const t of txs) {
    if (!byDate.has(t.date)) byDate.set(t.date, []);
    byDate.get(t.date).push(t);
  }
  const daily = new Map();
  for (const [date, list] of byDate) {
    list.sort((a, b) => a.time.localeCompare(b.time));
    let count = 0;
    let qty = 0;
    let total = 0;
    const shifts = [
      { count: 0, qty: 0, total: 0, txs: [] },
      { count: 0, qty: 0, total: 0, txs: [] },
    ];
    for (const t of list) {
      if (!isSale(t)) continue;
      const q = txQty(t);
      count++;
      qty += q;
      total += t.total;
      const sh = shifts[shiftIndexOf(t.time)];
      sh.count++;
      sh.qty += q;
      sh.total += t.total;
      sh.txs.push(t);
    }
    daily.set(date, { count, qty, total, shifts });
  }
  return { byDate, daily };
}

export function rangeSum(index, fromStr, toStr) {
  let count = 0;
  let qty = 0;
  let total = 0;
  let d = parseYmd(fromStr);
  const end = parseYmd(toStr);
  while (d <= end) {
    const s = index.daily.get(ymd(d));
    if (s) {
      count += s.count;
      qty += s.qty;
      total += s.total;
    }
    d = addDays(d, 1);
  }
  return { count, qty, total };
}

// Shift pada suatu tanggal: nama kasir, jam login/logout, total penjualan
export function getShifts(index, date, { session, now }) {
  const today = ymd(now);
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (date > today) return [];
  const day = index.daily.get(date);
  const out = [];
  for (let idx = 0; idx < 2; idx++) {
    const t = shiftTimes(date, idx);
    let active = false;
    let logout = t.logout;
    if (date === today) {
      if (nowHM < t.login) continue;
      if (nowHM < t.logout) {
        active = true;
        logout = null;
      }
    }
    let cashier = scheduledCashier(date, idx);
    if (date === today && session && session.date === today && shiftIndexOf(session.loginTime) === idx) {
      cashier = session.cashier;
    }
    const s = day?.shifts[idx] || { count: 0, qty: 0, total: 0, txs: [] };
    out.push({
      idx,
      date,
      label: SHIFTS[idx].label,
      cashier,
      login: t.login,
      logout,
      active,
      count: s.count,
      qty: s.qty,
      total: s.total,
      txs: s.txs,
    });
  }
  return out;
}

export function cashierTotals(index, from, to, ctx) {
  const map = new Map();
  let d = parseYmd(from);
  const end = parseYmd(to);
  while (d <= end) {
    for (const s of getShifts(index, ymd(d), ctx)) {
      const cur = map.get(s.cashier) || { cashier: s.cashier, total: 0, count: 0, qty: 0, shifts: 0 };
      cur.total += s.total;
      cur.count += s.count;
      cur.qty += s.qty;
      cur.shifts += 1;
      map.set(s.cashier, cur);
    }
    d = addDays(d, 1);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

// Top 3 menu terlaris dalam 30 hari terakhir (bergulir) — keseluruhan, bukan per kategori
export function bestSellers(index, now, menusById) {
  const q = new Map();
  let d = addDays(now, -29);
  for (let i = 0; i < 30; i++) {
    const list = index.byDate.get(ymd(d));
    if (list) {
      for (const t of list) {
        if (!isSale(t)) continue;
        for (const it of t.items) q.set(it.id, (q.get(it.id) || 0) + it.qty);
      }
    }
    d = addDays(d, 1);
  }
  return [...q.entries()]
    .filter(([id]) => menusById.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, qty], i) => ({ id, qty, rank: i + 1 }));
}

// Best seller di-pin paling atas; sisanya urut abjad (dan urutan kategori bila catOrder diberikan)
export function sortMenus(list, rank, catOrder) {
  return [...list].sort((a, b) => {
    const ra = rank.get(a.id)?.rank ?? 99;
    const rb = rank.get(b.id)?.rank ?? 99;
    if (ra !== rb) return ra - rb;
    if (catOrder) {
      const ca = catOrder.get(a.cat) ?? 99;
      const cb = catOrder.get(b.cat) ?? 99;
      if (ca !== cb) return ca - cb;
    }
    return a.name.localeCompare(b.name, 'id');
  });
}

// "Semua" memakai urutan tampilan POS: best seller di atas, lalu urutan kategori, lalu nama.
export function menusForCategory(menus, catId, rank, catOrder) {
  if (catId === 'all') return sortMenus(menus, rank, catOrder);
  return sortMenus(menus.filter((m) => m.cat === catId), rank);
}
