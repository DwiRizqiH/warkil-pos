import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from './AuthContext.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import RequireRole from './RequireRole.jsx';

const ok = (body) => new Response(JSON.stringify({ success: true, data: body }), { status: 200 });
const fail = (code, message, status = 401) =>
  new Response(JSON.stringify({ success: false, error: { code, message } }), { status });
const asUser = (user) => vi.stubGlobal('fetch', vi.fn(async () => ok({ user })));

function mount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/pemilik']}>
            <Routes>
              <Route path="/pemilik/login" element={<div>halaman login pemilik</div>} />
              <Route
                path="/pemilik"
                element={
                  <RequireRole role="OWNER" loginPath="/pemilik/login">
                    <div>dasbor</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

test('mengalihkan ke login saat belum masuk', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => fail('UNAUTHORIZED', 'Belum masuk')));
  mount();
  await waitFor(() => expect(screen.getByText('halaman login pemilik')).toBeTruthy());
});

test('mengalihkan kasir yang membuka halaman pemilik', async () => {
  asUser({ id: 'c1', role: 'CASHIER', name: 'Siti Rahma' });
  mount();
  await waitFor(() => expect(screen.getByText('halaman login pemilik')).toBeTruthy());
});

test('menampilkan halaman saat perannya cocok', async () => {
  asUser({ id: 'o1', role: 'OWNER', name: 'Pemilik' });
  mount();
  await waitFor(() => expect(screen.getByText('dasbor')).toBeTruthy());
});
