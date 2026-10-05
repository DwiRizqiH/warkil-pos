import { addDays, hashStr, mulberry32, pad, parseYmd, shiftIndexOf, ymd } from './utils.js';

export const SHOP = {
  name: 'WARUNG KIKIL ABANG',
  address: 'Jl. Contoh No. 12, Malang',
  open: '08:00',
  close: '22:00',
};

export const CASHIERS = ['Siti Rahma', 'Budi Santoso', 'Dewi Lestari'];
export const DRIVERS = ['Pak Anto', 'Mas Dedi', 'Bang Rudi', 'Kak Sari', 'Mas Yoga'];

export const PLATFORMS = [
  { code: 'GJK', name: 'GoFood' },
  { code: 'GRB', name: 'GrabFood' },
  { code: 'SHPE', name: 'ShopeeFood' },
];

export const SHIFTS = [
  { idx: 0, label: 'Shift 1', start: '08:00', end: '15:00' },
  { idx: 1, label: 'Shift 2', start: '15:00', end: '22:00' },
];

// Urutan kategori sesuai permintaan: Menu Paket, Minuman, Makanan, Pendamping
export const DEFAULT_CATEGORIES = [
  { id: 'paket', name: 'Menu Paket' },
  { id: 'minuman', name: 'Minuman' },
  { id: 'makanan', name: 'Makanan' },
  { id: 'pendamping', name: 'Pendamping' },
];

