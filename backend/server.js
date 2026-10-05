import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../frontend/dist');
const PORT = Number(process.env.PORT) || 3100;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

// Satu-satunya endpoint asli. Nanti diganti router API betulan.
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

// Aset ber-hash dari Vite boleh di-cache selamanya. index.html tidak di-serve di sini
// (index: false) supaya selalu lewat SPA fallback dan ikut ter-revalidate.
app.use(
  express.static(DIST, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`))
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  })
);

// SPA fallback: react-router menangani rute seperti /pemilik/menu di sisi klien.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' },
    });
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(DIST, 'index.html'), (err) => {
    // Build belum ada — lebih jelas daripada 500 mentah.
    if (err) res.status(503).send('Frontend belum di-build. Jalankan: npm run build di folder frontend.');
  });
});

app.listen(PORT, () => {
  console.log(`warkil-kasir listening on http://127.0.0.1:${PORT} (dist: ${DIST})`);
});
