# Midtrans — Status Implementasi

## 1. Status Saat Ini

Integrasi Midtrans **belum diimplementasikan**. Kode backend belum memanggil Midtrans Core API
atau Snap, belum menyediakan endpoint callback, dan belum memverifikasi signature webhook.
Frontend menampilkan QR buatan lokal dengan payload `QRIS-MOCK|...`; kasir menyelesaikan
simulasi dengan tombol “Simulasikan: pembayaran diterima”.

Saat tombol tersebut digunakan, frontend mengirim `payment: "QRIS"` ke `POST /api/orders`.
Backend menyimpan order dengan payment status `PAID` serta status order `READY`. Perilaku ini
adalah simulasi, bukan bukti bahwa pelanggan telah membayar.

## 2. Konfigurasi yang Sudah Ada

Environment backend menerima variabel berikut:

| Variabel | Keterangan |
|---|---|
| `MIDTRANS_SERVER_KEY` | Default kosong; belum digunakan oleh service |
| `MIDTRANS_CLIENT_KEY` | Default kosong; belum digunakan oleh frontend |
| `MIDTRANS_IS_PRODUCTION` | String `true`/`false`, default `false`; dikonversi ke boolean |
| `MIDTRANS_EXPIRY_MINUTES` | Integer positif, default 15; belum digunakan oleh payment flow |

Konfigurasi tersedia bukan berarti gateway telah terhubung. Jangan memasukkan kredensial
sebenarnya ke dokumentasi atau repository.

## 3. Field Database Terkait

Model `Payment` memiliki `midtransOrderId`, `midtransTransactionId`, `paymentType`,
`snapToken`, `snapExpiresAt`, `rawPayload`, dan `failureReason`. Field-field tersebut belum
dipakai untuk membuat atau memverifikasi pembayaran melalui Midtrans dalam alur yang tersedia.

## 4. Endpoint Terkait yang Belum Ada

Belum tersedia:

- endpoint untuk meminta QR/pembayaran ke Midtrans;
- endpoint callback/notifikasi pembayaran;
- validasi signature dengan Server Key;
- sinkronisasi status gateway ke `Payment`/`Order`;
- endpoint status pembayaran atau polling status.

## 5. Pekerjaan Sebelum Disebut Terintegrasi

Implementasi mendatang perlu menentukan dan menguji alur gateway yang dipilih (misalnya
Core API QRIS atau Snap), menyimpan referensi transaksi secara idempoten, memverifikasi
notifikasi menggunakan mekanisme resmi Midtrans, menangani status berhasil/gagal/kedaluwarsa,
serta memastikan callback tidak dapat menandai pembayaran lunas tanpa validasi. Spesifikasi
teknis dan status akhir harus diperbarui setelah implementasi dan pengujian dilakukan.
