import { addDays, hashStr, mulberry32, pad, parseYmd, shiftIndexOf, ymd } from './utils.js';

export const SHOP = {
  name: 'WARUNG KIKIL ABANG',
  address: '',
  open: '08:00',
  close: '22:00',
};

export const CASHIERS = ['Siti Rahma', 'Budi Santoso', 'Dewi Lestari'];

export const SHIFTS = [
  { idx: 0, label: 'Shift 1', start: '08:00', end: '15:00' },
  { idx: 1, label: 'Shift 2', start: '15:00', end: '22:00' },
];

export const DEFAULT_CATEGORIES = [
  { id: 'makanan', name: 'Makanan' },
  { id: 'minuman', name: 'Minuman' },
  { id: 'pendamping', name: 'Pendamping' },
];

export const DEFAULT_MENUS = [
  // Makanan: nasi kikil + satu lauk, harga sama
  { id: 'm1', name: 'Nasi Kikil + Empal', price: 20000, cat: 'makanan', emoji: '🥩' },
  { id: 'm2', name: 'Nasi Kikil + Lidah', price: 20000, cat: 'makanan', emoji: '👅' },
  { id: 'm3', name: 'Nasi Kikil + Kebo/Paru', price: 20000, cat: 'makanan', emoji: '🫁' },
  { id: 'm4', name: 'Nasi Kikil + Babat', price: 20000, cat: 'makanan', emoji: '🍲' },
  { id: 'm5', name: 'Nasi Kikil + Kikil Goreng', price: 20000, cat: 'makanan', emoji: '🍗' },
  { id: 'm6', name: 'Nasi Kikil + Ati', price: 20000, cat: 'makanan', emoji: '🫀' },
  { id: 'm7', name: 'Nasi Kikil + Otak', price: 20000, cat: 'makanan', emoji: '🧠' },
  // Minuman
  { id: 'd1', name: 'Es Teh', price: 3000, cat: 'minuman', emoji: '🧋' },
  { id: 'd2', name: 'Kopi Hitam', price: 5000, cat: 'minuman', emoji: '☕' },
  { id: 'd3', name: 'Kopi Susu', price: 5000, cat: 'minuman', emoji: '🥛' },
  // Pendamping
  { id: 's1', name: 'Kerupuk', price: 1000, cat: 'pendamping', emoji: '🥠' },
];

export function grossOf(menu, menus) {
  return (menu.items || []).reduce((s, it) => {
    const m = menus.find((x) => x.id === it.id);
    return s + (m ? priceOf(m, menus) * it.qty : 0);
  }, 0);
}

export function priceOf(menu, menus) {
  if (menu.items) {
    const g = grossOf(menu, menus);
    return Math.round((g * (1 - (menu.discount || 0) / 100)) / 100) * 100;
  }
  return menu.price;
}

/* ---------- Jadwal & shift ---------- */

export function scheduledCashier(date, idx) {
  const n = Math.floor(parseYmd(date).getTime() / 86400000);
  return CASHIERS[(n + idx) % CASHIERS.length];
}

export function shiftTimes(date, idx) {
  const h = hashStr(date);
  if (idx === 0) return { login: `07:${pad(50 + (h % 9))}`, logout: `15:${pad(h % 6)}` };
  return { login: `15:${pad(6 + (h % 5))}`, logout: `22:${pad((h >> 3) % 14)}` };
}

/* ---------- Generator riwayat transaksi (deterministik) ---------- */

const WEIGHTS = {
  m1: 14, m2: 10, m3: 6, m4: 8, m5: 12, m6: 7, m7: 4,
  d1: 14, d2: 6, d3: 5,
  s1: 10,
};
const HOUR_W = [2, 4, 6, 9, 10, 7, 4, 3, 4, 6, 9, 10, 7, 3]; // jam 08..21

function pickIndex(rng, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export function generateHistory(menus, now = new Date(), daysBack = 120) {
  const ids = menus.map((m) => m.id);
  const wts = ids.map((id) => WEIGHTS[id] ?? 3);
  const out = [];
  const today = ymd(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (let k = daysBack; k >= 0; k--) {
    const day = addDays(now, -k);
    const date = ymd(day);
    const rng = mulberry32(hashStr(date));
    const dow = day.getDay();
    const n = 26 + Math.floor(rng() * 18) + (dow === 0 || dow === 6 ? 10 : 0);
    const list = [];

    for (let i = 0; i < n; i++) {
      const hour = 8 + pickIndex(rng, HOUR_W);
      const minute = Math.floor(rng() * 60);
      const lines = 1 + Math.floor(rng() * 3);
      const chosen = new Map();
      for (let j = 0; j < lines; j++) {
        const id = ids[pickIndex(rng, wts)];
        const m = menus.find((x) => x.id === id);
        const q = m.items ? 1 : rng() < 0.25 ? 2 : 1;
        chosen.set(id, (chosen.get(id) || 0) + q);
      }
      const payRoll = rng();
      const take = rng() < 0.2;
      const mins = hour * 60 + minute;
      if (date === today && mins > nowMin - 2) continue;
      list.push({ mins, chosen, payRoll, take });
    }

    list.sort((a, b) => a.mins - b.mins);
    let seq = 0;

    for (const t of list) {
      seq++;
      const time = `${pad(Math.floor(t.mins / 60))}:${pad(t.mins % 60)}`;
      const items = [...t.chosen.entries()].map(([id, qty]) => {
        const m = menus.find((x) => x.id === id);
        return { id, name: m.name, qty, price: priceOf(m, menus) };
      });
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const age = date === today ? nowMin - t.mins : 9999;
      const status = age > 25 ? 'selesai' : age > 12 ? 'siap' : 'proses';
      out.push({
        id: `TRX-${date.replace(/-/g, '')}-${pad(seq, 4)}`,
        date,
        time,
        queue: pad(seq, 3),
        orderType: t.take ? 'take' : 'dine',
        payment: t.payRoll < 0.55 ? 'Cash' : 'QRIS',
        items,
        note: '',
        total,
        status,
        cashier: scheduledCashier(date, shiftIndexOf(time)),
      });
    }
  }
  return out;
}
