// CI passes its own TEST_DATABASE_URL; the default keeps a local run zero-config.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://warkil:warkil@localhost:5434/warkil_kasir_test';

// Loaded by vitest.config.js before any module import, because src/config/env.js validates at import time.
export const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: TEST_DATABASE_URL,
  JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  HOST: '127.0.0.1',
  MIDTRANS_IS_PRODUCTION: 'false',
  MIDTRANS_SERVER_KEY: 'SB-Mid-server-test',
};