export const DEFAULT_MENUS = [
  // Makanan
  { id: 'm1', name: 'Sop Kikil', price: 25000, cat: 'makanan', emoji: '🍲' },
  { id: 'm2', name: 'Nasi Kikil Mercon', price: 28000, cat: 'makanan', emoji: '🌶️' },
  { id: 'm3', name: 'Kikil Rica-Rica', price: 27000, cat: 'makanan', emoji: '🍛' },
  { id: 'm4', name: 'Soto Kikil', price: 24000, cat: 'makanan', emoji: '🥣' },
  { id: 'm5', name: 'Mie Kikil Pedas', price: 22000, cat: 'makanan', emoji: '🍜' },
  { id: 'm6', name: 'Kikil Goreng Crispy', price: 26000, cat: 'makanan', emoji: '🍗' },
  // Minuman
  { id: 'd1', name: 'Es Jeruk', price: 8000, cat: 'minuman', emoji: '🍊' },
  { id: 'd2', name: 'Es Teh Manis', price: 5000, cat: 'minuman', emoji: '🧋' },
  { id: 'd3', name: 'Teh Hangat', price: 4000, cat: 'minuman', emoji: '🍵' },
  { id: 'd4', name: 'Es Kelapa Muda', price: 12000, cat: 'minuman', emoji: '🥥' },
  { id: 'd5', name: 'Kopi Hitam', price: 6000, cat: 'minuman', emoji: '☕' },
  { id: 'd6', name: 'Air Mineral', price: 4000, cat: 'minuman', emoji: '💧' },
  // Pendamping
  { id: 's1', name: 'Nasi Putih', price: 5000, cat: 'pendamping', emoji: '🍚' },
  { id: 's2', name: 'Kerupuk', price: 3000, cat: 'pendamping', emoji: '🥠' },
  { id: 's3', name: 'Tempe Goreng', price: 4000, cat: 'pendamping', emoji: '🍘' },
  { id: 's4', name: 'Telur Rebus', price: 5000, cat: 'pendamping', emoji: '🥚' },
  { id: 's5', name: 'Sambal Extra', price: 2000, cat: 'pendamping', emoji: '🌶️' },
  { id: 's6', name: 'Pudding Cokelat', price: 8000, cat: 'pendamping', emoji: '🍮' },
  // Paket (kombinasi menu + diskon %)
  {
    id: 'p1', name: 'Paket Hemat Kikil', cat: 'paket', emoji: '🍱', discount: 10,
    items: [{ id: 'm1', qty: 1 }, { id: 's1', qty: 1 }, { id: 'd2', qty: 1 }],
  },
  {
    id: 'p2', name: 'Paket Mercon', cat: 'paket', emoji: '🔥', discount: 5,
    items: [{ id: 'm2', qty: 1 }, { id: 'd1', qty: 1 }],
  },
  {
    id: 'p3', name: 'Paket Berdua', cat: 'paket', emoji: '🍽️', discount: 15,
    items: [{ id: 'm1', qty: 2 }, { id: 's1', qty: 2 }, { id: 'd1', qty: 2 }, { id: 's2', qty: 1 }],
  },
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

/* ---------- Jadwal & shift (dummy) ---------- */

export function scheduledCashier(date, idx) {
  const n = Math.floor(parseYmd(date).getTime() / 86400000);
  return CASHIERS[(n + idx) % CASHIERS.length];
}

export function shiftTimes(date, idx) {
  const h = hashStr(date);
  if (idx === 0) return { login: `07:${pad(50 + (h % 9))}`, logout: `15:${pad(h % 6)}` };
  return { login: `15:${pad(6 + (h % 5))}`, logout: `22:${pad((h >> 3) % 14)}` };
}

/* ---------- Generator riwayat transaksi (dummy, deterministik) ---------- */

const WEIGHTS = {
  m1: 14, m2: 10, m3: 5, m4: 6, m5: 4, m6: 4,
  d1: 11, d2: 7.5, d3: 2, d4: 3, d5: 2, d6: 3,
  s1: 7, s2: 4, s3: 3, s4: 3, s5: 2, s6: 2,
  p1: 5, p2: 4, p3: 2,
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
      const roll = rng();
      const channel = roll < 0.7 ? 'kasir' : roll < 0.83 ? 'GJK' : roll < 0.93 ? 'GRB' : 'SHPE';
      const online = channel !== 'kasir';
      const lines = 1 + Math.floor(rng() * 3) + (online && rng() < 0.4 ? 1 : 0);
      const chosen = new Map();
      for (let j = 0; j < lines; j++) {
        const id = ids[pickIndex(rng, wts)];
        const m = menus.find((x) => x.id === id);
        const q = m.items ? 1 : rng() < 0.25 ? 2 : 1;
        chosen.set(id, (chosen.get(id) || 0) + q);
      }
      const payRoll = rng();
      const driver = DRIVERS[Math.floor(rng() * DRIVERS.length)];
      const ref = 1000 + Math.floor(rng() * 8999);
      const take = rng() < 0.2;
      const mins = hour * 60 + minute;
      if (date === today && mins > nowMin - 2) continue;
      list.push({ mins, channel, online, chosen, payRoll, driver, ref, take });
    }

    list.sort((a, b) => a.mins - b.mins);
    let seq = 0;
    let kasirSeq = 0;
    const plat = { GJK: 0, GRB: 0, SHPE: 0 };

    for (const t of list) {
      seq++;
      const time = `${pad(Math.floor(t.mins / 60))}:${pad(t.mins % 60)}`;
      const items = [...t.chosen.entries()].map(([id, qty]) => {
        const m = menus.find((x) => x.id === id);
        return { id, name: m.name, qty, price: priceOf(m, menus) };
      });
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      let queue;
      if (t.online) {
        plat[t.channel]++;
        queue = t.channel + pad(plat[t.channel]);
      } else {
        kasirSeq++;
        queue = pad(kasirSeq, 3);
      }
      const age = date === today ? nowMin - t.mins : 9999;
      const status = age > 25 ? 'selesai' : age > 12 ? 'siap' : 'proses';
      out.push({
        id: `TRX-${date.replace(/-/g, '')}-${pad(seq, 4)}`,
        date,
        time,
        channel: t.channel,
        queue,
        orderType: t.online || (t.channel === 'kasir' && t.take) ? 'take' : 'dine',
        payment: t.online ? 'Aplikasi' : t.payRoll < 0.55 ? 'Cash' : 'QRIS',
        items,
        note: '',
        total,
        status,
        cashier: scheduledCashier(date, shiftIndexOf(time)),
        driver: t.online ? t.driver : null,
        ref: t.online ? `${t.channel}-${t.ref}` : null,
      });
    }
  }
  return out;
}
