# Warkil-Kasir

Aplikasi kasir (POS) Warung Kikil Abang. Dokumen ini juga menjadi catatan QA. Perbarui status berdasarkan hasil pengujian atau peninjauan yang benar-benar dilakukan.

## Catatan QA

### Status

- **Belum diuji** — pengujian belum dilakukan.
- **Lulus** — hasil aktual sesuai hasil yang diharapkan.
- **Gagal** — hasil aktual berbeda; catat sebagai temuan.
- **Terblokir** — pengujian tidak bisa dilanjutkan; tuliskan alasannya.
- **Perlu perbaikan** — ada kebutuhan atau masalah yang perlu ditangani.
- **Perlu regresi** — sudah diperbaiki dan perlu diuji ulang.

### Checklist fitur

| Area                        | Skenario yang diuji                                                                             | Hasil yang diharapkan                                                                                                              | Status         | Catatan/ID temuan                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------- |
| Akses umum                  | Buka halaman awal dan navigasi ke halaman Pemilik/Kasir                                         | Halaman terbuka dan navigasi menuju tujuan yang benar                                                                              | Lulus          |                                                    |
| Navigasi kembali            | Buka halaman dari menu, lalu gunakan tombol panah kembali                                       | Kembali ke halaman sebelumnya tanpa harus membuka menu garis tiga                                                                  | Perlu regresi  |                                                    |
| Login dan akses             | Login Pemilik/Kasir, kredensial salah, logout, akses halaman dengan role yang tidak sesuai      | Akses sesuai role; kredensial salah ditolak; logout mengakhiri sesi                                                                 | Lulus          |                                                    |
| Percobaan login Owner       | Masukkan password Owner yang salah 3 kali, coba login saat jeda, lalu coba lagi setelah 1 menit | Login ditahan selama 1 menit dengan pesan yang jelas; akun tidak terkunci permanen dan percobaan direset setelah login berhasil    | Perlu regresi  |                                                    |
| Dashboard Pemilik           | Buka dashboard dan periksa ringkasan yang ditampilkan                                           | Ringkasan tampil dan konsisten dengan data uji                                                                                     | Belum diuji | Smooth Scrolling    |
| Kalender                    | Pindah bulan/tanggal; tandai event atau libur; hapus tanda; aktif/nonaktifkan libur Minggu      | Tanggal dan tanda tampil sesuai tindakan; tanggal mendatang tidak menampilkan rekap penjualan                                      | Lulus          |                                                    |
| Menu dan kategori           | Tambah, ubah, hapus menu; cari/filter; tambah dan ubah kategori                                 | Data dan daftar berubah sesuai tindakan; kategori berisi menu tidak dapat dihapus                                                  | Belum diuji | Emoji Menu + Upload Gambar |
| Menu paket                  | Buat/edit paket, atur isi dan jumlah item, periksa diskon dan harga                             | Harga normal dan harga paket dihitung dengan benar; input tidak valid tidak tersimpan                                              | Belum diuji    |                                                    |
| Foto menu halaman Kasir     | Periksa foto menu yang ditampilkan dan kecocokannya dengan item                                 | Foto asli terlihat jelas dan sesuai dengan menu yang dipesan                                                                       | Belum diuji    |                                                    |
| POS/Kasir                   | Cari/filter menu; tambah item; ubah jumlah; hapus item; kosongkan nota; tambah catatan          | Isi nota, jumlah item, dan subtotal berubah sesuai tindakan                                                                        | Lulus          |                                                    |
| Popup dan animasi           | Periksa notifikasi/popup saat aksi berhasil atau gagal, serta transisi antarhalaman             | Animasi ringan dan popup jelas; tidak mengganggu transaksi atau menutupi informasi penting                                         | Belum diuji    |                                                    |
| Tipe pesanan dan pembayaran | Pilih makan di tempat/takeaway; lanjutkan pembayaran; batalkan atau selesaikan alur             | Tipe pesanan dan total benar; hasil transaksi/nota sesuai alur yang tersedia                                                       | Belum diuji    |                                                    |
| Pesanan makan di tempat     | Buka daftar pesanan dan uji tindakan yang tersedia                                              | Daftar dan status pesanan sesuai transaksi uji                                                                                     | Belum diuji    |                                                    |
| Penjualan                   | Periksa halaman laporan Penjualan Pemilik dan Kasir dengan rentang/data uji yang tersedia       | Nilai dan filter laporan sesuai transaksi uji                                                                                      | Belum diuji    |                                                     |
| Performa kasir              | Periksa laporan/peringkat kasir dengan data uji                                                 | Data kasir dan metrik sesuai transaksi uji                                                                                         | Belum diuji    |                                                    |
| Validasi dan ketahanan      | Uji input kosong, format salah, nilai batas, pemuatan/error API, serta refresh halaman          | Pesan kesalahan jelas; aplikasi tidak menyimpan data tidak valid atau masuk ke kondisi rusak                                       | Belum diuji    |                                                    |

