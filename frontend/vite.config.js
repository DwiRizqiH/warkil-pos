import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// host + allowedHosts dibuka supaya bisa diakses lewat VS Code Port Forwarding (Dev Tunnels)
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: { '/api': { target: 'http://127.0.0.1:3100', changeOrigin: false } },
  },
  preview: { host: true, port: 4173, allowedHosts: true },
  test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.{js,jsx}'] },
});
