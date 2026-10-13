import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';

const ok = (body) => new Response(JSON.stringify({ success: true, data: body }), { status: 200 });

function mount(role, path) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (String(url).includes('/auth/me')) return ok({ user: { id: 'u1', role, name: 'Pemilik Warung' }, shiftId: null });
      if (String(url).includes('/auth/cashiers')) return ok([{ id: 'c1', name: 'Siti Rahma' }]);
      return ok({});
    })
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        </AuthProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => vi.restoreAllMocks());

// The guard sends the wrong role to that role's login page, so the login page must not bounce a
// session of the other role back — the two rules would chase each other and freeze the tab.
test('pemilik yang membuka halaman kasir berhenti di layar login kasir', async () => {
  mount('OWNER', '/kasir');
  expect(await screen.findByRole('heading', { name: 'Login Kasir' })).toBeTruthy();
});

test('kasir yang membuka halaman pemilik berhenti di layar login pemilik', async () => {
  mount('CASHIER', '/pemilik');
  expect(await screen.findByRole('heading', { name: 'Login Pemilik' })).toBeTruthy();
});
