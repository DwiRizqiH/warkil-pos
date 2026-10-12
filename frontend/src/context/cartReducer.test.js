import { cartCount, cartReducer, cartTotal, emptyCart, qtyOf } from './cartReducer.js';

const sop = { id: 'm1', name: 'Sop Kikil', price: 25000 };
const es = { id: 'd2', name: 'Es Teh Manis', price: 5000 };

test('add creates a line the first time and increments it after', () => {
  const once = cartReducer(emptyCart, { type: 'add', menu: sop });
  const twice = cartReducer(once, { type: 'add', menu: sop });
  expect(twice.lines).toHaveLength(1);
  expect(qtyOf(twice, 'm1')).toBe(2);
  expect(cartTotal(twice)).toBe(50000);
});

test('add keeps separate lines for separate menus', () => {
  const state = cartReducer(cartReducer(emptyCart, { type: 'add', menu: sop }), { type: 'add', menu: es });
  expect(state.lines.map((l) => l.id)).toEqual(['m1', 'd2']);
  expect(cartCount(state)).toBe(2);
  expect(cartTotal(state)).toBe(30000);
});

test('stepping a line below one item removes it', () => {
  const state = cartReducer(cartReducer(emptyCart, { type: 'add', menu: sop }), { type: 'step', id: 'm1', delta: -1 });
  expect(state.lines).toEqual([]);
});

test('note is stored per line', () => {
  const state = cartReducer(cartReducer(emptyCart, { type: 'add', menu: sop }), { type: 'note', id: 'm1', note: 'tanpa sambal' });
  expect(state.lines[0].note).toBe('tanpa sambal');
});

test('remove drops only the requested line', () => {
  const both = cartReducer(cartReducer(emptyCart, { type: 'add', menu: sop }), { type: 'add', menu: es });
  expect(cartReducer(both, { type: 'remove', id: 'd2' }).lines.map((l) => l.id)).toEqual(['m1']);
});

test('clear resets lines and order type', () => {
  const state = cartReducer(
    cartReducer(cartReducer(emptyCart, { type: 'add', menu: sop }), { type: 'orderType', orderType: 'take' }),
    { type: 'clear' }
  );
  expect(state).toEqual({ lines: [], orderType: 'dine' });
});
