import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CATEGORIES, DEFAULT_MENUS, generateHistory, scheduledCashier } from './data.js';
import { bestSellers, buildIndex } from './selectors.js';
import { daysBetween, pad, parseYmd, shiftIndexOf, useNow, ymd } from './utils.js';

const PREFIX = 'kikil:v3:';
const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

// State yang disimpan di localStorage & disinkronkan antar tab (event "storage")
function usePersist(key, init) {
  const k = PREFIX + key;
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : init;
    } catch {
      return init;
    }
  });
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== k) return;
      try {
        setVal(e.newValue ? JSON.parse(e.newValue) : init);
      } catch {
        /* abaikan */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = useCallback(
    (updater) => {
      setVal((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        try {
          localStorage.setItem(k, JSON.stringify(next));
        } catch {
          /* abaikan */
        }
        return next;
      });
    },
    [k]
  );
  return [val, set];
}

// Riwayat transaksi (dibuat sekali saat aplikasi dimuat)
const BASE = generateHistory(DEFAULT_MENUS, new Date());

export function StoreProvider({ children }) {
  const [menus, setMenus] = usePersist('menus', DEFAULT_MENUS);
  const [categories, setCategories] = usePersist('cats', DEFAULT_CATEGORIES);
  const [marks, setMarks] = usePersist('marks', {});
  const [sundayOff, setSundayOff] = usePersist('sundayOff', false);
  const [extra, setExtra] = usePersist('extraTx', []);
  const [overrides, setOverrides] = usePersist('overrides', {});
  const now = useNow(15000);
  const todayStr = ymd(now);

  const baseApplied = useMemo(
    () => BASE.map((t) => (overrides[t.id] ? { ...t, ...overrides[t.id] } : t)),
    [overrides]
  );
  // Riwayat demo dihitung ulang tiap muat dan bisa memakai nomor urut yang sudah dipakai pesanan asli.
  const allTx = useMemo(() => {
    const created = new Set(extra.map((t) => t.id));
    return baseApplied.filter((t) => !created.has(t.id)).concat(extra);
  }, [baseApplied, extra]);
  const index = useMemo(() => buildIndex(allTx), [allTx]);
  const menusById = useMemo(() => new Map(menus.map((m) => [m.id, m])), [menus]);

  const dataDays = daysBetween(BASE[0].date, todayStr) + 1;
  const hasMonthData = dataDays >= 30;
  const best = useMemo(
    () => (hasMonthData ? bestSellers(index, new Date(), menusById) : []),
    [hasMonthData, index, todayStr, menusById] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const txRef = useRef(allTx);
  txRef.current = allTx;
  const extraRef = useRef(extra);
  extraRef.current = extra;

  const nextSeq = () => {
    const today = ymd(new Date());
    const nums = txRef.current
      .filter((t) => t.date === today)
      .map((t) => parseInt(t.id.split('-')[2], 10));
    return Math.max(0, ...nums) + 1;
  };

  // Nomor antrian: 001, 002, ... (reset tiap hari)
  const nextQueue = () => {
    const today = ymd(new Date());
    const nums = txRef.current
      .filter((t) => t.date === today)
      .map((t) => parseInt(String(t.queue).replace(/\D/g, ''), 10));
    return pad(Math.max(0, ...nums) + 1, 3);
  };

  const createOrder = useCallback((o) => {
    const d = new Date();
    const date = ymd(d);
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const cashier =
      o.cashier || scheduledCashier(date, shiftIndexOf(time));
    const tx = {
      note: '',
      orderType: 'dine',
      ...o,
      id: `TRX-${date.replace(/-/g, '')}-${pad(nextSeq(), 4)}`,
      date,
      time,
      cashier,
      createdAt: d.getTime(),
      queue: nextQueue(),
      total: o.items.reduce((sum, i) => sum + i.price * i.qty, 0),
    };
    setExtra((prev) => [...prev, tx]);
    return tx;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTx = useCallback(
    (id, patch) => {
      if (extraRef.current.some((t) => t.id === id)) {
        setExtra((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      } else {
        setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      }
    },
    [setExtra, setOverrides]
  );

  const getMark = useCallback(
    (date) =>
      marks[date] || (sundayOff && parseYmd(date).getDay() === 0 ? { type: 'libur', auto: true } : null),
    [marks, sundayOff]
  );

  const value = useMemo(
    () => ({
      menus, setMenus, categories, setCategories, marks, setMarks, sundayOff, setSundayOff,
      getMark, allTx, index, now, createOrder, updateTx,
      best, hasMonthData, dataDays,
    }),
    [
      menus, setMenus, categories, setCategories, marks, setMarks, sundayOff, setSundayOff,
      getMark, allTx, index, now, createOrder, updateTx, best, hasMonthData, dataDays,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
