import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api/client.js';
import { useAuth } from './auth/AuthContext.jsx';
import { DEFAULT_MENUS, generateHistory } from './data.js';
import { bestSellers, buildIndex } from './selectors.js';
import { daysBetween, parseYmd, useNow, ymd } from './utils.js';

const PREFIX = 'kikil:v4:';
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
  const { user } = useAuth();
  // Menus and categories live in the database; the browser only keeps personal UI state.
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menusLoading, setMenusLoading] = useState(true);
  const [marks, setMarks] = usePersist('marks', {});
  const [sundayOff, setSundayOff] = usePersist('sundayOff', false);
  const [overrides, setOverrides] = usePersist('overrides', {});
  const [serverTx, setServerTx] = useState([]);
  const now = useNow(15000);
  const todayStr = ymd(now);

  const refreshMenus = useCallback(async () => {
    const data = await api.get('/menus');
    setMenus(data.menus);
    setCategories(data.categories);
    setMenusLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setMenus([]);
      setCategories([]);
      setMenusLoading(false);
      return;
    }
    refreshMenus().catch(() => setMenusLoading(false));
  }, [user, refreshMenus]);

  const baseApplied = useMemo(
    () => BASE.map((t) => (overrides[t.id] ? { ...t, ...overrides[t.id] } : t)),
    [overrides]
  );
  // Server orders replace the demo row with the same code, so today's queue never appears twice.
  const allTx = useMemo(() => {
    const byId = new Map(baseApplied.map((t) => [t.id, t]));
    for (const t of serverTx) byId.set(t.id, t);
    return [...byId.values()];
  }, [baseApplied, serverTx]);
  const index = useMemo(() => buildIndex(allTx), [allTx]);
  const menusById = useMemo(() => new Map(menus.map((m) => [m.id, m])), [menus]);

  const dataDays = daysBetween(BASE[0].date, todayStr) + 1;
  const hasMonthData = dataDays >= 30;
  const best = useMemo(
    () => (hasMonthData ? bestSellers(index, new Date(), menusById) : []),
    [hasMonthData, index, todayStr, menusById] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const mergeServerOrders = useCallback((rows) => {
    setServerTx((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      for (const t of rows) byId.set(t.id, { ...byId.get(t.id), ...t });
      return [...byId.values()];
    });
  }, []);

  const updateTx = useCallback(
    (id, patch) => {
      if (serverTx.some((t) => t.id === id)) {
        setServerTx((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        return;
      }
      setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    },
    [serverTx, setOverrides]
  );

  const getMark = useCallback(
    (date) =>
      marks[date] || (sundayOff && parseYmd(date).getDay() === 0 ? { type: 'libur', auto: true } : null),
    [marks, sundayOff]
  );

  const value = useMemo(
    () => ({
      menus, categories, menusLoading, refreshMenus,
      marks, setMarks, sundayOff, setSundayOff,
      getMark, allTx, index, now, mergeServerOrders, updateTx,
      best, hasMonthData, dataDays,
    }),
    [
      menus, categories, menusLoading, refreshMenus,
      marks, setMarks, sundayOff, setSundayOff,
      getMark, allTx, index, now, mergeServerOrders, updateTx, best, hasMonthData, dataDays,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
