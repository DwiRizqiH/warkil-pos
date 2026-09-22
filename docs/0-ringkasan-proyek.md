# Dokumentasi Sistem Kasir Warung Kikil Abang

## 1. Latar Belakang

Warung Kikil Abang adalah usaha kuliner UMKM di Kabupaten Jombang yang selama ini mencatat
pesanan, menghitung total, dan menerima pembayaran secara manual. Berdasarkan hasil
wawancara dengan pengelola, tiga masalah utama melatarbelakangi pengembangan sistem ini:

1. **Belum ada pembayaran non-tunai.** Pelanggan tanpa uang tunai kerap kesulitan bertransaksi.
2. **Pencatatan manual rawan salah hitung** dan sulit direkap menjadi laporan.
3. **Tidak ada data menu terlaris**, sehingga pemilik tidak punya dasar evaluasi menu.

Sistem yang dibangun adalah **aplikasi kasir (POS) berbasis web**, dioptimalkan untuk layar
ponsel/tablet, dengan pembayaran **Cash** dan **QRIS** (melalui payment gateway **Midtrans**).

## 2. Ruang Lingkup

### Termasuk dalam ruang lingkup
- Manajemen menu & kategori
- Transaksi kasir (pencatatan pesanan, hitung total otomatis)
- Pembayaran Cash dan QRIS (via Midtrans)
- Riwayat transaksi
- Laporan penjualan (harian, bulanan, custom)
- Statistik menu terlaris (hasil agregasi, bukan modul terpisah)

### Di luar ruang lingkup (disepakati eksplisit bersama mitra)
- Manajemen stok/gudang bahan baku dapur — bahan baku tetap dikelola manual oleh dapur.
- Akun/login untuk pelanggan — pelanggan adalah entitas eksternal yang hanya melihat menu &
  kode QR, tidak mengakses sistem secara langsung.

## 3. Aktor Sistem

| Aktor | Deskripsi | Contoh hak akses |
|---|---|---|
| **Pemilik** | Pemilik warung, pengguna dengan `role = pemilik` | Kelola menu, kelola kategori, lihat laporan penjualan & menu terlaris, kelola akun kasir |
| **Kasir** | Pegawai warung, pengguna dengan `role = kasir` | Buat transaksi, proses pembayaran, lihat daftar menu, lihat riwayat transaksi |
| **Pelanggan** | Entitas eksternal, tidak memiliki akun | Melihat menu (ditunjukkan kasir), memindai kode QRIS |

## 4. Ringkasan Tumpukan Teknologi (Tech Stack)

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Frontend | React (Vite) + Tailwind CSS | Web app, mobile-first |
| State/data fetching | TanStack Query + Zustand | Dijelaskan di `3-frontend-struktur-halaman.md` |
| Backend | Node.js + Express | REST API |
| ORM & Database | Prisma + PostgreSQL | Rekomendasi; MySQL kompatibel bila diperlukan |
| Autentikasi | JWT (JSON Web Token) | Role-based access: `kasir`, `pemilik` |
| Payment Gateway | Midtrans (Core API) | Metode QRIS, dijelaskan detail di `7-integrasi-midtrans.md` |

> Catatan: ERD dan wawancara mitra tidak menetapkan mesin database secara eksplisit. PostgreSQL
> dipilih sebagai rekomendasi karena dukungan tipe data enum & relasi yang kuat, tetapi seluruh
> skema pada dokumentasi ini kompatibel dengan MySQL dengan penyesuaian minor.

## 5. Peta Proses ke Fitur

Dokumentasi ini mengikuti struktur DFD Level 1–2 yang sudah disusun sebelumnya:

| Proses DFD | Fitur Aplikasi | Dibahas di |
|---|---|---|
| 1.0 Manajemen Menu (1.1–1.4) | Kelola Menu | `3-frontend-struktur-halaman.md`, `6-backend-api.md` |
| 1.2 Manajemen Kategori | Kelola Kategori | `3-frontend-struktur-halaman.md`, `6-backend-api.md` |
| 2.0 Transaksi Kasir (2.1–2.3) | Buat Transaksi | `3-frontend-struktur-halaman.md`, `6-backend-api.md` |
| 3.0 Pembayaran (3.1–3.4) | Pembayaran Cash/QRIS | `7-integrasi-midtrans.md`, `6-backend-api.md` |
| 4.0 Laporan Penjualan (4.1–4.4) | Laporan & Menu Terlaris | `6-backend-api.md` |

## 6. Daftar Dokumen

| Berkas | Isi |
|---|---|
| `0-ringkasan-proyek.md` | Dokumen ini — latar belakang, ruang lingkup, tumpukan teknologi |
| `1-frontend-design.md` | Palet warna, tipografi, layout, prinsip UI/UX untuk pengguna lintas usia |
| `2-frontend-dependencies.md` | Daftar pustaka/dependencies React beserta fungsinya |
| `3-frontend-struktur-halaman.md` | Struktur folder, routing, komponen, dan alur layar |
| `4-backend-arsitektur.md` | Arsitektur backend Node.js, lapisan kode, keamanan |
| `5-backend-database.md` | Skema database turunan ERD (tabel, kolom, relasi, enum) |
| `6-backend-api.md` | Spesifikasi REST API per proses DFD |
| `7-integrasi-midtrans.md` | Alur integrasi payment gateway Midtrans untuk QRIS |

## 7. Sumber Rujukan

Dokumentasi ini disusun berdasarkan tiga dokumen yang diberikan mitra/tim:
- *Laporan Hasil Wawancara* — kebutuhan bisnis, fungsional, dan atribut data
- *Entity Relationship Diagram (ERD)* — 7 entitas: Users, Categories, Menus, Transactions,
  Transaction_Items, Payments, Sales_Report
- *Data Flow Diagram (DFD) Level 0–2* — rincian aliran data tiap proses utama
