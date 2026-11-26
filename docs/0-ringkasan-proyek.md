# Ringkasan Proyek — Warkil-Kasir

## 1. Tujuan dan Status Implementasi

Warkil-Kasir adalah aplikasi POS berbasis web untuk Warung Kikil Abang. Repositori saat ini
berisi frontend kasir/pemilik, REST API Express, dan skema PostgreSQL melalui Prisma.
Dokumen ini menggambarkan kode yang ada, bukan seluruh rancangan awal.

Implementasi masih berupa gabungan fitur demo dan fitur yang tersambung ke backend:

- Login pemilik/kasir, pengelolaan akun kasir, shift, pesanan, serta menu dan kategori
  menggunakan API serta database.
- Kalender, beberapa perubahan status transaksi, dan sebagian data riwayat masih dikelola
  frontend di `localStorage` atau dibuat sebagai data demo.
- Pembayaran QRIS memakai Midtrans Core API dengan webhook bertanda tangan.

Karena itu, data demo yang terlihat pada laporan atau dashboard tidak selalu berasal dari
database produksi. Lihat `3-frontend-struktur-halaman.md` dan `7-integrasi-midtrans.md`.

## 2. Fitur yang Ada

| Area | Perilaku aktual |
|---|---|
| Akses pemilik dan kasir | Login terpisah; sesi JWT disimpan pada cookie `httpOnly` |
| Akun kasir | Pemilik dapat membuat kasir, mengubah nama/aktivasi, dan mengganti PIN |
| Shift | Dibuka saat kasir login dan ditutup saat logout; tanggal bisnis memakai WIB |
| POS | Cari/filter menu, keranjang, catatan item, tipe dine-in/takeaway |
| Pembayaran | Cash memvalidasi uang diterima; QRIS masih berupa QR mock dan tombol simulasi |
| Pesanan | Pesanan tersimpan di database; menerima status awal `READY` |
| Antrean/realtime | Kode transaksi dan nomor antrean dibuat backend; pesanan baru disiarkan via Socket.IO |
| Dashboard, penjualan, kalender, performa | Sebagian besar memakai data demo, state browser, serta pesanan server yang digabungkan |

Pengelolaan menu/kategori melalui UI belum mempunyai endpoint backend dan belum menyimpan
perubahannya ke tabel `Menu`/`Category`.

## 3. Aktor dan Hak Akses

| Aktor | Akses aktual |
|---|---|
| Pemilik (`OWNER`) | Halaman dashboard, kalender, menu, kasir, penjualan, performa; API pengelolaan kasir dan baca pesanan |
| Kasir (`CASHIER`) | Halaman POS, pesanan, penjualan; API membuat pesanan dan membaca pesanan hari ini |
| Pelanggan | Tidak memiliki akun atau akses langsung ke aplikasi |

RBAC backend membatasi endpoints; beberapa halaman pemilik masih menampilkan data/state sisi
frontend, bukan data yang dikelola server.

## 4. Teknologi Aktual

| Lapisan | Teknologi |
|---|---|
| Frontend | React 18, JSX, Vite, React Router |
| Data browser | React Context/hooks, `localStorage`, TanStack Query |
| Realtime browser | `socket.io-client` |
| Backend | Node.js 20+, Express 4, JavaScript ESM |
| Validasi | Zod pada batas route |
| Database | PostgreSQL, Prisma 6 |
| Sesi | JWT dalam cookie `httpOnly`, `bcryptjs` |
| Pembayaran | Cash tercatat di backend; QRIS belum terintegrasi ke payment gateway |

Tidak ada TypeScript atau Tailwind di aplikasi aktual. Uang direpresentasikan sebagai integer
rupiah pada model transaksi/pesanan yang aktif.

## 5. Batasan dan Pekerjaan Belum Terimplementasi

- Integrasi Midtrans (charge, notifikasi, pemeriksaan status) belum ada.
- Menu/kategori belum dikelola lewat API/database.
- Laporan/dashboard/performa belum sepenuhnya dihitung dari database produksi.
- Beberapa perubahan status pesanan di UI hanya mengubah state frontend; backend belum
  menyediakan endpoint untuk alur persiapan pesanan.
- Perhitungan harga paket di service memakai data komponen, tetapi jalur pemuatan menu untuk
  pembuatan order perlu memuat menu komponen juga. Verifikasi sebelum mengandalkan harga paket
  dari API.
- Model Prisma mencakup entitas tambahan (mis. pembayaran, kalender, pengaturan) yang belum
  seluruhnya dihubungkan dengan fitur/API.

## 6. Dokumen

| Berkas | Cakupan |
|---|---|
| `1-frontend-design.md` | Gaya visual yang benar-benar tampak pada CSS |
| `2-frontend-dependencies.md` | Dependencies dan scripts aktual |
| `3-frontend-struktur-halaman.md` | Routing, state frontend, pembagian data demo/server |
| `4-backend-arsitektur.md` | Struktur dan alur backend aktual |
| `5-backend-database.md` | Skema Prisma aktual |
| `6-backend-api.md` | Endpoints yang terdaftar di Express |
| `7-integrasi-midtrans.md` | Status konfigurasi dan pekerjaan integrasi yang belum dilakukan |

Sumber kebenaran untuk perilaku adalah source code, khususnya `backend/src/`,
`backend/prisma/schema.prisma`, dan `frontend/src/`. Dokumen lama dalam
`docs/superpowers/` merupakan artefak perencanaan bertanggal dan tidak menjadi spesifikasi
implementasi terkini.
