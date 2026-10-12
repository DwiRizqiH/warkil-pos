// Harga di keranjang hanya untuk tampilan; server yang menghitung harga pesanan.
export const emptyCart = { lines: [], orderType: 'dine' };

export function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { id, name, price } = action.menu;
      const existing = state.lines.find((l) => l.id === id);
      const lines = existing
        ? state.lines.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l))
        : [...state.lines, { id, name, price, qty: 1, note: '' }];
      return { ...state, lines };
    }
    case 'step':
      return {
        ...state,
        lines: state.lines
          .map((l) => (l.id === action.id ? { ...l, qty: l.qty + action.delta } : l))
          .filter((l) => l.qty > 0),
      };
    case 'remove':
      return { ...state, lines: state.lines.filter((l) => l.id !== action.id) };
    case 'note':
      return { ...state, lines: state.lines.map((l) => (l.id === action.id ? { ...l, note: action.note } : l)) };
    case 'orderType':
      return { ...state, orderType: action.orderType };
    case 'clear':
      return emptyCart;
    default:
      return state;
  }
}

export const cartCount = (state) => state.lines.reduce((sum, l) => sum + l.qty, 0);
export const cartTotal = (state) => state.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
export const qtyOf = (state, id) => state.lines.find((l) => l.id === id)?.qty || 0;
