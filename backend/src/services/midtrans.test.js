import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import { verifySignature } from './midtrans.js';

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
