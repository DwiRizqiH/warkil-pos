import { defineConfig } from 'vitest/config';

// Task 3 menambahkan `env`, `globalSetup` dan `fileParallelism: false` begitu
// database uji (src/test/) ada.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.js'],
  },
});
