# Catatan Revisi SKPL — QRIS Midtrans dan Menu Server

Sumber: `docs/SKPL_non-OO_-_Warkil-Kasir_Rev-C.docx` (Revisi C, 12-11-2026).
Catatan disusun 26-11-2026 setelah QRIS diganti dari simulasi menjadi Midtrans Core API dan
menu/kategori dipindahkan dari localStorage ke database.

## 1. Riwayat Revisi

- **Daftar Perubahan**: tambah baris D dengan ringkasan "Integrasi QRIS Midtrans Core API dan
  pemindahan menu/kategori ke database: endpoint charge/status/webhook, CRUD menu/kategori,
  seed tidak lagi menimpa perubahan pemilik, status order UNPAID/CANCELLED, pembaruan skema
  Payment". Jangan ubah deskripsi Revisi C karena itu catatan historis.
- **Tabel INDEX/TGL dan Diperiksa/Disetujui**: isi tanggal D (26-11-2026); kolom pemeriksa dan
  penyetuju tetap "Perlu konfirmasi".
- **Daftar Halaman Perubahan**: isi rentang halaman Revisi D setelah tata letak final.

## 2. Bab I — Pendahuluan

| Lokasi | Klaim saat ini | Perlu diperbarui |
|---|---|---|
| Lingkup Masalah, paragraf 1 | "menu, kalender, QRIS, serta beberapa laporan masih dikelola lokal atau disimulasikan" | QRIS keluar dari daftar simulasi; sebut Midtrans Core API dengan status sandbox terimplementasi |
| Tabel 1, baris QRIS | "hanya ditampilkan sebagai simulasi QR mock" | Metode pembayaran QRIS melalui Midtrans Core API; QR asli dari gateway |
| Tabel 1, baris Midtrans | "belum terintegrasi dan masih menunggu persetujuan akun" | Terintegrasi di sandbox; produksi menunggu persetujuan akun dan kredensial production |
| Tabel 2, baris Simulasi | contoh "QRIS saat ini" | Ganti contoh ke riwayat demo/kalender; QRIS bukan lagi contoh simulasi |

## 3. Bab II — Deskripsi Global

- **Perspektif Produk**: hapus "Tidak ada integrasi pembayaran Midtrans pada implementasi saat
  ini"; ganti dengan alur charge QRIS, webhook, dan polling status.
- **Fungsi Produk**: butir QRIS saat ini menyebut simulasi. Tambahkan fungsi pembayaran QRIS
  nyata: charge ke Midtrans, tampil QR, menunggu pelunasan, webhook/polling, pembatalan saat
  gagal/kedaluwarsa. Perbarui juga daftar fungsi sehingga QRIS tidak lagi disebut simulasi.
- **Karakteristik Pengguna (Tabel 3 dan paragraf sebelumnya)**: kalimat "interaksi pembayaran
  aktual dari pelanggan belum terintegrasi" tidak berlaku. Pelanggan tetap tanpa akun, tetapi
  memindai QR memakai aplikasi e-wallet/m-banking miliknya.
- **Batasan-batasan**:
  - Daftar endpoint "hanya health, auth, cashiers, dan orders" harus ditambah endpoint status
    pembayaran dan webhook Midtrans.
  - Butir "Fitur QRIS saat ini menghasilkan QR mock..." harus diganti dengan perilaku baru:
    QR dari gateway, order `UNPAID`/payment `PENDING`, lunas lewat notifikasi atau polling.
  - Tambahkan batasan produksi: callback Midtrans memerlukan URL publik HTTPS, kredensial
    production, dan persetujuan akun; kredensial tidak boleh masuk dokumen/repo.
- **Asumsi dan Kebergantungan**: hapus "Pembayaran QRIS eksternal tidak tersedia"; ganti dengan
  ketergantungan pada Midtrans, koneksi keluar server, dan URL callback publik. Sebut bahwa
  development lokal memakai polling karena webhook tidak dapat menjangkau localhost.

## 4. Bab III — Antarmuka dan Aliran Informasi

- **Antarmuka perangkat lunak**: tambahkan Midtrans Core API (`/v2/charge`, `/v2/{order}/status`)
  dan endpoint webhook. Hapus "Tidak ada API Midtrans aktif".
- **Antarmuka komunikasi**: jelaskan HTTPS publik untuk webhook, sandbox vs production, serta
  polling sebagai jalur cadangan. Domain produksi dan HTTPS masih "Perlu konfirmasi".
