# Integrasi Midtrans — Pembayaran QRIS

## 1. Mengapa Core API, Bukan Snap

Midtrans menyediakan dua cara integrasi utama:

| Pendekatan | Cara kerja | Cocok untuk kasus ini? |
|---|---|---|
| **Snap** | Membuka halaman/popup pembayaran milik Midtrans, pelanggan memilih sendiri metode | Kurang cocok — alur yang diminta mitra adalah kasir memilih QRIS lalu **kode QR tampil langsung di layar kasir**, bukan berpindah ke halaman lain |
| **Core API** | Backend memanggil endpoint *charge* langsung dengan `payment_type: "qris"`, menerima string/gambar QR untuk ditampilkan sendiri di UI aplikasi | **Dipilih** — sesuai DFD 3.3 "Sistem membangkitkan dan menampilkan kode QR sesuai nominal transaksi ... lalu memeriksa status pembayaran hingga dinyatakan berhasil" |

## 2. Kredensial & Environment

| Variabel (backend) | Contoh | Keterangan |
|---|---|---|
| `MIDTRANS_SERVER_KEY` | `SB-Mid-server-xxxxxxx` | **Rahasia**, hanya di backend |
| `MIDTRANS_CLIENT_KEY` | `SB-Mid-client-xxxxxxx` | Boleh publik, dipakai bila suatu saat memakai Snap |
| `MIDTRANS_IS_PRODUCTION` | `false` (sandbox) / `true` (produksi) | Menentukan base URL API |

Base URL Core API:
- Sandbox: `https://api.sandbox.midtrans.com/v2/charge`
- Produksi: `https://api.midtrans.com/v2/charge`

## 3. Alur Pembayaran QRIS End-to-End

```
Kasir pilih "QRIS" di layar Pembayaran
        │
        ▼
Frontend → POST /api/payments/qris { transactionId }
        │
        ▼
Backend:
  1. Ambil total_price dari tabel transactions (bukan dari frontend)
  2. Buat record `payments` (status = pending, method = qris)
  3. Panggil Midtrans Core API Charge dengan payment_type "qris"
        │
        ▼
Midtrans membalas dengan `qr_code` (string/URL gambar QR) & `transaction_id` Midtrans
        │
        ▼
Backend simpan `qris_reference_number` = transaction_id Midtrans, kembalikan qr_code ke frontend
        │
        ▼
Frontend tampilkan QR besar di layar (QRDisplay) → pelanggan scan dari e-wallet/mobile banking
        │
        ▼
Pelanggan menyelesaikan pembayaran di aplikasinya
        │
        ▼
Midtrans mengirim HTTP POST ke webhook backend: POST /api/payments/midtrans/callback
        │
        ▼
Backend verifikasi signature_key → update payments.status & transactions.payment_status = "lunas"
        │
        ▼
Frontend (polling GET /payments/:id/status tiap ±3 detik) mendeteksi status "lunas"
        │
        ▼
Layar otomatis pindah ke Struk — tanpa aksi tambahan dari kasir
```

## 4. Pembayaran Cash (Tanpa Midtrans)

Metode `cash` **tidak melibatkan Midtrans sama sekali**. Backend langsung mencatat
`amount_paid`, menghitung kembalian (`amount_paid - total_price`), dan menandai
`payment_status = lunas` seketika, sesuai DFD 3.2 "Sistem menerima nominal uang yang
dibayarkan pelanggan dan menghitung kembalian".

## 5. Contoh Permintaan Charge API (QRIS)

```http
POST https://api.sandbox.midtrans.com/v2/charge
Authorization: Basic base64(MIDTRANS_SERVER_KEY:)
Content-Type: application/json
```
```jsonc
{
  "payment_type": "qris",
  "transaction_details": {
    "order_id": "t-001-1695378600",
    "gross_amount": 55000
  },
  "qris": { "acquirer": "gopay" }
}
```

> `order_id` sebaiknya digabung dari `transaction_id` internal + timestamp agar unik setiap
> percobaan bayar, karena Midtrans mensyaratkan `order_id` unik per transaksi.

## 6. Contoh Respons Charge API

```jsonc
{
  "status_code": "201",
  "transaction_id": "8b1e...-midtrans",
  "order_id": "t-001-1695378600",
  "gross_amount": "55000.00",
  "transaction_status": "pending",
  "actions": [
    {
      "name": "generate-qr-code",
      "method": "GET",
      "url": "https://api.sandbox.midtrans.com/v2/qris/8b1e.../qr-code"
    }
  ]
}
```
Backend meneruskan URL/string QR dari `actions` ke frontend untuk dirender sebagai gambar QR
(lihat `qrcode.react` pada `2-frontend-dependencies.md`).

## 7. Webhook Notifikasi & Verifikasi Signature

**Contoh payload masuk ke `POST /payments/midtrans/callback`:**
```jsonc
{
  "order_id": "t-001-1695378600",
  "status_code": "200",
  "gross_amount": "55000.00",
  "transaction_status": "settlement",
  "signature_key": "a94a8fe5ccb19ba61c4c0873d391e987..."
}
```

**Verifikasi wajib** sebelum mempercayai payload (mencegah pihak lain memalsukan notifikasi
"lunas"):

```
signature_key harus sama dengan:
  SHA512( order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY )
```

Contoh implementasi Node.js:
```ts
import crypto from "crypto";

function verifyMidtransSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}) {
  const raw =
    payload.order_id +
    payload.status_code +
    payload.gross_amount +
    process.env.MIDTRANS_SERVER_KEY;

  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return expected === payload.signature_key;
}
```

Jika verifikasi gagal, endpoint mengembalikan `403` dan **tidak** mengubah status apa pun.

## 8. Pemetaan Status Midtrans → Status Internal

| `transaction_status` Midtrans | `PaymentStatus` internal | Aksi backend |
|---|---|---|
| `pending` | `pending` | Tidak ada perubahan, tunggu notifikasi berikutnya |
| `settlement` / `capture` | `lunas` | Set `paid_at = now()`, update `transactions.payment_status = lunas` |
| `deny` / `cancel` | `gagal` | Tandai gagal, izinkan kasir membuat percobaan bayar baru |
| `expire` | `gagal` | QR kedaluwarsa (umumnya 15 menit), kasir bisa membuat QR baru |

## 9. Keamanan & Praktik Baik

- **Server Key tidak pernah** dikirim ke frontend maupun disertakan dalam log yang mudah
  diakses.
- URL webhook (`Payment Notification URL`) didaftarkan di dashboard Midtrans **melalui
  HTTPS** — Midtrans menolak URL notifikasi berbasis HTTP di mode produksi.
- Simpan seluruh payload webhook mentah ke log terstruktur (`pino`) untuk keperluan audit bila
  ada perselisihan pembayaran dengan pelanggan.
- Terapkan idempotensi: jika webhook yang sama diterima dua kali (Midtrans bisa mengirim
  ulang), pastikan status yang sudah `lunas` tidak diproses ulang/ditimpa.
- Selama pengembangan, gunakan **Midtrans Simulator** di dashboard Sandbox untuk mensimulasikan
  pembayaran QRIS berhasil tanpa transaksi nyata.

## 10. Ringkasan Endpoint Terkait

Lihat `6-backend-api.md` bagian 7 untuk daftar lengkap endpoint `/payments/*` beserta contoh
request/response pada sisi aplikasi Warung Kikil Abang.
