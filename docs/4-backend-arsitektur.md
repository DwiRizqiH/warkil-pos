# Backend Architecture — Warung Kikil Abang POS

## 1. Tumpukan Teknologi

| Komponen | Pilihan | Alasan |
|---|---|---|
| Runtime | Node.js 20 LTS | Sesuai permintaan mitra |
| Framework HTTP | Express.js | Ringan, ekosistem middleware luas, cocok untuk API skala UMKM |
| ORM | Prisma | Skema terketik (type-safe), migrasi otomatis, cocok dipetakan langsung dari ERD |
| Database | PostgreSQL (rekomendasi) | Dukungan enum native (`role`, `payment_status`, dll.) — MySQL tetap kompatibel via Prisma bila dipilih |
| Autentikasi | JWT (`jsonwebtoken`) + `bcrypt` | Stateless, cukup untuk skala 1 warung, tanpa perlu session store terpisah |
| Validasi input | `zod` | Skema validasi request body/query yang konsisten dengan frontend |
| Payment Gateway | Midtrans Core API (`midtrans-client`) | Lihat `7-integrasi-midtrans.md` |
| Logging | `pino` | Logging terstruktur, penting untuk audit log notifikasi pembayaran |
| Keamanan HTTP | `helmet`, `cors`, `express-rate-limit` | Header aman, pembatasan origin, pembatasan percobaan login |

## 2. Struktur Folder

```
src/
├── server.ts                 # entry point, start HTTP server
├── app.ts                    # setup Express app & middleware global
├── config/
│   ├── env.ts                 # validasi & baca environment variables
│   └── midtrans.ts            # konfigurasi client Midtrans
├── routes/
│   ├── auth.routes.ts
│   ├── users.routes.ts
│   ├── categories.routes.ts
│   ├── menus.routes.ts
│   ├── transactions.routes.ts
│   ├── payments.routes.ts
│   └── reports.routes.ts
├── controllers/               # menerima request, memanggil service, membentuk response
├── services/                  # logika bisnis inti (hitung total, agregasi laporan, dsb.)
├── repositories/              # akses data via Prisma Client
├── middlewares/
│   ├── auth.middleware.ts     # verifikasi JWT
│   ├── rbac.middleware.ts     # cek role (kasir/pemilik)
│   ├── validate.middleware.ts # jalankan skema zod
│   └── errorHandler.middleware.ts
├── validators/                 # skema zod per endpoint
├── utils/
│   ├── apiResponse.ts          # format response standar
│   └── signature.ts            # verifikasi signature webhook Midtrans
└── prisma/
    └── schema.prisma           # lihat 5-backend-database.md
```

## 3. Arsitektur Berlapis (Layered Architecture)

```
Request
   │
   ▼
Route ──▶ Middleware (auth, RBAC, validasi)
   │
   ▼
Controller  (hanya menerjemahkan HTTP ⇄ pemanggilan service, tanpa logika bisnis)
   │
   ▼
Service     (logika bisnis: hitung subtotal/total, agregasi laporan, alur pembayaran)
   │
   ▼
Repository  (query Prisma ke database)
   │
   ▼
Database (PostgreSQL)
```

Pemisahan ini memastikan logika penting — misalnya **perhitungan ulang total transaksi di
server** (bukan memercayai angka dari frontend) — berada di lapisan `service`, terpisah dari
detail HTTP maupun detail query database, sehingga mudah diuji secara unit test.

## 4. Alur Autentikasi & Role-Based Access Control (RBAC)

```
POST /api/auth/login  { username, password }
        │
        ▼
 Verifikasi password (bcrypt.compare terhadap hash di tabel users)
        │
        ▼
 Terbitkan JWT berisi { userId, role, exp } → dikirim ke klien
        │
        ▼
 Setiap request berikutnya menyertakan header:
   Authorization: Bearer <token>
        │
        ▼
 auth.middleware memverifikasi token & menempelkan req.user
        │
        ▼
 rbac.middleware(["pemilik"]) menolak akses bila req.user.role tidak sesuai
```

Contoh pemetaan RBAC ke endpoint (rinci di `6-backend-api.md`):

| Aksi | Kasir | Pemilik |
|---|:---:|:---:|
| Lihat daftar menu | ✅ | ✅ |
| Tambah/ubah/hapus menu & kategori | ❌ | ✅ |
| Buat transaksi & proses pembayaran | ✅ | ✅ |
| Lihat riwayat transaksi | ✅ | ✅ |
| Lihat laporan penjualan & menu terlaris | ❌ | ✅ |
| Kelola akun pengguna (tambah kasir baru) | ❌ | ✅ |

## 5. Format Response Standar

Semua endpoint mengembalikan bentuk response yang konsisten agar frontend dapat menangani
sukses/gagal secara seragam:

```jsonc
// Sukses
{
  "success": true,
  "data": { /* ... */ }
}

// Gagal
{
  "success": false,
  "error": {
    "code": "MENU_NOT_FOUND",
    "message": "Menu tidak ditemukan"
  }
}
```

`errorHandler.middleware.ts` menangkap seluruh error (termasuk error validasi zod dan error
Prisma) dan menerjemahkannya ke format di atas beserta HTTP status code yang sesuai (400, 401,
403, 404, 409, 500).

## 6. Checklist Keamanan

- [ ] Password disimpan sebagai hash `bcrypt` (bukan plain text), sesuai kolom `password` pada
      entitas Users.
- [ ] Rate limiting pada `POST /api/auth/login` untuk mencegah brute force.
- [ ] Endpoint webhook Midtrans (`POST /api/payments/midtrans/callback`) diverifikasi
      menggunakan signature key, **bukan** hanya mengandalkan IP atau header biasa (lihat
      `7-integrasi-midtrans.md`).
- [ ] `helmet` aktif untuk header keamanan HTTP standar.
- [ ] CORS dibatasi hanya ke origin frontend resmi (domain aplikasi kasir), bukan `*`.
- [ ] Server Key Midtrans hanya berada di environment variable backend, tidak pernah dikirim
      ke frontend.
- [ ] Total transaksi selalu dihitung ulang di backend dari harga menu di database, tidak
      memercayai nilai `total_price` yang dikirim klien.

## 7. Catatan Deployment (Ringkas)

| Aspek | Rekomendasi |
|---|---|
| Process manager | `pm2` untuk auto-restart & log rotation di VPS kecil |
| Reverse proxy | Nginx, sekaligus menangani HTTPS (wajib — Midtrans mensyaratkan HTTPS untuk URL notifikasi produksi) |
| Environment | Pisahkan `.env` sandbox dan production, terutama kredensial Midtrans |
| Migrasi database | `npx prisma migrate deploy` dijalankan sebagai bagian dari proses deploy |