- **Aliran informasi, Keterangan Gambar 1**: hapus "alur QRIS hanya simulasi UI dan Midtrans
  belum terhubung". Gambarkan Midtrans sebagai entitas eksternal dengan panah notifikasi masuk.
- **DFD Level 1**:
  - P3: tambahkan cabang QRIS yang memanggil Midtrans dan menyimpan QR/expiry.
  - P4: sebutkan bahwa order `UNPAID` belum muncul di daftar order sampai lunas.
  - P6–P9: P8 bukan lagi rencana; pindahkan menjadi proses aktual. Perbarui legenda
    terimplementasi/parsial/rencana.
  - Data store: Payment sekarang menyimpan `qrString`, `expiresAt`, `midtransOrderId`,
    `midtransTransactionId`, `rawPayload`.
- **Paragraf perilaku order**: "Setiap order ... langsung READY dan Payment PAID" harus dipecah:
  Cash langsung `READY`/`PAID`; QRIS `UNPAID`/`PENDING` sampai gateway mengonfirmasi.
- **Paragraf pembayaran Cash/QRIS**: ganti "QRIS ... mock ... tetap menyimpan payment PAID tanpa
  konfirmasi gateway" dengan aturan status baru, termasuk `FAILED`/`EXPIRED`/`CANCELLED`.
- **DFD Level 2 P3 langkah (7) dan Gambar 4**: hapus keterangan "QRIS masih simulasi"; tambahkan
  langkah charge dan penantian notifikasi.
- **Status order dan pembayaran + Gambar 5**: alur QRIS Pending → Paid/Failed/Expired kini
  aktual, bukan rencana. Tambahkan `UNPAID` dan `CANCELLED` sebagai status order yang dipakai.
  Status "Diproses/Siap/Selesai" tetap rencana dan harus dipisahkan dari diagram QRIS.

## 5. Kebutuhan Fungsional dan Data

- **SKPL-F-06**: hapus "setiap payment yang dibuat endpoint langsung berstatus PAID"; jelaskan
  pembedaan Cash dan QRIS serta order `UNPAID`.
- **SKPL-F-07**: tambahkan catatan bahwa daftar order hanya memuat `READY`/`COMPLETED`, sehingga
  QRIS yang masih `PENDING` tidak tampil sampai lunas.
- **SKPL-F-11**: tulis ulang sebagai terimplementasi untuk sandbox:
  - QR sesuai nominal dibuat server melalui Midtrans;
  - order/payment tersimpan sebelum pelunasan;
  - pelunasan hanya dari notifikasi bertanda tangan atau status gateway;
  - notifikasi ganda tidak mengubah pembayaran;
  - gagal/kedaluwarsa membatalkan order;
  - produksi menunggu persetujuan akun dan kredensial.
- **Kamus Data, entri Payment**: "field referensi gateway yang belum dipakai" diganti daftar
  field yang dipakai.
- **Pemodelan Data / E-R**: sebutkan Payment memiliki `qrString`, `expiresAt`,
  `midtransOrderId`, `midtransTransactionId`, `paymentType`, `rawPayload`, `failureReason`.
  Field Snap tidak lagi ada di skema.

## 6. Kebutuhan Nonfungsional dan Kualitas

- **Security dan SKPL-NF-06**: tambahkan verifikasi signature SHA-512 pada webhook, penolakan
  bila server key kosong, penyimpanan kredensial hanya di environment server, dan validasi
  jumlah/transaksi sebelum status diubah.
- **Reliability dan SKPL-NF-04**: tambahkan idempotensi notifikasi, transaksi database untuk
  perubahan payment+order, respons 502 saat charge gagal, 403 saat signature salah, dan 400 saat
  nominal tidak cocok.
- **Keremawatan**: sebutkan penambahan tes signature, notifikasi ganda, nominal tidak cocok,
  kedaluwarsa, polling, dan kegagalan gateway.
- **Batasan Perancangan**: baris "QRIS belum mempunyai alur produksi penuh" diperbarui menjadi
  alur sandbox tersedia, produksi menunggu kesiapan akun/HTTPS.

## 7. Matriks Keterunutan

- **Tabel 7**: baris SKPL-F-11 diubah dari "QR mock ... Midtrans rencana" menjadi terimplementasi
  sandbox dengan catatan produksi; baris F-05/F-11 tidak lagi menyebut QRIS simulasi.
