import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { unavailable } from '../lib/errors.js';

const apiBase = env.MIDTRANS_IS_PRODUCTION ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';

function assertConfigured() {
  if (!env.MIDTRANS_SERVER_KEY) throw unavailable('Pembayaran QRIS belum dikonfigurasi');
}

async function call(path, init = {}) {
  assertConfigured();
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString('base64')}`,
    },
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error(payload?.status_message ?? `Midtrans membalas HTTP ${res.status}`), {
      code: 'MIDTRANS',
      payload,
    });
  }
  return payload;
}

export function createQrisCharge({ orderId, amount }) {
  return call('/v2/charge', {
    method: 'POST',
    body: JSON.stringify({
      payment_type: 'qris',
      transaction_details: { order_id: orderId, gross_amount: amount },
      qris: { acquirer: 'gopay' },
    }),
  });
}

export function getTransactionStatus(orderId) {
  return call(`/v2/${encodeURIComponent(orderId)}/status`);
}

// Midtrans signs order_id + status_code + gross_amount + server key with SHA-512; comparing raw
// lengths first keeps timingSafeEqual from throwing on a malformed signature.
export function verifySignature({ order_id, status_code, gross_amount, signature_key }) {
  if (!env.MIDTRANS_SERVER_KEY || typeof signature_key !== 'string') return false;
  const expected = createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${env.MIDTRANS_SERVER_KEY}`)
    .digest();
  const actual = Buffer.from(signature_key, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
