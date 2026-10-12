import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';

// Relatif ke file ini, bukan ke cwd: pm2 dan node --watch jalan dari direktori berbeda.
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');

export function serveStatic(app) {
  if (!fs.existsSync(distDir)) return;

  // Aset ber-hash dari Vite boleh di-cache selamanya. index.html tidak di-serve di sini
  // (index: false) supaya selalu lewat SPA fallback dan ikut ter-revalidate.
  app.use(
    express.static(distDir, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  // SPA fallback: react-router menangani rute seperti /pemilik/menu di sisi klien.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api/')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'), (err) => {
      // Build belum ada — lebih jelas daripada 500 mentah.
      if (err) res.status(503).send('Frontend belum di-build. Jalankan: npm run build di folder frontend.');
    });
  });
}
