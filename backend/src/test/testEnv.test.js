import { afterEach, expect, it, vi } from 'vitest';

const DEFAULT_URL = 'postgresql://warkil:warkil@localhost:5434/warkil_kasir_test';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('memakai TEST_DATABASE_URL dari environment bila diisi', async () => {
  vi.stubEnv('TEST_DATABASE_URL', 'postgresql://lain:lain@lainhost:5432/lain');
  const { TEST_DATABASE_URL, testEnv } = await import('./testEnv.js');
  expect(TEST_DATABASE_URL).toBe('postgresql://lain:lain@lainhost:5432/lain');
  expect(testEnv.DATABASE_URL).toBe(TEST_DATABASE_URL);
});

it('memakai basis data uji bawaan saat environment tidak mengisinya', async () => {
  vi.stubEnv('TEST_DATABASE_URL', '');
  const { TEST_DATABASE_URL } = await import('./testEnv.js');
  expect(TEST_DATABASE_URL).toBe(DEFAULT_URL);
});
