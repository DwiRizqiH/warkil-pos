# Warung Kikil Abang — Mockup Sistem Kasir

Mockup tampilan (bukan sistem sungguhan) dibuat dengan **React + Vite**. Semua data adalah data dummy.
Peran yang ada: **Pemilik** dan **Pegawai Kasir** (tanpa QR meja).

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:5173

## Membagikan ke tim lewat Port Forwarding VS Code

1. Jalankan `npm run dev` di terminal VS Code.
2. Buka tab **Ports** (panel bawah, sebelah Terminal). Kalau belum terlihat: `Ctrl+Shift+P` → **Ports: Focus on Ports View**.
3. Klik **Forward a Port**, ketik `5173`, tekan Enter.
4. Klik kanan port 5173 → **Port Visibility** → **Public**, supaya teman tim bisa membuka tanpa login.
5. Salin **Forwarded Address** dan kirim ke tim. Link bisa dibuka dari HP, tablet, dan iPad.

Tips:
- Link hanya aktif selama VS Code dan `npm run dev` berjalan.
- Kalau hot-reload bermasalah lewat tunnel, jalankan `npm run build` lalu `npm run preview` (port 4173), dan forward port 4173.

## Peta halaman

| Peran | Alamat | Isi |
| --- | --- | --- |
| Beranda demo | `/` | Pilih peran |
| Pemilik | `/pemilik` | Dashboard, `/kalender`, `/menu`, `/penjualan`, `/performa` |
| Kasir | `/kasir/login` → `/kasir` | Input pesanan (nota + menu), `/pesanan`, `/online`, `/penjualan` |

## Catatan untuk demo

- Data (menu, tanda libur/event, pesanan baru, login kasir) disimpan di **localStorage browser**, belum sinkron antar perangkat karena belum ada backend.
- Pembayaran di kasir: **Cash** atau **QR Warung Kikil** (QR contoh, tombol "Simulasikan: pembayaran diterima"). Nomor antrian muncul setelah pembayaran.
- Tombol **Demo: +GJK / +GRB / +SHPE** di halaman Pesanan Online mensimulasikan pesanan masuk dari aplikasi.
- Tombol **Reset data demo** ada di bagian bawah beranda.
- Foto menu memakai emoji sementara. Isi URL foto di form Edit Menu untuk mengganti.
- Nomor antrian kasir `001, 002, …` dan online per platform `GJK01`, `GRB01`, `SHPE01`, … Reset otomatis tiap hari karena dihitung per tanggal.
- Tanda ★ menu terlaris: top 3 dari seluruh menu, dihitung dari 30 hari terakhir (bergulir).