- **Tabel 8**: perbarui baris "Metode pembayaran Cash dan QRIS" dan baris "Alur kasir" — QR
  sesuai nominal dan konfirmasi pembayaran bukan lagi simulasi.
- **Tabel 9**: perbarui status "Pembayaran QRIS" dan "Pencatatan transaksi otomatis" (QRIS tidak
  lagi tercatat PAID tanpa verifikasi). Tambahkan kriteria penerimaan: QR kedaluwarsa
  membatalkan order dan notifikasi ganda tidak membuat pembayaran kedua.
- **Tabel 10**: baris Payments — `qris_reference_number` sekarang dipetakan dan dipakai;
  tambahkan `qrString`/`expiresAt` serta catatan bahwa status payment mengikuti gateway.

## 8. Rekomendasi Keputusan (perlu keputusan, bukan sekadar edit teks)

1. **Kebijakan nomor antrean**: kode dan nomor antrean saat ini dipesan saat order dibuat, jadi
   QRIS gagal/kedaluwarsa meninggalkan celah nomor. Tetapkan apakah celah diterima atau nomor
   baru diberikan saat lunas; jika berubah, perbarui F-06, DFD P3, dan Gambar 5.
2. **Pembatalan pembayaran**: belum ada tombol/endpoint batal saat QR masih hidup. Tambahkan bila
   kasir perlu membatalkan dan membebaskan nomor; dokumentasikan sebagai kebutuhan baru.
3. **Rekonsiliasi order menggantung**: tanpa webhook (mis. URL callback belum siap), order
   `PENDING` hanya tersinkron saat layar kasir polling. Pertimbangkan job berkala yang menanyakan
   status ke Midtrans dan menutup order kedaluwarsa.
4. **Refund**: `flaggedForRefund` belum dipakai. Tetapkan prosedur refund manual/pelanggan
   membayar ganda, lalu tambahkan kebutuhan dan alur datanya.
5. **Kesiapan produksi**: persetujuan akun Midtrans, server/client key production, URL webhook
   HTTPS di dashboard, rotasi rahasia, dan monitoring kegagalan charge/notifikasi. Semua ini
   masih "Perlu konfirmasi" dan sebaiknya menjadi butir batasan operasional.
6. **Kredensial**: `MIDTRANS_CLIENT_KEY` belum dipakai frontend. Hapus dari daftar kebutuhan
   aktif atau tandai sebagai cadangan agar dokumen tidak menjanjikan fitur yang tidak ada.
7. **Retensi `rawPayload`**: payload gateway tersimpan di database. Tetapkan masa simpan atau
   minimal alasan penyimpanan agar tidak bertentangan dengan kebijakan retensi (SKPL-NF-14).
8. **Sinkronisasi dokumen lain**: Manual Book hlm. 13 dan `deploy/README.md` masih perlu
   diselaraskan dengan alur QRIS nyata dan konfigurasi webhook. `docs/7-integrasi-midtrans.md`
   sudah diperbarui.

## 9. Bukti Uji yang Dapat Dicantumkan

- Charge QRIS sandbox berhasil (`201`, status `pending`, `qr_string` diterima) melalui API lokal.
- QR tampil di modal kasir dan polling mengembalikan `PENDING`.
- Notifikasi bertanda tangan mengubah payment menjadi `PAID`, order menjadi `READY`, dan layar
  kasir menampilkan nomor antrean (screenshot tersedia di akar repo:
  `qris-paymodal-after.png`, `qris-paymodal-done-after.png`).
- Tes otomatis: signature valid/rusak, notifikasi ganda, nominal tidak cocok, kedaluwarsa,
  polling, kegagalan gateway, dan charge gagal.
- Catatan kejujuran: pelunasan diuji dengan notifikasi bertanda tangan yang dibuat sendiri,
  bukan pembayaran pelanggan sungguhan melalui aplikasi e-wallet. Uji pembayaran nyata di
  simulator/dashboard sandbox sebaiknya ditambahkan sebelum status "teruji penuh".

## 10. Perubahan Menu dan Kategori (server-backed)

