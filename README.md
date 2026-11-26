# Warkil-Kasir

Aplikasi kasir (POS) Warung Kikil Abang. README ini juga digunakan sebagai catatan QA. Perbarui status hanya berdasarkan pengujian atau peninjauan yang benar-benar dilakukan.

## Catatan QA
Perfect

### Arti status

| Status | Keterangan |
| --- | --- |
| Belum diuji | Pengujian belum dilakukan. |
| Lulus | Hasil aktual sesuai dengan hasil yang diharapkan. |
| Gagal | Hasil aktual berbeda dari yang diharapkan; catat sebagai temuan. |
| Terblokir | Pengujian tidak dapat dilanjutkan; tuliskan alasannya. |
| Perlu perbaikan | Ada kebutuhan atau masalah yang perlu ditangani. |
| Perlu regresi | Perbaikan sudah dibuat dan perlu diuji ulang. |

### Checklist fitur

| Area | Skenario | Hasil yang diharapkan | Status | Catatan/ID temuan |
| --- | --- | --- | --- | --- |
| Akses umum | Buka halaman awal dan navigasi ke halaman Pemilik/Kasir. | Halaman terbuka dan navigasi menuju tujuan yang benar. | Lulus | - |
| Navigasi kembali | Buka halaman dari menu, lalu gunakan tombol panah kembali. | Kembali ke halaman sebelumnya tanpa harus membuka menu garis tiga. | Lulus | - |
| Login dan akses | Login Pemilik/Kasir, gunakan kredensial salah, logout, dan akses halaman dengan role yang tidak sesuai. | Akses sesuai role; kredensial salah ditolak; logout mengakhiri sesi. | Lulus | - |
| Percobaan login Owner | Masukkan password Owner yang salah 3 kali, coba login saat jeda, lalu coba lagi setelah 1 menit. | Login ditahan selama 1 menit dengan pesan yang jelas; akun tidak terkunci permanen dan percobaan direset setelah login berhasil. | Lulus | - |
| Dashboard Pemilik | Buka dashboard dan periksa ringkasan yang ditampilkan. | Ringkasan tampil dan konsisten dengan data uji. | Lulus | Smooth scrolling |
| Kalender | Pindah bulan/tanggal; tandai event atau libur; hapus tanda; aktifkan/nonaktifkan libur Minggu. | Tanggal dan tanda tampil sesuai tindakan; tanggal mendatang tidak menampilkan rekap penjualan. | Lulus | - |
| Menu dan kategori | Tambah, ubah, dan hapus menu; cari/filter; tambah dan ubah kategori. | Data dan daftar berubah sesuai tindakan; kategori berisi menu tidak dapat dihapus. | Lulus | Emoji menu dan upload gambar |
| Menu paket | Buat/edit paket, atur isi dan jumlah item, lalu periksa diskon dan harga. | Harga normal dan harga paket dihitung dengan benar; input tidak valid tidak tersimpan. | Lulus | - |
| Foto menu halaman Kasir | Periksa foto menu yang ditampilkan dan kecocokannya dengan item. | Foto asli terlihat jelas dan sesuai dengan menu yang dipesan. | Lulus | - |
| POS/Kasir | Cari/filter menu; tambah item; ubah jumlah; hapus item; kosongkan nota; tambah catatan. | Isi nota, jumlah item, dan subtotal berubah sesuai tindakan. | Lulus | - |
| Popup dan animasi | Periksa notifikasi/popup saat aksi berhasil atau gagal, serta transisi antarhalaman. | Animasi ringan dan popup jelas; tidak mengganggu transaksi atau menutupi informasi penting. | Lulus | - |
| Tipe pesanan dan pembayaran | Pilih makan di tempat/takeaway; lanjutkan pembayaran; batalkan atau selesaikan alur. | Tipe pesanan dan total benar; hasil transaksi/nota sesuai alur yang tersedia. | Lulus | - |
| Pesanan makan di tempat | Buka daftar pesanan dan uji tindakan yang tersedia. | Daftar dan status pesanan sesuai transaksi uji. | Lulus | - |
| Penjualan | Periksa halaman laporan Penjualan Pemilik dan Kasir dengan rentang/data uji yang tersedia. | Nilai dan filter laporan sesuai transaksi uji. | Lulus | - |
| Performa kasir | Periksa laporan/peringkat kasir dengan data uji. | Data kasir dan metrik sesuai transaksi uji. | Lulus | - |
| Validasi dan ketahanan | Uji input kosong, format salah, nilai batas, pemuatan/error API, serta refresh halaman. | Pesan kesalahan jelas; aplikasi tidak menyimpan data tidak valid atau masuk ke kondisi rusak. | Lulus | - |

