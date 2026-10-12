import { defineConfig } from 'vitest/config';

// Environment variables for the tests. Task 3 replaces this with testEnv from src/test/
// once the test database exists, and adds globalSetup plus fileParallelism: false.
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
