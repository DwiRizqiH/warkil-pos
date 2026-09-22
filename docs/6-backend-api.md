# Backend API Specification — Warung Kikil Abang POS

## 1. Konvensi Umum

- **Base URL:** `https://api.warungkikilabang.id/api` (contoh)
- **Format data:** JSON
- **Autentikasi:** header `Authorization: Bearer <JWT>` pada seluruh endpoint kecuali
  `POST /api/auth/login`
- **Format tanggal:** ISO 8601 (`2026-09-22T14:30:00Z`)
- **Format response:** lihat `4-backend-arsitektur.md` bagian 5

## 2. Auth

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/auth/login` | Publik | Login kasir/pemilik, mengembalikan JWT |
| POST | `/auth/logout` | Semua role | Invalidasi sesi di sisi klien |
| GET | `/auth/me` | Semua role | Ambil data profil & role pengguna yang sedang login |

**Contoh — `POST /auth/login`**
```jsonc
// Request
{ "username": "kasir01", "password": "rahasia123" }

// Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "...", "name": "Sari", "role": "kasir" }
  }
}
```

## 3. Users (khusus Pemilik)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/users` | Pemilik | Daftar akun kasir & pemilik |
| POST | `/users` | Pemilik | Tambah akun kasir baru |
| PUT | `/users/:id` | Pemilik | Ubah nama/role/reset password |
| DELETE | `/users/:id` | Pemilik | Nonaktifkan akun |

## 4. Categories — Proses 1.2 Kelola Kategori

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/categories` | Kasir, Pemilik | Daftar kategori |
| POST | `/categories` | Pemilik | Tambah kategori baru |
| PUT | `/categories/:id` | Pemilik | Ubah nama kategori |
| DELETE | `/categories/:id` | Pemilik | Hapus kategori (ditolak jika masih dipakai menu aktif) |

## 5. Menus — Proses 1.1, 1.3, 1.4 Kelola Menu

| Method | Endpoint | Akses | Deskripsi | Subproses |
|---|---|---|---|---|
| GET | `/menus` | Kasir, Pemilik | Daftar menu lengkap, bisa difilter `?category_id=` & `?is_available=` | 1.2 Lihat Data Menu |
| POST | `/menus` | Pemilik | Tambah menu baru | 1.1 Tambah Menu |
| PUT | `/menus/:id` | Pemilik | Ubah nama/harga/kategori/status tersedia | 1.3 Ubah Menu |
| DELETE | `/menus/:id` | Pemilik | Hapus menu | 1.4 Hapus Menu |
| PATCH | `/menus/:id/availability` | Pemilik, Kasir | Ubah cepat status Tersedia/Habis (aksi 1-tap dari layar kasir) | 1.3 Ubah Menu |

**Contoh — `POST /menus`**
```jsonc
// Request
{
  "categoryId": "b1e2...",
  "name": "Kikil Sapi",
  "price": 25000,
  "isAvailable": true
}
```

## 6. Transactions — Proses 2.0 Transaksi Kasir

| Method | Endpoint | Akses | Deskripsi | Subproses |
|---|---|---|---|---|
| POST | `/transactions` | Kasir, Pemilik | Simpan transaksi baru (header + rincian item) | 2.1–2.3 |
| GET | `/transactions` | Kasir, Pemilik | Riwayat transaksi, filter `?start=&end=&status=` | — |
| GET | `/transactions/:id` | Kasir, Pemilik | Detail satu transaksi beserta item & status pembayaran | — |

**Contoh — `POST /transactions`**
```jsonc
// Request — total_price TIDAK dikirim; dihitung ulang oleh server
{
  "items": [
    { "menuId": "m-kikil", "quantity": 2 },
    { "menuId": "m-esteh", "quantity": 1 }
  ]
}

