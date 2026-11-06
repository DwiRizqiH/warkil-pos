# Struktur Frontend — Aktual

## 1. Struktur Source

```text
frontend/src/
├── App.jsx                 # Deklarasi routing
├── main.jsx                # Provider dan bootstrap React
├── api/                    # fetch client dan konfigurasi TanStack Query
├── auth/                   # AuthContext dan RequireRole
├── components/             # Komponen UI/domain bersama
├── context/                # Keranjang dan reducer
├── pages/
│   ├── cashier/            # POS, pembayaran, pesanan, penjualan, login
│   └── owner/              # Dashboard, kalender, menu, kasir, penjualan, performa
├── data.js                 # Menu default dan generator data riwayat demo
├── selectors.js            # Agregasi/filter data transaksi untuk UI
├── store.jsx               # Store aplikasi dan persistensi browser
└── index.css               # Gaya visual global
```

## 2. Routing

| Path | Halaman | Role |
|---|---|---|
| `/` | Landing | Publik |
| `/pemilik/login` | Login pemilik | Publik |
| `/pemilik` | Dashboard pemilik | `OWNER` |
| `/pemilik/kalender` | Kalender | `OWNER` |
| `/pemilik/menu` | Pengelolaan menu frontend | `OWNER` |
| `/pemilik/kasir` | Pengelolaan akun kasir via API | `OWNER` |
| `/pemilik/penjualan` | Rekap/riwayat penjualan frontend | `OWNER` |
| `/pemilik/performa` | Performa kasir dari indeks transaksi frontend | `OWNER` |
| `/kasir/login` | Login kasir | Publik |
| `/kasir` | POS | `CASHIER` |
| `/kasir/pesanan` | Papan pesanan | `CASHIER` |
| `/kasir/penjualan` | Penjualan hari ini | `CASHIER` |
| path lain | Dialihkan ke `/` | — |

`RequireRole` menggunakan sesi dari `AuthContext`; otorisasi API tetap diperiksa backend.

## 3. Sumber dan Persistensi Data

| Data | Sumber aktual |
|---|---|
| Menu dan kategori | Default di `data.js`, perubahan disimpan ke `localStorage` |
| Penanda kalender dan opsi Minggu libur | `localStorage` |
| Riwayat sebelum hari ini | Dibuat lokal oleh `generateHistory` sebagai data demo |
| Sesi login | Endpoint backend; JWT tersimpan sebagai cookie `httpOnly` |
| Daftar dan perubahan akun kasir | Endpoint backend melalui TanStack Query |
| Pesanan hari ini | API `/api/orders` dan notifikasi Socket.IO; digabung dengan data lokal |
| Keranjang aktif | React Context/reducer, berada di memori dan dibersihkan saat logout/login |

State menu browser tidak otomatis menjadi data tabel `Menu` pada PostgreSQL. Riwayat demo
bukan transaksi database; nilai dashboard/penjualan dapat mencampur riwayat demo dengan
pesanan aktual.

## 4. Alur POS dan Pembayaran

1. Kasir memilih menu, jumlah, catatan item, serta dine-in atau takeaway.
2. Frontend menampilkan subtotal/total berdasarkan data menu lokal.
3. Untuk Cash, kasir memasukkan uang diterima; frontend mengirimkan pesanan ke `POST /api/orders`.
4. Untuk QRIS, frontend menampilkan QR contoh `QRIS-MOCK` dan meminta kasir menekan tombol
   simulasi; tidak ada pembayaran eksternal yang diverifikasi.
5. Backend menghitung kembali harga dari menu database, membuat order, item, pembayaran
   `PAID`, kode transaksi, nomor antrean, lalu mengirim event `order:created`.
6. Frontend menampilkan antrean dan nota.

Data menu frontend dan menu database dapat berbeda. Karena backend menghitung berdasarkan
database, menu dari browser harus tersedia dan sesuai di database agar pesanan tersimpan.
Perhatian: pada jalur pembuatan order, service pricing saat ini hanya mengambil menu yang
dikirim sebagai item pesanan. Untuk menu paket, menu komponen tidak ikut dimuat secara otomatis
oleh query tersebut; harga paket server perlu diverifikasi/diperbaiki sebelum dipakai.

## 5. State UI

- `StoreProvider`: state menu/kategori, data riwayat, penanda kalender dan pesanan server.
- `CartProvider`: item dan tipe pesanan yang sedang dibuat.
- `AuthProvider`: sesi pengguna, login/logout.
- TanStack Query dipakai terutama untuk sesi dan operasi kasir.
- Socket.IO melakukan sinkronisasi ulang daftar pesanan saat tersambung kembali, serta menerima
  pesanan baru.

Beberapa pembaruan status pesanan dan riwayat demo hanya mengubah state frontend; tidak ada API
untuk menyimpan perubahan tersebut di backend saat ini.
