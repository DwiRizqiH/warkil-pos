import { defineConfig } from 'vitest/config';
import { testEnv } from './src/test/testEnv.js';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: testEnv,
    globalSetup: ['./src/test/globalSetup.js'],
    // Every test file shares one database, so they must not run in parallel.
    fileParallelism: false,
    include: ['src/**/*.test.js'],
  },
});