| Lokasi | Klaim Rev C | Perlu diperbarui |
|---|---|---|
| Lingkup Masalah | "menu … masih dikelola lokal" | Menu dan kategori memakai API serta database; kalender dan sebagian riwayat tetap lokal/demo |
| Perspektif Produk | "sebagian tampilan menu … state localStorage" | Hapus menu dari daftar state browser; menu dimuat dari `GET /api/menus` setelah login |
| Fungsi Produk | Memilih "menu lokal"; sumber menu seed; UI memuat salinan | Menu berasal dari database; perubahan pemilik tersimpan di database |
| Karakteristik Pengguna (Tabel 3) | "Menu … belum bersumber penuh dari backend" | Pemilik mengelola menu/kategori melalui API; kasir membaca katalog yang sama |
| Batasan-batasan | Endpoint hanya health/auth/cashiers/orders; CRUD menu belum ada | Tambahkan `/api/menus` dan `/api/categories`; hapus pernyataan CRUD belum ada |
| Batasan-batasan (seed) | Deploy menimpa nama/harga menu; perubahan menu lewat seed | Seed hanya membuat menu/kategori yang belum ada; perubahan pemilik tidak ditimpa |
| Antarmuka perangkat lunak | Daftar REST API tanpa menu | Tambahkan endpoint menu/kategori dan batas body 2 MB untuk foto data URL |
| DFD Level 1 P5/P6 | Menu dan kategori disimpan di browser; P6 rencana | P5 hanya kalender/status/riwayat; P6 (menu/kategori) menjadi proses aktual |
| DFD data store | Store browser mencakup menu dan kategori | Hapus menu/kategori dari store browser; API menulis Menu/Category/MenuComponent |
| Paragraf harga paket | Harga paket via API salah (Rp 0) karena komponen tidak dimuat | Query order memuat komponen paket; harga paket dihitung benar dan diuji |
| SKPL-F-05 | "cacat laten pada paket" | Paket tidak lagi cacat; sebutkan pengujian total paket |
| SKPL-F-08 | CRUD menu/kategori hanya localStorage; ketersediaan tidak ada | Terimplementasi di server (tambah/ubah/hapus lunak, kategori, paket); kolom ketersediaan tetap belum ada dan perlu keputusan |
| Kamus Data | "UI menu menyimpan salinannya di browser" | Menu/Category/MenuComponent dibaca dan ditulis lewat API |
| Batasan Perancangan | "Menu … belum mempunyai alur produksi penuh" | Menu sudah punya alur produksi; kalender/laporan demo tetap |
| Tabel 7 | F-08–F-10 "data lokal; CRUD server belum ada" | F-08 menjadi terimplementasi; F-09/F-10 tetap parsial/demo |
| Tabel 8 | "Manajemen menu — Frontend/local" | Terimplementasi di server; bukti route menu dan pengujian |
| Tabel 8 | "Menu paket — Parsial; harga paket salah" | Terimplementasi; komponen, diskon, dan harga paket diuji |
| Tabel 9 | "Manajemen menu — Belum terpenuhi: hanya localStorage" | Terpenuhi untuk menu/kategori/harga/paket; ketersediaan menu masih perlu keputusan skema |
| Tabel 10 | `Menus.is_available` tidak ada | Tetap tidak ada; bedakan dari CRUD yang sudah berjalan |

Rekomendasi tambahan:

1. **Ketersediaan menu**: UI lama menyebut status ketersediaan, tetapi skema hanya punya
   `deletedAt`. Putuskan apakah "habis" cukup lewat hapus lunak atau perlu kolom
   `isAvailable`/stok harian sebelum F-08 dinyatakan penuh.
2. **Sinkronisasi kasir terbuka**: kasir melihat perubahan menu setelah reload/login, belum ada
   event realtime menu. Tambahkan kebutuhan/event bila perubahan harus langsung terlihat.
3. **Foto menu**: sekarang tersimpan sebagai data URL di database (maks. body 2 MB). Tetapkan
   batas ukuran, kompresi, dan kebijakan retensi bila foto banyak.
4. **Seed**: dokumen deploy dan SKPL harus menyebut seed bersifat insert-only untuk menu agar
   deploy tidak dianggap menimpa data pemilik.

## 11. Bukti Uji Menu (dapat dicantumkan)

- `GET /api/menus` mengembalikan kategori dan menu; tanpa sesi 401, kasir boleh membaca.
- Pemilik membuat/mengubah/menghapus menu; kasir ditolak 403; hapus bersifat lunak.
- Kategori dapat dibuat (termasuk kategori paket), diganti nama, dan dihapus hanya bila kosong.
- Paket disimpan dengan komponen dan diskon; order paket menghasilkan total diskon yang benar.
- Perubahan harga lewat UI pemilik tersimpan ke database dan terbaca lagi setelah refresh.
- Seed dijalankan ulang tidak menimpa nama/harga/kategori yang sudah diubah pemilik.
