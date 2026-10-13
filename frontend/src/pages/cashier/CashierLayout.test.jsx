import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../../store.jsx', () => ({
  useStore: () => ({ now: new Date(2026, 9, 13, 10, 0) }),
}));
vi.mock('../../auth/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { name: 'Siti Rahma', role: 'CASHIER' },
    logout: { mutateAsync: vi.fn(async () => {}) },
  }),
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
        <Route path="/kasir/login" element={<div>login</div>} />
      </Routes>
    </MemoryRouter>
  );

// The closed drawer carries aria-hidden, so its links are only reachable with { hidden: true }.
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

test('logging out returns to the login screen', async () => {
  renderAt('/kasir');
  await act(async () => {
    screen.getByRole('button', { name: /log out/i, hidden: true }).click();
  });
  expect(screen.getByText('login')).toBeTruthy();
});
