import { defineConfig } from 'vitest/config';

// Variabel environment untuk tes. Task 3 menggantinya dengan testEnv dari src/test/
// begitu database uji ada, lalu menambahkan globalSetup dan fileParallelism: false.
const env = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://warkil:warkil@localhost:5433/warkil_kasir_test',
  JWT_SECRET: 'test-secret-yang-panjangnya-lebih-dari-32-karakter',
};

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env,
    include: ['src/**/*.test.js'],
  },
});
