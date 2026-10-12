import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://warkil:warkil@localhost:5433/warkil_kasir',
  JWT_SECRET: 'a'.repeat(32),
};

describe('parseEnv', () => {
  it('memberi default sandbox untuk Midtrans', () => {
    const env = parseEnv(base);
    expect(env.MIDTRANS_IS_PRODUCTION).toBe(false);
    expect(env.PORT).toBe(3100);
    expect(env.HOST).toBe('127.0.0.1');
  });

  it('membaca MIDTRANS_IS_PRODUCTION=false sebagai false, bukan truthy string', () => {
    expect(parseEnv({ ...base, MIDTRANS_IS_PRODUCTION: 'false' }).MIDTRANS_IS_PRODUCTION).toBe(false);
    expect(parseEnv({ ...base, MIDTRANS_IS_PRODUCTION: 'true' }).MIDTRANS_IS_PRODUCTION).toBe(true);
  });

  it('menolak konfigurasi yang kurang, dengan menyebut nama variabelnya', () => {
    expect(() => parseEnv({ JWT_SECRET: 'a'.repeat(32) })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...base, JWT_SECRET: 'pendek' })).toThrow(/JWT_SECRET/);
  });
});
