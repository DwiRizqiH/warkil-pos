# Frontend Structure — Warung Kikil Abang POS

## 1. Struktur Folder

```
src/
├── main.tsx
├── App.tsx
├── routes/
│   └── AppRouter.tsx
├── pages/
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── kasir/
│   │   ├── BuatTransaksiPage.tsx
│   │   ├── PembayaranPage.tsx
│   │   └── StrukPage.tsx
│   ├── riwayat/
│   │   ├── RiwayatTransaksiPage.tsx
│   │   └── DetailTransaksiPage.tsx
│   ├── menu/
│   │   ├── DaftarMenuPage.tsx
│   │   ├── FormMenuPage.tsx
│   │   └── DaftarKategoriPage.tsx
│   └── laporan/
│       └── LaporanPenjualanPage.tsx
├── components/
│   ├── ui/                # Button, Card, Modal, Toast, Badge, NumericKeypad
│   ├── layout/             # BottomNav, Header, StickyActionBar
│   └── domain/             # MenuCard, CartItemRow, StatusBadge, QRDisplay
├── features/
│   ├── auth/               # useAuth, authStore
│   ├── menu/               # useMenus, useCategories (react-query hooks)
│   ├── transaksi/          # useCart (zustand), useCreateTransaction
│   ├── pembayaran/         # useCashPayment, useQrisPayment, useQrisStatusPolling
│   └── laporan/            # useSalesReport, useTopMenu
├── lib/
│   ├── apiClient.ts        # instance axios + interceptor JWT
│   └── formatters.ts       # format Rupiah, format tanggal
└── styles/
    └── tokens.css          # variabel warna & spacing dari 1-frontend-design.md
```

## 2. Peta Routing

| Path | Halaman | Akses | Proses DFD terkait |
|---|---|---|---|
| `/login` | Login | Publik | — |
| `/kasir` | Buat Transaksi | Kasir, Pemilik | 2.1 Input pesanan |
| `/kasir/pembayaran` | Pembayaran | Kasir, Pemilik | 2.2–2.3, 3.1–3.4 |
| `/kasir/struk/:id` | Struk transaksi selesai | Kasir, Pemilik | — |
| `/riwayat` | Riwayat Transaksi | Kasir, Pemilik | — |
| `/riwayat/:id` | Detail Transaksi | Kasir, Pemilik | — |
| `/menu` | Daftar Menu | Pemilik (kelola), Kasir (lihat saja) | 1.1–1.4 |
| `/menu/baru`, `/menu/:id/ubah` | Form Tambah/Ubah Menu | Pemilik | 1.1, 1.3 |
| `/menu/kategori` | Kelola Kategori | Pemilik | 1.2 |
| `/laporan` | Laporan Penjualan & Menu Terlaris | Pemilik | 4.1–4.4 |

Route dibungkus `ProtectedRoute` yang memeriksa token JWT dan `role` pengguna; halaman yang
diakses tanpa hak yang sesuai dialihkan ke halaman yang diizinkan beserta pesan singkat,
bukan halaman error teknis.

## 3. Komponen Domain Utama

| Komponen | Fungsi |
|---|---|
| `MenuCard` | Menampilkan satu menu dengan foto, nama, harga, badge Tersedia/Habis, dan tombol tambah/stepper jumlah |
| `CartItemRow` | Baris item di keranjang berjalan, dengan stepper `－ / ＋` dan subtotal otomatis |
| `StickyActionBar` | Bar tetap di bawah layar berisi total harga & tombol aksi utama (dijelaskan di `1-frontend-design.md` bagian layout) |
| `StatusBadge` | Badge warna+label konsisten untuk status menu & pembayaran |
| `QRDisplay` | Menampilkan kode QR besar dari data QRIS yang dikirim backend, plus indikator status *menunggu/lunas/gagal* |
| `NumericKeypad` | Keypad angka besar untuk input nominal tunai diterima, meminimalkan salah ketuk dibanding keyboard bawaan ponsel |
| `PeriodFilter` | Pemilih periode laporan: Harian / Bulanan / Custom (rentang tanggal) |

## 4. Alur Layar: Transaksi sampai Pembayaran

```
[Login] → [Buat Transaksi]
              │  kasir memilih menu (baca D2 Menus, hanya yang is_available)
              ▼
        [Keranjang terisi] --tambah/kurangi item--> (subtotal & total dihitung live di client,
                                                       divalidasi ulang oleh backend saat submit)
              │  tekan "Lanjut ke Pembayaran"
              ▼
        [Pilih Metode Bayar: Cash / QRIS]
              │
      ┌───────┴────────┐
      ▼                ▼
 [Input Tunai]    [Tampilkan QR]
  hitung kembalian   polling status tiap beberapa detik
      │                │  status berubah "Lunas" otomatis
      └───────┬────────┘
              ▼
         [Struk / Selesai] → transaksi otomatis tercatat di Riwayat
```

Perhitungan total di frontend bersifat **tampilan saja**; backend selalu menghitung ulang
subtotal & total dari harga menu yang tersimpan di database saat transaksi disimpan, agar
tidak bisa dimanipulasi dari sisi klien.

## 5. Strategi State Management

| Jenis state | Alat | Contoh |
|---|---|---|
| **Server state** (data dari API, perlu cache & refetch) | `@tanstack/react-query` | Daftar menu, riwayat transaksi, laporan penjualan |
| **UI/client state** (tidak berasal dari server) | `zustand` | Keranjang transaksi berjalan (`useCartStore`), status modal, sesi login (token & role) |
| **Form state** | `react-hook-form` + `zod` | Form tambah/ubah menu, form login |
| **Status pembayaran real-time** | `react-query` dengan `refetchInterval` (polling ringan tiap 3 detik) pada endpoint status QRIS, dihentikan otomatis setelah status final (`lunas`/`gagal`) | Layar `PembayaranPage` |

Keranjang (`useCartStore`) sengaja disimpan di memori (zustand), bukan `localStorage`, karena
sifatnya transaksi yang sedang berjalan di satu sesi kasir — dikosongkan begitu transaksi
selesai atau dibatalkan.

## 6. Halaman Pemilik vs Halaman Kasir

Aplikasi memakai **satu basis kode React yang sama**, dengan navigasi bawah (`BottomNav`) yang
menyesuaikan `role` pengguna setelah login:

- **Kasir** melihat tab: *Kasir*, *Riwayat*, *Menu* (mode lihat saja).
- **Pemilik** melihat tab: *Kasir* (opsional, bila pemilik turut melayani), *Riwayat*, *Menu*
  (mode kelola penuh), *Laporan*.

Pendekatan satu basis kode ini dipilih agar pemeliharaan aplikasi tetap ringkas — sesuai
konteks tim pengembang kecil untuk UMKM — dibanding membangun dua aplikasi terpisah.
