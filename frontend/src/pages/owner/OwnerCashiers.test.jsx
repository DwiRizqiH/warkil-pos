import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import OwnerCashiers from './OwnerCashiers.jsx';

const response = (data, status = 200) => new Response(JSON.stringify({ success: true, data }), { status });
let cashiers;

beforeEach(() => {
  cashiers = [{ id: 'c1', name: 'Siti Rahma', isActive: true }];
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (options.method === 'GET') return response(cashiers);
    if (String(url) === '/api/cashiers' && options.method === 'POST') {
      const values = JSON.parse(options.body);
      const cashier = { id: 'c2', ...values, isActive: true };
      cashiers.push(cashier);
      return response(cashier, 201);
    }
    if (String(url) === '/api/cashiers/c1' && options.method === 'PATCH') {
      Object.assign(cashiers[0], JSON.parse(options.body));
      return response(cashiers[0]);
    }
    if (String(url) === '/api/cashiers/c1/pin' && options.method === 'POST') return new Response(null, { status: 204 });
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  }));
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OwnerCashiers />
    </QueryClientProvider>
  );
}

test('owner can add, rename, deactivate, and change a cashier PIN', async () => {
  renderPage();
  expect(await screen.findByText('Siti Rahma')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: /tambah kasir/i }));
  fireEvent.change(screen.getByLabelText('Nama kasir'), { target: { value: 'Budi Santoso' } });
  fireEvent.change(screen.getByLabelText('PIN 4 digit'), { target: { value: '5678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Budi Santoso')).toBeTruthy();

  fireEvent.click(screen.getAllByRole('button', { name: 'Ubah nama' })[0]);
  fireEvent.change(screen.getByLabelText('Nama kasir'), { target: { value: 'Siti Rahmawati' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Siti Rahmawati')).toBeTruthy();

  fireEvent.click(within(sitiCard()).getByRole('button', { name: 'Nonaktifkan' }));
  await waitFor(() => expect(screen.getByText('Nonaktif')).toBeTruthy());

  fireEvent.click(within(sitiCard()).getByRole('button', { name: 'Ganti PIN' }));
  fireEvent.change(screen.getByLabelText('PIN 4 digit'), { target: { value: '4321' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

  expect(fetch).toHaveBeenCalledWith('/api/cashiers/c1/pin', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ pin: '4321' }),
  }));
});
