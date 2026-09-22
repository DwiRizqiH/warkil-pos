# Frontend Dependencies — Warung Kikil Abang POS

## 1. Tooling Dasar

| Tool | Versi disarankan | Fungsi |
|---|---|---|
| Node.js | 20 LTS | Runtime untuk build tool |
| Vite | ^5.x | Dev server & bundler — startup cepat, cocok untuk iterasi UI POS |
| npm / pnpm | terbaru | Manajer paket (pnpm disarankan untuk instalasi lebih cepat) |

Proyek dibuat dengan template `react-ts` (React + TypeScript) agar bentuk data transaksi,
menu, dan pembayaran konsisten dengan skema backend dan mengurangi bug saat integrasi API.

## 2. Dependencies Inti

| Package | Fungsi dalam aplikasi ini |
|---|---|
| `react`, `react-dom` | Library UI inti |
| `react-router-dom` | Routing antar halaman (Kasir, Riwayat, Menu, Laporan, Login) |
| `@tanstack/react-query` | Mengambil & meng-cache data dari REST API backend (menu, transaksi, laporan), termasuk auto-refetch status pembayaran QRIS |
| `zustand` | State lokal ringan: keranjang transaksi berjalan, sesi login, preferensi UI |
| `axios` | HTTP client ke backend, dengan interceptor untuk menyisipkan token JWT dan menangani sesi kedaluwarsa |
| `react-hook-form` | Pengelolaan form (tambah/ubah menu, login, filter laporan) |
| `zod` | Skema validasi input di sisi frontend, sinkron dengan validasi backend |
| `@hookform/resolvers` | Menjembatani `react-hook-form` dengan skema `zod` |
| `tailwindcss`, `postcss`, `autoprefixer` | Utility CSS untuk menerapkan token desain (warna, spacing, radius) dari `1-frontend-design.md` secara konsisten |
| `lucide-react` | Ikon garis sederhana (dipasangkan selalu dengan label teks sesuai prinsip desain) |
| `dayjs` | Format tanggal & rentang waktu untuk filter laporan (harian/bulanan/custom) |
| `qrcode.react` | Merender kode QR di sisi klien apabila backend mengirim string QRIS mentah (fallback jika tidak memakai gambar QR bawaan Midtrans) |
| `recharts` | Grafik ringkas di halaman Laporan (tren omzet harian, menu terlaris) |

## 3. Dependencies Pendukung (Opsional tapi Direkomendasikan)

| Package | Fungsi |
|---|---|
| `vite-plugin-pwa` | Menjadikan aplikasi bisa **"Add to Home Screen"** di ponsel kasir — penting karena aplikasi dipakai sebagai alat kerja harian, bukan dibuka lewat browser setiap saat |
| `react-hot-toast` | Notifikasi singkat non-blocking ("Menu berhasil disimpan", "Pembayaran gagal") sesuai prinsip umpan balik instan |
| `clsx` | Menggabungkan className kondisional secara ringkas (mis. badge status) |

## 4. Dev Dependencies

| Package | Fungsi |
|---|---|
| `typescript` | Type-safety, terutama untuk bentuk data transaksi & pembayaran |
| `eslint` + `eslint-plugin-react-hooks` | Konsistensi kode & mencegah bug umum React |
| `prettier` | Format kode otomatis |
| `vitest` + `@testing-library/react` | Unit test komponen (terutama logika keranjang & perhitungan total) |
| `husky` + `lint-staged` | Menjalankan lint/format otomatis sebelum commit |

## 5. Integrasi Midtrans di Frontend

Midtrans **tidak diinstal lewat npm** untuk metode Snap; skrip dimuat langsung via tag
`<script>` dari CDN resmi Midtrans di `index.html`, sesuai dokumentasi resmi mereka:

```html
<!-- Sandbox -->
<script src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key="VITE_MIDTRANS_CLIENT_KEY"></script>
<!-- Production -->
<script src="https://app.midtrans.com/snap/snap.js"
        data-client-key="VITE_MIDTRANS_CLIENT_KEY"></script>
```

Namun untuk alur QRIS kustom pada aplikasi ini (kasir menampilkan QR di layar sendiri, bukan
membuka halaman pembayaran Midtrans), frontend **tidak memanggil Midtrans langsung**. Frontend
hanya memanggil backend sendiri (`POST /api/payments/qris`), dan backend yang berkomunikasi
dengan Midtrans Core API. Detail lengkap ada di `7-integrasi-midtrans.md`. `qrcode.react`
dipakai untuk merender string QR yang diteruskan backend menjadi gambar QR di layar.

## 6. Variabel Lingkungan (.env)

| Variabel | Contoh nilai | Keterangan |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.warungkikilabang.id` | Alamat dasar REST API backend |
| `VITE_APP_ENV` | `production` / `sandbox` | Menentukan mode tampilan (mis. label "Mode Uji" di sandbox) |

> Kunci rahasia Midtrans (**Server Key**) **tidak pernah** disimpan di frontend — hanya
> **Client Key** publik yang boleh ada di sisi klien apabila suatu saat memakai Snap. Lihat
> `7-integrasi-midtrans.md` bagian keamanan.

## 7. Struktur `package.json` (ringkas)

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest"
  }
}
```