Hapus atau sesuaikan skenario yang memang tidak tersedia pada environment yang diuji, lalu tulis alasannya di kolom catatan.

### Kebutuhan foto menu halaman Kasir

Gunakan foto asli untuk membantu kasir mengenali menu. Minta mitra mengirim foto yang jelas, pencahayaannya baik, dan benar-benar sesuai dengan menu. Usahakan gaya foto konsisten dan pastikan foto boleh digunakan di aplikasi.

Contoh permintaan kepada mitra:

> Mohon bantu kirim foto asli untuk setiap menu yang dijual. Foto diharapkan jelas, pencahayaannya baik, dan sesuai dengan menu agar bisa ditampilkan di halaman Kasir. Mohon konfirmasi juga bahwa foto tersebut boleh digunakan di aplikasi.

### Format catatan test case

Salin baris ini untuk skenario tambahan:

| ID     | Fitur/skenario  | Prasyarat dan data uji | Langkah pengujian                                 | Hasil yang diharapkan   | Hasil aktual         | Status      | Bukti                               |
| ------ | --------------- | ---------------------- | ------------------------------------------------- | ----------------------- | -------------------- | ----------- | ----------------------------------- |
| TC-001 | [nama skenario] | [kondisi/data awal]    | 1. [langkah pertama] <br> 2. [langkah berikutnya] | [hasil yang seharusnya] | [hasil yang terjadi] | Belum diuji | [tautan/lokasi screenshot atau log] |

### Format laporan temuan/revisi

Salin bagian ini untuk setiap bug atau usulan revisi. Bedakan bug (perilaku tidak sesuai kebutuhan) dari usulan perbaikan UX.

#### [BUG/UX]-[nomor]: [judul singkat]

- **Severity/Prioritas:** [Kritis/Tinggi/Sedang/Rendah]
- **Fitur dan environment:** [halaman/API, browser, versi]
- **Prasyarat:** [kondisi sebelum langkah dilakukan]
- **Langkah reproduksi:**
  1. [langkah pertama]
  2. [langkah berikutnya]
- **Hasil yang diharapkan:** [perilaku yang benar]
- **Hasil aktual:** [perilaku yang terjadi]
- **Frekuensi:** [selalu/kadang-kadang, jumlah percobaan]
- **Bukti:** [tautan/lokasi screenshot, video, atau log tanpa rahasia]
- **Saran revisi:** [perubahan yang disarankan, jika diketahui]
- **Status:** [Baru/Dikerjakan/Perlu regresi/Selesai]
- **Hasil uji ulang:** [tanggal, versi, hasil; isi setelah perbaikan diuji]

Jangan masukkan PIN, password, token, cookie, atau data pribadi ke laporan maupun bukti.

## TODO

### Midtrans

Status: ditunda. Pembayaran QRIS di halaman Kasir masih simulasi (pesanan tersimpan, tetapi QR tidak memanggil Midtrans).

Yang belum dikerjakan:

- Endpoint pembuatan transaksi Snap dan halaman pembayaran.
- Webhook notifikasi dengan verifikasi signature SHA512, idempotensi, dan rekonsiliasi status pesanan.
- Uji sandbox untuk pembayaran berhasil, gagal, kedaluwarsa, dan webhook ganda.

Variabel `.env` sudah tersedia: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_EXPIRY_MINUTES`. Saat melanjutkan, verifikasi dulu kunci sandbox di server — kunci yang terpasang sekarang ditolak Midtrans.

## Menjalankan test otomatis

Jalankan test frontend dari folder `frontend`:

```bash
npm test
```

Jalankan test backend dari folder `backend`:

```bash
npm test
```

Test backend menggunakan database uji di port **5434** dan dapat mengosongkan tabel database tersebut. Pastikan konfigurasi mengarah hanya ke database uji, bukan database kerja atau production.

### Ringkasan hasil test

Isi setelah menjalankan test; jangan menandai lulus hanya karena test berhasil dimulai.

| Bagian   | Perintah                  | Hasil              | Catatan                       |
| -------- | ------------------------- | ------------------ | ----------------------------- |
| Frontend | `cd frontend && npm test` | Lulus, 30/30       | 8 berkas test                 |
| Backend  | `cd backend && npm test`  | Lulus, 87/87       | 13 berkas test, database uji  |

## Kriteria selesai QA

- Semua skenario dalam scope memiliki status dan hasil aktual.
- Setiap kegagalan memiliki langkah reproduksi dan bukti yang aman dibagikan.
- Perbaikan yang sudah dibuat diuji ulang; hasilnya dicatat pada temuan.
- Automated test terkait dijalankan dan hasilnya dicatat.
- Temuan yang belum selesai, terblokir, atau berisiko diterima secara eksplisit oleh pihak terkait.
