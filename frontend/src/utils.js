import { useEffect, useState } from 'react';

export const pad = (n, l = 2) => String(n).padStart(l, '0');

export const rupiah = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

export const rupiahShort = (n) => {
  if (n >= 1e6) {
    const v = n / 1e6;
    return (Number.isInteger(v) ? v : v.toFixed(1).replace('.', ',')) + ' jt';
  }
  if (n >= 1e3) return Math.round(n / 1e3) + ' rb';
  return String(Math.round(n));
};

export const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);

export const fmtDateLong = (s) => {
  const d = parseYmd(s);
  return `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

export const fmtDateShort = (s) => {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

// Senin sebagai awal minggu
export const startOfWeek = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

export const shiftIndexOf = (time) => (parseInt(time.slice(0, 2), 10) < 15 ? 0 : 1);

export const fmtCountdown = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
