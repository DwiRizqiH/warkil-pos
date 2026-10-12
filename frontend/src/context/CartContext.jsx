import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { cartCount, cartReducer, cartTotal, emptyCart } from './cartReducer.js';

const KEY = 'kikil:cart';
const Ctx = createContext(null);
export const useCart = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error('useCart harus dipakai di dalam CartProvider');
  return value;
};

function readStored() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY));
    if (!parsed || !Array.isArray(parsed.lines)) return emptyCart;
    return { lines: parsed.lines, orderType: parsed.orderType === 'take' ? 'take' : 'dine' };
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
