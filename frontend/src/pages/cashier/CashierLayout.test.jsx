import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { CartProvider } from '../../context/CartContext.jsx';

vi.mock('../../store.jsx', () => ({
  useStore: () => ({ session: { cashier: 'Siti Rahma' }, logout: vi.fn(), now: new Date(2026, 9, 13, 10, 0) }),
}));
vi.mock('../../components/EventBanner.jsx', () => ({ default: () => null }));

const { default: CashierLayout } = await import('./CashierLayout.jsx');

// Layout kasir memakai keranjang (dikosongkan saat log out), jadi providernya ikut dipasang.
const renderAt = (path) =>
  render(
    <CartProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/kasir" element={<CashierLayout />}>
            <Route index element={<div>pos</div>} />
            <Route path="penjualan" element={<div>penjualan</div>} />
          </Route>
          <Route path="/kasir/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    </CartProvider>
  );

// Drawer tertutup punya aria-hidden, jadi link di dalamnya harus dicari dengan { hidden: true }.
const navLink = (name) => screen.getByRole('link', { name, hidden: true });

beforeEach(() => sessionStorage.clear());

test('has a "Buat Pesanan" entry that is active on the POS page', () => {
  renderAt('/kasir');
  const link = navLink(/buat pesanan/i);
  expect(link.getAttribute('href')).toBe('/kasir');
  expect(link.className).toContain('active');
});

test('"Buat Pesanan" is not active on another cashier page, so it can be clicked back', () => {
  renderAt('/kasir/penjualan');
  expect(navLink(/buat pesanan/i).className).not.toContain('active');
  expect(navLink(/penjualan/i).className).toContain('active');
});

// Tablet kasir dipakai bergantian: keranjang kasir sebelumnya tidak boleh ikut ke kasir berikutnya.
test('logging out empties the cart so the next cashier does not inherit it', () => {
  sessionStorage.setItem(
    'kikil:cart',
    JSON.stringify({ lines: [{ id: 'm1', name: 'Sop Kikil', price: 25000, qty: 2, note: '' }], orderType: 'dine' })
  );
  renderAt('/kasir');
  act(() => screen.getByRole('button', { name: /log out/i, hidden: true }).click());
  expect(JSON.parse(sessionStorage.getItem('kikil:cart')).lines).toEqual([]);
});
