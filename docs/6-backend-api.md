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

## 5. Orders

Semua endpoint memerlukan sesi valid.

| Method | Path | Akses | Request utama | Hasil |
|---|---|---|---|---|
| GET | `/api/orders` | Pemilik: tanggal opsional; kasir: hari ini saja | `?date=YYYY-MM-DD` | Daftar order `READY`/`COMPLETED` pada tanggal bisnis |
| POST | `/api/orders` | `CASHIER` | `orderType`, `payment`, `items`, opsional `receivedAmount`, `note` | Order baru, HTTP 201 |

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
Cash. Backend mencari menu aktif berdasarkan ID, menghitung harga dan total di server,
mengelola shift, serta membuat kode antrean/transaksi. Service pricing memiliki aturan untuk
menu paket, tetapi query pembuatan order belum memuat menu komponen bila komponen tidak ikut
dikirim sebagai item; karena itu jangan mengandalkan harga paket API sampai jalur ini
diperbaiki dan diuji.

Response order dipetakan ke format transaksi frontend: `id`, `date`, `time`, `queue`,
`orderType`, `payment`, `items`, `note`, `total`, `status`, `cashier`, `createdAt`.

Semua order yang dibuat route ini langsung tersimpan dengan status `READY` dan payment
`PAID`. Pembayaran QRIS di route ini tidak menunggu gateway.

## 6. Route yang Belum Tersedia

Belum ada endpoint untuk CRUD menu/kategori, mengubah status order, menerima callback Midtrans,
mengecek status pembayaran, atau menghasilkan laporan. Keberadaan model di Prisma tidak berarti
endpoint tersebut tersedia.
