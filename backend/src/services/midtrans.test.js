import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env.js';
import { createQrisCharge, verifySignature } from './midtrans.js';

const notification = (orderId, statusCode, grossAmount, key = env.MIDTRANS_SIGNATURE_SECRET) => ({
  order_id: orderId,
  status_code: statusCode,
  gross_amount: grossAmount,
  signature_key: createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${key}`)
    .digest('hex'),
});

describe('verifySignature', () => {
  it('menerima signature SHA-512 yang dibuat dengan signature secret', () => {
    expect(verifySignature(notification('TRX-1-1', '200', '20000.00'))).toBe(true);
  });

  it('masih menerima signature lama yang dibuat dengan server key', () => {
    expect(verifySignature(notification('TRX-1-1', '200', '20000.00', env.MIDTRANS_SERVER_KEY))).toBe(true);
  });

  it('menolak payload yang diubah setelah ditandatangani', () => {
    const payload = notification('TRX-1-1', '200', '20000.00');
    expect(verifySignature({ ...payload, gross_amount: '1000.00' })).toBe(false);
  });

  it('menolak signature yang bentuknya rusak tanpa melempar', () => {
    expect(verifySignature({ ...notification('TRX-1-1', '200', '20000.00'), signature_key: 'abc' })).toBe(false);
    expect(verifySignature({ order_id: 'TRX-1-1', status_code: '200', gross_amount: '20000.00' })).toBe(false);
  });
});

describe('createQrisCharge', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('memakai URL notifikasi dari environment, bukan setelan dashboard', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ status_code: '201' }) }));
    vi.stubGlobal('fetch', fetchMock);

    await createQrisCharge({ orderId: 'TRX-1-1', amount: 20000 });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['x-override-notification']).toBe(env.MIDTRANS_NOTIFICATION_URL);
  });
});
