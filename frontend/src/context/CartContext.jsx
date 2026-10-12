import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { cartCount, cartReducer, cartTotal, emptyCart } from './cartReducer.js';

const KEY = 'kikil:cart';
const Ctx = createContext(null);
export const useCart = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error('useCart harus dipakai di dalam CartProvider');
  return value;
};

// Isi sessionStorage bisa saja rusak atau ditulis tangan, jadi setiap baris disaring dulu:
// baris tanpa id atau dengan harga/jumlah bukan angka akan membuat total NaN.
function validLine(l) {
  return (
    l &&
    typeof l.id === 'string' &&
    l.id !== '' &&
    Number.isFinite(Number(l.price)) &&
    Number.isFinite(Number(l.qty)) &&
    Number(l.qty) > 0
  );
}

function readStored() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY));
    if (!parsed || !Array.isArray(parsed.lines)) return emptyCart;
    const lines = parsed.lines.filter(validLine).map((l) => ({ ...l, price: Number(l.price), qty: Number(l.qty) }));
    return { lines, orderType: parsed.orderType === 'take' ? 'take' : 'dine' };
  } catch {
    return emptyCart;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, readStored);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* sessionStorage penuh atau diblokir — keranjang tetap jalan di memori */
    }
  }, [state]);

  const value = useMemo(
    () => ({ ...state, dispatch, count: cartCount(state), total: cartTotal(state) }),
    [state]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
