import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../../store.jsx', () => ({
  useStore: () => ({ session: { cashier: 'Siti Rahma' }, logout: vi.fn(), now: new Date(2026, 9, 13, 10, 0) }),
}));
vi.mock('../../components/EventBanner.jsx', () => ({ default: () => null }));

const { default: CashierLayout } = await import('./CashierLayout.jsx');

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/kasir" element={<CashierLayout />}>
          <Route index element={<div>pos</div>} />
          <Route path="penjualan" element={<div>penjualan</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

// Drawer tertutup punya aria-hidden, jadi link di dalamnya harus dicari dengan { hidden: true }.
const navLink = (name) => screen.getByRole('link', { name, hidden: true });

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
