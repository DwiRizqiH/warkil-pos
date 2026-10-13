# Warkil-Kasir

Aplikasi kasir (POS) Warung Kikil Abang. `backend/` = REST API Express + Prisma
(JavaScript ESM, dijalankan langsung dari `src/`, tanpa langkah build),
`frontend/` = aplikasi React (Vite) yang juga dilayani sebagai berkas statis
oleh backend di production.

## Perintah

```bash
docker compose up -d              # PostgreSQL dev (5433) + database uji (5434)
cd backend && npm run migrate     # prisma migrate dev
cd backend && npm run seed        # data dasar
cd backend && npm run seed:demo   # riwayat 120 hari, hanya untuk development
cd backend && npm run seed:reset  # hapus pesanan dan shift, sisakan menu dan kasir
cd backend && npm run dev         # API di http://127.0.0.1:3100
cd frontend && npm run dev        # Vite di http://localhost:5173, proxy /api
```

Sebelum setiap commit: `npm run lint`, `npm test`, `npm run build` (frontend) di
kedua aplikasi. Di `backend/` tes memakai database uji di port 5434 dan
mem-truncate tabel — jangan mengarahkan `DATABASE_URL` ke database uji dari sesi
kerja biasa, dan jangan menjalankan `seed:demo` di production.

## Aturan kode

- Nama harus menjelaskan dirinya sendiri. Kalau sebuah nama butuh komentar
  penjelas, ganti namanya.
- Komentar hanya untuk hal yang tidak bisa dibaca dari kode: alasan verifikasi
  tanda tangan Midtrans, idempotensi webhook, kuirk pemetaan status, penanganan
  balapan (concurrency), zona waktu dan pembulatan, serta workaround. Tanpa
  komentar basa-basi, tanpa spanduk pemisah seksi, tanpa kode yang dimatikan,
  tanpa `TODO` berserakan, tanpa JSDoc.
- Satu fungsi satu tugas. Tidak ada abstraksi yang belum dipakai, tidak ada kode
  mati.
- Backend dan frontend sama-sama JavaScript ESM. Frontend memakai JSX tanpa
  TypeScript dan tanpa Tailwind; gaya visual ada di `frontend/src/index.css`.
- Handler route async selalu memakai `try { … } catch (err) { next(err) }` —
  Express 4 tidak meneruskan promise yang ditolak.
- Uang selalu bilangan bulat rupiah. Tidak ada `float`/`Decimal` untuk uang.
- Waktu disimpan UTC, tanggal bisnis dihitung lewat `backend/src/lib/wib.js`
  (Asia/Jakarta). Jangan memakai `getDate()`/`getHours()` untuk logika bisnis.
- Semua input divalidasi Zod di batas route. Server menghitung harga, status dan
  nomor antrian sendiri — nilai dari klien tidak pernah dipercaya.
- Endpoint hanya mengembalikan data yang dibutuhkan perannya. `pinHash`,
  `passwordHash` dan `failedPinCount` tidak pernah keluar dari server.
- Rahasia tidak masuk repo. `.env` ada di server, repo hanya memuat
  `.env.example`.
- Angka rupiah di UI lewat `rupiah()` di `frontend/src/utils.js`.