// Response
{
  "success": true,
  "data": {
    "id": "t-001",
    "totalPrice": 55000,
    "paymentStatus": "pending",
    "items": [
      { "menuId": "m-kikil", "quantity": 2, "subtotal": 50000 },
      { "menuId": "m-esteh", "quantity": 1, "subtotal": 5000 }
    ]
  }
}
```
Server memvalidasi setiap `menuId` masih `is_available = true` dan mengambil `price` terkini
dari database (sesuai catatan DFD 2.1: "menu yang sedang habis tidak dapat dipilih").

## 7. Payments — Proses 3.0 Pembayaran

| Method | Endpoint | Akses | Deskripsi | Subproses |
|---|---|---|---|---|
| POST | `/payments/cash` | Kasir, Pemilik | Rekam pembayaran tunai & hitung kembalian | 3.1, 3.2, 3.4 |
| POST | `/payments/qris` | Kasir, Pemilik | Minta kode QR dari Midtrans untuk suatu transaksi | 3.1, 3.3 |
| GET | `/payments/:transactionId/status` | Kasir, Pemilik | Cek status pembayaran terkini (dipoll frontend) | 3.3 |
| POST | `/payments/midtrans/callback` | **Publik** (diverifikasi via signature Midtrans, bukan JWT) | Webhook notifikasi status dari Midtrans | 3.3, 3.4 |

**Contoh — `POST /payments/cash`**
```jsonc
// Request
{ "transactionId": "t-001", "amountPaid": 60000 }

// Response
{
  "success": true,
  "data": { "change": 5000, "status": "lunas" }
}
```

**Contoh — `POST /payments/qris`**
```jsonc
// Request
{ "transactionId": "t-001" }

// Response
{
  "success": true,
  "data": {
    "qrString": "00020101021226...",
    "expiresAt": "2026-09-22T14:45:00Z",
    "status": "pending"
  }
}
```
Detail teknis lengkap pemanggilan Midtrans, verifikasi webhook, dan pemetaan status ada di
`7-integrasi-midtrans.md`.

## 8. Reports — Proses 4.0 Laporan Penjualan (khusus Pemilik)

| Method | Endpoint | Akses | Deskripsi | Subproses |
|---|---|---|---|---|
| GET | `/reports/summary` | Pemilik | Omzet & jumlah transaksi pada periode tertentu, `?type=harian\|bulanan\|custom&start=&end=` | 4.1, 4.2 |
| GET | `/reports/top-menu` | Pemilik | Peringkat menu terlaris pada periode tertentu | 4.3 |
| POST | `/reports/generate` | Pemilik | Hitung & simpan snapshot laporan ke `sales_report` | 4.4 |
| GET | `/reports/history` | Pemilik | Daftar laporan yang pernah dibuat (dari `sales_report`) | — |

**Contoh — `GET /reports/summary?type=harian&start=2026-09-22&end=2026-09-22`**
```jsonc
{
  "success": true,
  "data": {
    "totalRevenue": 1250000,
    "totalTransactions": 42,
    "totalItemsSold": 98
  }
}
```
Perhitungan hanya menyertakan transaksi dengan `payment_status = lunas`, sesuai penjelasan
subproses 4.2 pada DFD.

**Contoh — `GET /reports/top-menu?type=bulanan&start=2026-09-01&end=2026-09-30`**
```jsonc
{
  "success": true,
  "data": [
    { "menuId": "m-kikil", "name": "Kikil Sapi", "totalQuantity": 340 },
    { "menuId": "m-esteh", "name": "Es Teh Manis", "totalQuantity": 310 }
  ]
}
```
Diperoleh murni dari `SUM(quantity) GROUP BY menu_id` terhadap `transaction_items` yang
`transaction_id`-nya berstatus `lunas` — tanpa tabel tambahan, sesuai catatan pada laporan
wawancara & DFD.

## 9. Ringkasan Kode Error

| Kode | HTTP Status | Arti |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token tidak ada/kedaluwarsa |
| `FORBIDDEN` | 403 | Role tidak memiliki akses ke aksi ini |
| `MENU_NOT_AVAILABLE` | 409 | Menu yang dipesan berstatus habis |
| `VALIDATION_ERROR` | 400 | Body/query tidak sesuai skema |
| `TRANSACTION_NOT_FOUND` | 404 | ID transaksi tidak ditemukan |
| `PAYMENT_ALREADY_SETTLED` | 409 | Transaksi sudah lunas, tidak bisa dibayar ulang |
| `MIDTRANS_ERROR` | 502 | Gagal berkomunikasi dengan Midtrans |
