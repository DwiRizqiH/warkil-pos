import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { CartProvider, useCart } from './CartContext.jsx';

function Probe() {
  const { lines, count, total, dispatch } = useCart();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <span data-testid="total">{total}</span>
      <span data-testid="lines">{lines.map((l) => `${l.qty}x${l.name}`).join(',')}</span>
      <button onClick={() => dispatch({ type: 'add', menu: { id: 'm1', name: 'Sop Kikil', price: 25000 } })}>add</button>
      <button onClick={() => dispatch({ type: 'clear' })}>clear</button>
    </div>
  );
}

const mount = () =>
  render(
    <CartProvider>
      <Probe />
    </CartProvider>
  );

beforeEach(() => sessionStorage.clear());

test('persists the cart to sessionStorage', () => {
  mount();
  act(() => screen.getByText('add').click());
  expect(JSON.parse(sessionStorage.getItem('kikil:cart')).lines).toEqual([
    { id: 'm1', name: 'Sop Kikil', price: 25000, qty: 1, note: '' },
  ]);
});

test('rehydrates the cart after a remount', () => {
  sessionStorage.setItem('kikil:cart', JSON.stringify({ lines: [{ id: 'd2', name: 'Es Teh Manis', price: 5000, qty: 3, note: '' }], orderType: 'take' }));
  mount();
  expect(screen.getByTestId('count').textContent).toBe('3');
  expect(screen.getByTestId('total').textContent).toBe('15000');
});

test('survives corrupted storage instead of crashing', () => {
  sessionStorage.setItem('kikil:cart', 'not json');
  mount();
  expect(screen.getByTestId('count').textContent).toBe('0');
});

// Keranjang datang dari sessionStorage, jadi isinya tidak dipercaya begitu saja.
test('drops stored lines with a malformed price or qty, so the total stays a number', () => {
  sessionStorage.setItem(
    'kikil:cart',
    JSON.stringify({
      lines: [
        { id: 'm1', name: 'Sop Kikil', price: 25000, qty: 2, note: '' },
        { id: 'm2', name: 'Tanpa harga', qty: 1 },
        { id: 'm3', name: 'Harga rusak', price: 'abc', qty: 1 },
        { id: 'm4', name: 'Jumlah nol', price: 5000, qty: 0 },
      ],
      orderType: 'dine',
    })
  );
  mount();
  expect(screen.getByTestId('lines').textContent).toBe('2xSop Kikil');
  expect(screen.getByTestId('count').textContent).toBe('2');
  expect(screen.getByTestId('total').textContent).toBe('50000');
});

test('clear empties the persisted cart', () => {
  mount();
  act(() => screen.getByText('add').click());
  act(() => screen.getByText('clear').click());
  expect(screen.getByTestId('lines').textContent).toBe('');
  expect(JSON.parse(sessionStorage.getItem('kikil:cart')).lines).toEqual([]);
});
