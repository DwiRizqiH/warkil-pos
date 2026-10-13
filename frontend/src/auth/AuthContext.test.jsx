import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { CartProvider, useCart } from '../context/CartContext.jsx';

function Probe() {
  const { user, loginCashier, logout } = useAuth();
  const cart = useCart();
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'kosong'}</span>
      <span data-testid="lines">{cart.lines.length}</span>
      <button onClick={() => cart.dispatch({ type: 'add', menu: { id: 'm1', name: 'Sop', price: 25000 } })}>add</button>
      <button onClick={() => loginCashier.mutate({ cashierId: 'c1', pin: '1234' })}>login</button>
      <button onClick={() => logout.mutate()}>logout</button>
    </div>
  );
}

function mount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

const ok = (body) => new Response(JSON.stringify({ success: true, data: body }), { status: 200 });
const fail = (code, message, status = 401) =>
  new Response(JSON.stringify({ success: false, error: { code, message } }), { status });

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

test('memuat sesi yang sudah ada lewat GET /api/auth/me', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ok({ user: { id: 'c1', role: 'CASHIER', name: 'Siti Rahma' }, shiftId: 's1' })));
  mount();
  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Siti Rahma'));
});

test('sesi kosong saat server membalas 401', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => fail('UNAUTHORIZED', 'Belum masuk')));
  mount();
  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('kosong'));
});

test('login kasir mengosongkan keranjang milik kasir sebelumnya', async () => {  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options) => {
      if (String(url).includes('/auth/me')) return fail('UNAUTHORIZED', 'Belum masuk');
      if (String(url).includes('/auth/cashier/login') && options?.method === 'POST') {
        return ok({ user: { id: 'c2', role: 'CASHIER', name: 'Budi Santoso' }, shiftId: 's2' });
      }
      return ok({});
    })
  );

  mount();
  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('kosong'));
  act(() => screen.getByText('add').click());
  expect(screen.getByTestId('lines').textContent).toBe('1');

  await act(async () => {
    screen.getByText('login').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Budi Santoso'));
  expect(screen.getByTestId('lines').textContent).toBe('0');
  expect(JSON.parse(sessionStorage.getItem('kikil:cart')).lines).toEqual([]);
});

test('logout mengosongkan keranjang sebelum kasir berikutnya memakai tablet', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options) => {
      if (String(url).includes('/auth/me') && options?.method === 'GET') return fail('UNAUTHORIZED', 'Belum masuk');
      return new Response(null, { status: 204 });
    })
  );

  mount();
  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('kosong'));
  act(() => screen.getByText('add').click());
  expect(screen.getByTestId('lines').textContent).toBe('1');

  await act(async () => {
    screen.getByText('logout').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.getByTestId('lines').textContent).toBe('0');
  expect(JSON.parse(sessionStorage.getItem('kikil:cart')).lines).toEqual([]);
});

// A session that expired overnight makes POST /auth/logout answer 401; the tablet is logged out
// all the same, so the screen must stop acting as if someone is still signed in.
test('logout tetap mengakhiri sesi saat server membalas 401', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options) => {
      if (String(url).includes('/auth/me')) return ok({ user: { id: 'c1', role: 'CASHIER', name: 'Siti Rahma' }, shiftId: 's1' });
      if (String(url).includes('/auth/logout') && options?.method === 'POST') return fail('UNAUTHORIZED', 'Sesi tidak valid');
      return ok({});
    })
  );

  mount();
  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Siti Rahma'));

  await act(async () => {
    screen.getByText('logout').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('kosong'));
});
