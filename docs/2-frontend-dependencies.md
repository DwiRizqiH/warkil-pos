# Frontend Dependencies — Aktual

Versi persis dan scripts mengikuti `frontend/package.json` serta lockfile.

## 1. Runtime dan Scripts

- React `18.3.1`, JavaScript ESM/JSX (tanpa TypeScript).
- Vite `5.4.11` dengan plugin React.
- Node.js yang disarankan mengikuti kebutuhan Vite dan paket; backend secara eksplisit meminta
  Node.js `>=20`.

| Script | Perintah |
|---|---|
| `dev` | `vite --host` |
| `build` | `vite build` |
| `preview` | `vite preview --host` |
| `lint` | `eslint .` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |

Vite dev server berjalan pada port `5173`, mem-proxy `/api` ke `127.0.0.1:3100` dan
`/socket.io` ke backend.

## 2. Dependencies Runtime

| Package | Pemakaian aktual |
|---|---|
| `react`, `react-dom` | UI dan rendering |
| `react-router-dom` | Routing halaman |
| `@tanstack/react-query` | Query/mutation untuk sesi dan pengelolaan kasir |
| `socket.io-client` | Menerima notifikasi pesanan baru |
| `qrcode.react` | Menggambar QR mock di modal pembayaran |
| `recharts` | Chart pada visualisasi laporan |
| `datatables.net-react`, `datatables.net-dt` | Tabel penjualan pemilik |

Frontend juga menggunakan browser `fetch`, React Context/hooks, dan `localStorage`; tidak ada
Axios atau Zustand.

## 3. Development Dependencies

| Package | Pemakaian aktual |
|---|---|
| `vite`, `@vitejs/plugin-react` | Dev server dan build |
| `vitest`, `jsdom` | Test runner dan DOM test environment |
| `@testing-library/react` | Pengujian komponen |
| `eslint`, `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `globals` | Lint |

`typescript`, Tailwind, PostCSS, React Hook Form, dan Zod tidak tercantum pada dependencies
frontend.

## 4. Komunikasi Backend dan Variabel

`src/api/client.js` memanggil path relatif `/api`, memakai `credentials: 'include'` karena
sesi berada di cookie `httpOnly`. Untuk development, proxy ditetapkan pada `vite.config.js`.
Tidak ada `VITE_API_BASE_URL` atau client key Midtrans pada alur frontend aktual.

## 5. Pengujian

Vitest dikonfigurasi untuk menjalankan `src/**/*.test.{js,jsx}` dengan environment `jsdom`.
