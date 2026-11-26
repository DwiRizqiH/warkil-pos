# REST API — Endpoint yang Terdaftar

Daftar berikut mencerminkan route di `backend/src/routes/`. Prefix API adalah `/api`; semua
endpoint menggunakan JSON kecuali respons HTTP 204. Validasi request dilakukan dengan Zod.

## 1. Konvensi

- Response sukses: `{ "success": true, "data": ... }`.
- Response error: `{ "success": false, "error": { "code": "...", "message": "..." } }`.
- Sesi dibawa pada cookie `wk_session`, bukan token di header Authorization.
- `GET /api/health` dan daftar kasir untuk layar login bersifat publik.

## 2. Health

| Method | Path | Akses | Hasil |
|---|---|---|---|
| GET | `/api/health` | Publik | `status: "ok"` dan uptime proses |

## 3. Auth

| Method | Path | Akses | Request utama | Hasil |
|---|---|---|---|---|
| GET | `/api/auth/cashiers` | Publik | — | Kasir aktif: `id`, `name` |
| POST | `/api/auth/owner/login` | Publik, rate limited | `username`, `password` | `user`; sesi disetel sebagai cookie |
| POST | `/api/auth/cashier/login` | Publik, rate limited | `cashierId`, `pin` empat digit | `user`, `shiftId`; sesi disetel sebagai cookie |
| GET | `/api/auth/me` | Sesi valid | — | `user`, `shiftId` (atau `null`) |
| POST | `/api/auth/logout` | Sesi valid | — | HTTP 204; kasir menutup shift hari ini |

Cookie bertahan 12 jam. Nilai hash dan penghitung kegagalan tidak dikirim sebagai data publik.

## 4. Cashier Management

Semua endpoint memerlukan sesi `OWNER`.

| Method | Path | Request utama | Hasil |
|---|---|---|---|
| GET | `/api/cashiers` | — | Semua kasir, termasuk nonaktif; field publik |
| POST | `/api/cashiers` | `name` (1–60 karakter), `pin` (4 digit) | Kasir baru, HTTP 201 |
| PATCH | `/api/cashiers/:id` | `name` dan/atau `isActive` | Kasir yang diperbarui |
| POST | `/api/cashiers/:id/pin` | `pin` (4 digit) | HTTP 204; PIN baru di-hash dan lockout direset |

Kasir dinonaktifkan, bukan dihapus, agar relasi shift/order lama tetap valid.

## 5. Menus dan Categories

`GET /api/menus` memerlukan sesi dan dipakai bersama oleh pemilik dan kasir. Endpoint tulis
khusus `OWNER`.

| Method | Path | Request utama | Hasil |
|---|---|---|---|
| GET | `/api/menus` | — | `{ categories, menus }` dalam bentuk yang dipakai frontend |
| POST | `/api/menus` | `name`, `cat`, `emoji?`, `image?`, dan `price` (menu biasa) atau `items` + `discount` (paket) | Menu baru, HTTP 201 |
| PATCH | `/api/menus/:id` | Field yang sama, opsional | Menu yang diperbarui |
| DELETE | `/api/menus/:id` | — | HTTP 204; soft delete lewat `deletedAt` |
| POST | `/api/categories` | `name` | Kategori baru, HTTP 201 |
| PATCH | `/api/categories/:id` | `name` | Kategori yang diperbarui |
| DELETE | `/api/categories/:id` | — | HTTP 204; ditolak 409 bila masih berisi menu |

Menu biasa memakai `price` integer positif. Paket memakai kategori `isBundle`, berisi
`items: [{ id, qty }]` dan `discount` 0–100; harganya dihitung server dari komponen. `image`
berupa data URL dan dibatasi oleh body JSON 2 MB. Menu yang masih dipakai paket tidak dapat
dihapus. Perubahan menu langsung tersimpan di database; kasir melihatnya saat memuat ulang
aplikasi atau login berikutnya. Seed saat deploy hanya membuat menu yang belum ada, sehingga
nama, harga, dan kategori yang sudah diubah pemilik tidak ditimpa.

## 6. Orders

Semua endpoint memerlukan sesi valid.

| Method | Path | Akses | Request utama | Hasil |
|---|---|---|---|---|
| GET | `/api/orders` | Pemilik: tanggal opsional; kasir: hari ini saja | `?date=YYYY-MM-DD` | Daftar order `READY`/`COMPLETED` pada tanggal bisnis |
| POST | `/api/orders` | `CASHIER` | `orderType`, `payment`, `items`, opsional `receivedAmount`, `note` | Order baru, HTTP 201 |
| GET | `/api/orders/:code/payment` | Sesi aktif | — | Status pembayaran QRIS dan transaksi bila lunas |

Struktur request pembuatan order:

```json
{
  "orderType": "dine",
  "payment": "Cash",
  "receivedAmount": 50000,
  "note": "",
  "items": [
    { "productId": "id-menu-database", "qty": 2, "note": "tanpa sambal" }
  ]
}
```

`orderType` adalah `dine` atau `take`; `payment` adalah `Cash` atau `QRIS`; `items` berisi
1–50 baris, setiap `qty` integer 1–99. Uang diterima divalidasi minimal sebesar total untuk
Cash. Backend mencari menu aktif berdasarkan ID, memuat komponen paket yang tidak ikut
dipesan, lalu menghitung harga dan total di server. Shift, kode antrean, dan transaksi dibuat
di server.

Response order dipetakan ke format transaksi frontend: `id`, `date`, `time`, `queue`,
`orderType`, `payment`, `items`, `note`, `total`, `status`, `cashier`, `createdAt`.

Semua order tunai langsung tersimpan dengan status `READY` dan payment `PAID`. Order QRIS
disimpan `UNPAID`/`PENDING`, memanggil Midtrans Core API, dan mengembalikan `qr.string`,
`qr.imageUrl`, serta `qr.expiresAt`; pelunasan datang dari webhook atau polling. Bila charge
gagal, order menjadi `CANCELLED`, payment `FAILED`, dan route membalas HTTP 502.

`GET /api/orders/:code/payment` mengembalikan `{ status, tx }`; `tx` hanya diisi saat status
`PAID`. Detail alur, signature dan idempotensi ada di `7-integrasi-midtrans.md`.

Webhook `POST /api/payments/midtrans/notification` bersifat publik dan diautentikasi dengan
signature SHA-512, bukan sesi.

## 7. Route yang Belum Tersedia

Belum ada endpoint untuk mengubah status order atau menghasilkan laporan. Keberadaan model di
Prisma tidak berarti endpoint tersebut tersedia.