Hapus atau sesuaikan skenario yang memang tidak tersedia di environment yang diuji, lalu jelaskan alasannya di kolom catatan.

### Kebutuhan foto menu halaman Kasir

Gunakan foto asli agar kasir mudah mengenali menu. Minta mitra mengirim foto yang jelas, pencahayaannya baik, dan sesuai dengan menu. Usahakan gaya foto konsisten dan pastikan foto boleh digunakan di aplikasi.

Foto dapat disimpan di `frontend/public/images/menu/`. Setelah itu, buka **Pemilik → Menu dan Kategori → Edit**, lalu masukkan path foto pada kolom **URL foto**, misalnya `/images/menu/sop-kikil.jpg`, dan simpan.

Contoh permintaan kepada mitra:

> Mohon bantu kirim foto asli untuk setiap menu yang dijual. Foto diharapkan jelas, pencahayaannya baik, dan sesuai dengan menu agar bisa ditampilkan di halaman Kasir. Mohon konfirmasi juga bahwa foto tersebut boleh digunakan di aplikasi.

### Format catatan test case

Salin baris berikut untuk menambahkan skenario:

| ID | Fitur/skenario | Prasyarat dan data uji | Langkah pengujian | Hasil yang diharapkan | Hasil aktual | Status | Bukti |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-001 | [nama skenario] | [kondisi/data awal] | 1. [langkah pertama]<br>2. [langkah berikutnya] | [hasil yang seharusnya] | [hasil yang terjadi] | Belum diuji | [tautan/lokasi screenshot atau log] |

### Format laporan temuan/revisi

Gunakan format berikut untuk setiap bug atau usulan revisi. Bedakan bug (perilaku tidak sesuai kebutuhan) dari usulan perbaikan UX.

```text
[BUG/UX]-[nomor]: [judul singkat]
Severity/Prioritas: [Kritis/Tinggi/Sedang/Rendah]
Fitur dan environment: [halaman/API, browser, versi]
Prasyarat: [kondisi sebelum langkah dilakukan]
Langkah reproduksi:
1. [langkah pertama]
2. [langkah berikutnya]
Hasil yang diharapkan: [perilaku yang benar]
Hasil aktual: [perilaku yang terjadi]
Frekuensi: [selalu/kadang-kadang, jumlah percobaan]
Bukti: [tautan/lokasi screenshot, video, atau log tanpa rahasia]
Saran revisi: [perubahan yang disarankan, jika diketahui]
Status: [Baru/Dikerjakan/Perlu regresi/Selesai]
Hasil uji ulang: [tanggal, versi, hasil; isi setelah perbaikan diuji]
```

Jangan masukkan PIN, password, token, cookie, atau data pribadi ke laporan maupun bukti.

## Integrasi Midtrans

- **Status:** QRIS Core API terpasang. Halaman Kasir menampilkan QR asli dari Midtrans dan menunggu pelunasan melalui webhook atau polling status.
- `POST /api/payments/midtrans/notification` memverifikasi signature SHA-512 dan menangani notifikasi secara idempoten.
- `GET /api/orders/:code/payment` menyinkronkan status untuk development tanpa URL publik.
- Pengujian sandbox yang tercatat mencakup pembuatan charge, status `PENDING`, dan pelunasan.
- Variabel `.env`: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, dan `MIDTRANS_EXPIRY_MINUTES`.

Simpan kredensial hanya di server; jangan masukkan ke repository.

## Menjalankan test otomatis

Jalankan test frontend dari folder `frontend`:

```bash
npm test
```

Jalankan test backend dari folder `backend`:

```bash
npm test
```

Test backend menggunakan database uji di port 5434 dan dapat mengosongkan tabelnya. Pastikan konfigurasi hanya mengarah ke database uji, bukan database kerja atau production.

### Hasil test yang tercatat

Isi atau perbarui bagian ini setelah menjalankan test. Jangan menandai lulus hanya karena test berhasil dimulai.

| Bagian | Perintah | Hasil | Catatan |
| --- | --- | --- | --- |
| Frontend | `cd frontend && npm test` | Lulus, 32/32 | 10 berkas test |
| Backend | `cd backend && npm test` | Lulus, 89/89 | 13 berkas test; database uji |

## Kriteria QA selesai

- Semua skenario dalam scope memiliki status dan hasil aktual.
- Setiap kegagalan memiliki langkah reproduksi dan bukti yang aman dibagikan.
- Perbaikan yang sudah dibuat diuji ulang dan hasilnya dicatat pada temuan.
- Automated test terkait sudah dijalankan dan hasilnya dicatat.
- Temuan yang belum selesai, terblokir, atau berisiko sudah diterima secara eksplisit oleh pihak terkait.
