# Arsitektur Backend — Aktual

## 1. Tumpukan Teknologi

| Komponen | Implementasi |
|---|---|
| Runtime | Node.js `>=20`, JavaScript ESM langsung dari `src/` |
| HTTP | Express 4 |
| Database | PostgreSQL melalui Prisma 6 |
| Validasi | Zod pada middleware route |
| Sesi | JWT pada cookie `wk_session` beratribut `httpOnly`; hash password/PIN memakai `bcryptjs` |
| Realtime | Socket.IO untuk `order:created` |
| Logging/HTTP security | Pino, Helmet, CORS, express-rate-limit |

## 2. Struktur Aktual

```text
backend/src/
├── app.js                 # Express middleware, API router, static serving
├── server.js              # HTTP + Socket.IO server, auth socket, shutdown
├── config/env.js          # Zod validation environment
├── lib/                   # Prisma, error/response, WIB, logger, realtime
├── middleware/            # autentikasi/role, validasi, error handler
├── routes/                # auth, cashiers, orders
└── services/              # auth, orders/pricing, shifts
backend/prisma/
├── schema.prisma
└── migrations/
```

Tidak ada controller atau repository terpisah. Route memvalidasi input, memanggil service atau
Prisma, lalu membentuk response.

## 3. Alur Request dan Data

```text
HTTP request
  → Express middleware (Helmet, logging, JSON, cookie, CORS)
  → /api route
  → autentikasi + validasi Zod
  → service / Prisma Client
  → PostgreSQL
```

API dipasang pada `/api`. Endpoint yang tersedia hanya health, auth, cashiers, dan orders;
daftar rincinya ada di `6-backend-api.md`.

Untuk pesanan, backend mengambil menu dari database, memvalidasi dan menghitung harga di
`services/pricing.js`, memastikan shift kasir aktif, lalu dalam transaksi database menyimpan
order, item, dan payment. Setelah penyimpanan berhasil, event disiarkan ke room Socket.IO
`staff`.

## 4. Sesi dan Akses

- Login pemilik memakai username/password; login kasir memakai ID kasir/PIN empat digit.
- Token JWT bertahan 12 jam dan disetel pada cookie `wk_session`.
- Kasir dikunci selama 15 menit setelah lima PIN salah. Login pemilik menggunakan penundaan
  progresif, bukan lockout tersebut.
- Login dibatasi per IP oleh rate limiter (default 10 percobaan per 15 menit).
- Endpoint pengelolaan kasir khusus `OWNER`; membuat order khusus `CASHIER`; daftar order
  dapat dibaca kedua role, dengan kasir terbatas pada tanggal bisnis hari ini.
- Cookie socket juga diverifikasi sebelum koneksi bergabung ke room `staff`.

## 5. Response dan Error

Sukses memakai `{ "success": true, "data": ... }`; error memakai
`{ "success": false, "error": { "code": ..., "message": ... } }`. Logout dan penggantian PIN
mengembalikan HTTP 204 tanpa body.

## 6. Konfigurasi dan Frontend Statis

Environment yang divalidasi didefinisikan di `backend/src/config/env.js`: `NODE_ENV`, `PORT`,
`HOST`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, serta variabel `MIDTRANS_*`.
Variabel Midtrans saat ini hanya dibaca; belum ada integrasi pembayaran di kode.

Jika `frontend/dist` ada, backend melayani berkas statis dan fallback SPA. Jika belum dibangun,
backend tetap dapat melayani API dan static serving dilewati.

## 7. Hal yang Belum Ada

- Lapisan controller/repository terpisah.
- API backend untuk menu, kategori, laporan, atau pembaruan status pesanan.
- Pemrosesan Midtrans dan webhook.
- Kesesuaian penuh data demo frontend dengan database.
