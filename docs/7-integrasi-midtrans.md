# Midtrans — QRIS Core API

## 1. Alur yang Dipakai

Pembayaran QRIS memakai **Core API QRIS** (`POST /v2/charge`, `payment_type: "qris"`), bukan
Snap. Alasannya: kasir menampilkan QR di layar sendiri, sementara Snap mengarahkan pelanggan ke
halaman pembayaran terpisah.

Alur lengkap:

1. Kasir memilih QRIS di modal pembayaran.
2. `POST /api/orders` menyimpan order berstatus `UNPAID` dan payment `PENDING`, lalu meminta
   charge ke Midtrans dengan `midtransOrderId` `{kodeOrder}-{attemptNo}`.
3. Respons order membawa `qr.string` (payload QRIS), `qr.imageUrl` (URL PNG dari Midtrans untuk
   simulator), dan `qr.expiresAt`. Frontend merender QR dengan `qrcode.react` dan menyediakan
   tombol salin URL gambar.
4. Pembayaran lunas terdeteksi dari dua jalur:
   - webhook `POST /api/payments/midtrans/notification` (produksi);
   - polling `GET /api/orders/:code/payment` (dipakai frontend, wajib untuk development lokal
     yang tidak punya URL publik).
5. Saat `settlement`/`capture`, payment menjadi `PAID`, order menjadi `READY`, `paidAt` diisi,
   dan order disiarkan ke layar dapur. `expire`/`cancel`/`deny`/`failure` membatalkan order.

## 2. Endpoint

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/orders` | `CASHIER` | `payment: "QRIS"` membuat charge Midtrans dan mengembalikan `qr` |
| GET | `/api/orders/:code/payment` | Sesi aktif | Menanyakan status ke Midtrans lalu menyinkronkan database |
| POST | `/api/payments/midtrans/notification` | Publik, signature wajib | Webhook Midtrans |

`GET /api/orders/:code/payment` mengembalikan `{ status, tx }`. `tx` berisi transaksi bila
statusnya `PAID`; status lain hanya mengembalikan `status`, dan frontend berhenti menunggu saat
mendapat `EXPIRED`, `FAILED`, atau `CANCELLED`.

Dashboard Midtrans menguji URL notifikasi dari browser saat konfigurasi disimpan. Route webhook
karena itu mengizinkan origin dashboard (`dashboard.midtrans.com` dan
`dashboard.sandbox.midtrans.com`) pada CORS tanpa kredensial. Notifikasi sebenarnya tetap
server-to-server dan tidak memakai CORS.

## 3. Verifikasi dan Idempotensi

- Webhook diverifikasi dengan `SHA512(order_id + status_code + gross_amount + server key)`
  memakai `timingSafeEqual`. Signature salah ditolak HTTP 403.
- Jumlah `gross_amount` harus sama dengan `Payment.amount`, dan `transaction_id` harus cocok
  dengan yang diterima saat charge.
- Pelunasan hanya diterima dari notifikasi berstatus code `200`; capture dengan fraud
  `deny` menghasilkan `FAILED`, bukan `PAID`.
- `GET /api/orders/:code/payment` memakai batas tanggal bisnis yang sama dengan daftar order:
  kasir hanya boleh membuka pesanan hari ini.
- Notifikasi uji dashboard (`order_id` berawalan `payment_notif_test_`) dibalas 200 tanpa
  menyentuh database; order nyata yang tidak dikenal tetap 404.
- Hanya baris payment berstatus `PENDING` yang boleh berubah (`updateMany` dengan syarat itu),
  sehingga notifikasi ganda atau polling yang berulang tidak membuat pembayaran kedua.
- Status order tidak pernah dikirim klien; semua perubahan berasal dari gateway.

## 4. Konfigurasi

| Variabel | Keterangan |
|---|---|
| `MIDTRANS_SERVER_KEY` | Kunci server sandbox/production untuk memanggil Core API; wajib untuk QRIS |
| `MIDTRANS_SIGNATURE_SECRET` | Kunci penanda tangan notifikasi (Signature Secret Key); sejak 28-10-2026 menggantikan server key pada formula SHA-512 |
| `MIDTRANS_CLIENT_KEY` | Disimpan untuk kebutuhan kanal lain; belum dipakai frontend |
| `MIDTRANS_IS_PRODUCTION` | `true` memakai `api.midtrans.com`, selain itu sandbox |
| `MIDTRANS_NOTIFICATION_URL` | Bila diisi, charge mengirim header `X-Override-Notification` sehingga URL ini menggantikan setelan dashboard |
| `MIDTRANS_EXPIRY_MINUTES` | Cadangan bila respons charge tidak membawa `expiry_time` |

Signature memakai `MIDTRANS_SIGNATURE_SECRET` bila diisi; server key tetap diterima sebagai
cadangan untuk akun yang notifikasinya masih ditandatangani dengan kunci lama.

Kredensial hanya ada di `backend/.env` (tidak masuk repo). URL webhook diatur di dashboard
Midtrans: `https://<domain>/api/payments/midtrans/notification`.

## 5. Pengujian

- `backend/src/services/midtrans.test.js` menguji signature valid, payload yang diubah, dan
  signature rusak.
- `backend/src/routes/payments.test.js` menguji pelunasan, notifikasi ganda, signature salah,
  jumlah tidak cocok, kedaluwarsa, polling, dan galat gateway.
- Uji sandbox manual sudah dilakukan: charge QRIS nyata dari aplikasi lokal, polling
  `PENDING`, lalu pelunasan lewat notifikasi bertanda tangan.
