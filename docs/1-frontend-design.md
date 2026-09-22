# Frontend Design — Warung Kikil Abang POS

## 1. Filosofi Desain

Warung Kikil Abang bukan brand kuliner modern — ini warung legendaris yang mempertahankan
resep kikil turun-temurun dan pernah menjadi tempat makan favorit Gus Dur. Namun aplikasi
ini **bukan materi promosi**, melainkan **alat kerja harian** yang harus bisa dipakai cepat
oleh kasir dari segala usia, sering kali sambil melayani pelanggan yang mengantre. Karena itu
prinsip desainnya adalah:

> **Kejelasan mengalahkan keindahan. Kecepatan mengalahkan kelengkapan.**

Identitas visual tetap diambil dari dunia nyata warung ini — warna kikil yang dimasak dengan
kecap dan rempah, sambal, dan kertas nota — supaya aplikasi terasa dibuat *untuk* Warung Kikil
Abang, bukan template kasir generik. Tapi setiap keputusan visual diuji dengan satu pertanyaan:
*apakah ini membuat kasir berusia 50 tahun lebih cepat menyelesaikan transaksi, atau lebih
lambat?*

## 2. Prinsip UI/UX Utama

1. **Mobile-first, satu tangan.** Tombol aksi utama (Bayar, Tambah, Simpan) selalu berada di
   area yang mudah dijangkau ibu jari saat memegang ponsel dengan satu tangan (sepertiga bawah
   layar).
2. **Target sentuh besar.** Minimum tinggi tombol **48px**, jarak antar elemen yang bisa
   disentuh minimum **8px**, untuk mengakomodasi jari yang kurang presisi maupun layar yang
   dilihat sambil berdiri.
3. **Teks dan angka besar, jelas terbaca.** Ukuran teks dasar **16–18px**, harga dan total
   memakai angka tabular (tabular figures) agar rapi sejajar dan mudah dibaca sekilas.
4. **Ikon selalu didampingi label teks.** Tidak ada tombol ikon-saja untuk aksi penting —
   pengguna yang kurang terbiasa dengan simbol aplikasi tetap paham fungsi tombol.
5. **Alur linear, sedikit langkah.** Hindari menu bertingkat atau modal berlapis. Transaksi
   dari pilih menu sampai bayar idealnya selesai dalam 3 layar.
6. **Umpan balik jelas dan segera.** Setiap aksi (tambah item, simpan menu, pembayaran
   berhasil) memberi konfirmasi visual instan — warna berubah, ikon centang, getaran halus
   (haptic) di perangkat yang mendukung.
7. **Kesalahan mudah dibatalkan.** Aksi destruktif (hapus menu, batalkan transaksi) selalu
   melalui konfirmasi sederhana ("Ya, hapus" / "Batal"), bukan langsung tereksekusi.
8. **Kontras tinggi, bukan kontras dekoratif.** Warna dipakai untuk membedakan status
   (tersedia/habis, lunas/menunggu), bukan sekadar hiasan — pengguna lansia dan pengguna
   dengan keterbatasan penglihatan ringan tetap bisa membedakan status tanpa membaca teks.

## 3. Token Warna

Palet diambil dari dunia dapur warung: kuah kikil yang gelap kecokelatan-merah dari kecap dan
rempah, sambal cabai, dan kertas nota lama — bukan palet SaaS generik biru/ungu.

| Nama Token | Hex | Peran |
|---|---|---|
| `brand-primary` (Merah Bata) | `#B3402F` | Tombol aksi utama, header, elemen brand |
| `brand-primary-dark` | `#8A2F22` | Status *pressed*/hover tombol utama |
| `brand-primary-soft` | `#F4DAD3` | Latar chip/badge terkait brand (misal tab aktif) |
| `accent-kunyit` (Kuning Kunyit) | `#D99A2B` | Penekanan sekunder, badge "Menu Favorit", status *menunggu* |
| `success` (Hijau Daun) | `#4B7A4F` | Status "Tersedia", "Lunas", konfirmasi berhasil |
| `success-soft` | `#E1EEE0` | Latar badge status sukses |
| `danger` (Merah Cabai) | `#C1382A` | Status "Habis", "Gagal", peringatan/hapus |
| `danger-soft` | `#F6DEDA` | Latar badge status gagal/habis |
| `warning` | `#D99A2B` | Status "Menunggu pembayaran" (memakai `accent-kunyit`) |
| `bg-base` (Krem Nota) | `#FAF3E7` | Latar belakang aplikasi |
| `surface` | `#FFFFFF` | Latar kartu/panel di atas `bg-base` |
| `border` | `#E7D9C6` | Garis pembatas, divider |
| `text-primary` (Cokelat Arang) | `#2B211C` | Teks utama — bukan hitam murni, lebih hangat |
| `text-secondary` | `#6E5F56` | Teks sekunder, label, keterangan waktu |
| `text-on-brand` | `#FFFFFF` | Teks di atas warna `brand-primary` |

**Alasan memilih palet ini (bukan default):** kombinasi krem hangat + terracotta yang umum
dipakai desain buatan AI secara default sengaja dihindari. Merah bata di sini dipilih karena
asosiasi langsung dengan sambal dan papan nama warung tradisional Indonesia, bukan sekadar
warna "hangat" generik — dan tetap memenuhi kontras WCAG AA terhadap latar krem maupun putih.

### Kontras & Aksesibilitas Warna
- `text-primary` di atas `bg-base`: rasio kontras ±11.8:1 (jauh di atas syarat AA 4.5:1).
- `text-on-brand` di atas `brand-primary`: rasio kontras ±5.4:1 (memenuhi AA untuk teks normal).
- Status tidak pernah hanya dibedakan lewat warna — selalu disertai label teks (misal bukan
  hanya lingkaran hijau, tapi lingkaran hijau + tulisan "Tersedia").

## 4. Tipografi

| Peran | Font | Alasan |
|---|---|---|
| UI, judul, angka/harga | **Plus Jakarta Sans** (400/500/600/700) | Sans humanis dengan bentuk huruf ramah, angka tabular yang tegas dan mudah dibedakan (penting untuk harga & total) |
| Monospace (opsional) | Sistem default monospace | Hanya untuk kode referensi pembayaran QRIS agar tidak tertukar huruf O/0 |

Skala tipografi (mobile-first, base 16px):

| Level | Ukuran | Bobot | Contoh pemakaian |
|---|---|---|---|
| Display | 28px / line-height 34px | 700 | Total pembayaran di layar bayar |
| H1 | 22px / 28px | 700 | Judul halaman ("Buat Transaksi") |
| H2 | 18px / 24px | 600 | Judul kartu/section |
| Body | 16px / 24px | 400–500 | Nama menu, isi form |
| Caption | 14px / 20px | 400 | Waktu transaksi, keterangan kecil |
| Label tombol | 16px / 24px | 600 | Teks di dalam tombol |

Satu keluarga font dipakai untuk semuanya — tidak perlu font kedua untuk judul, karena
aplikasi ini adalah alat kerja, bukan media pemasaran yang butuh kepribadian visual berlapis.

## 5. Layout & Spacing

- **Grid dasar:** kelipatan 4px (4, 8, 12, 16, 24, 32).
- **Spacing standar antar elemen:** 16px sebagai jarak default antar kartu/section.
- **Radius sudut:** 12px untuk kartu & tombol besar, 8px untuk elemen kecil (chip, badge) —
  cukup lembut tanpa membuat semuanya terlihat seperti "kit kartu SaaS" yang identik.
- **Elevasi:** hindari efek shadow berlapis. Cukup satu shadow tipis (`0 1px 3px
  rgba(43,33,28,0.08)`) untuk kartu yang mengambang di atas latar, dan garis `border` untuk
  pemisah di dalam daftar (lebih murah secara render & lebih tegas untuk perangkat low-end).
- **Struktur layar:** satu kolom penuh (single column) di semua ukuran layar target — aplikasi
  ini tidak dirancang untuk desktop lebar, jadi tidak perlu grid multi-kolom yang rumit.
- **Zona ibu jari (thumb zone):** navigasi utama dan tombol konfirmasi ditempatkan di 1/3 bawah
  layar; area atas dipakai untuk informasi (judul, status), bukan aksi.

### Anatomi Layar Standar

```
┌───────────────────────────┐
│ Header (judul + status)   │  ← area baca, bukan area sentuh utama
├───────────────────────────┤
│                           │
│   Konten (scrollable)     │  ← daftar menu / form / riwayat
│                           │
├───────────────────────────┤
│ Bar aksi tetap (sticky)   │  ← total harga + tombol utama, selalu terlihat
├───────────────────────────┤
│ Navigasi bawah (tab bar)  │  ← hanya untuk halaman utama, disembunyikan saat checkout
└───────────────────────────┘
```

## 6. Badge & Indikator Status

Konsisten dipakai di seluruh aplikasi agar kasir tidak perlu berpikir ulang arti warna di
setiap layar.

| Status | Warna badge | Label |
|---|---|---|
| Menu tersedia | `success` / `success-soft` | "Tersedia" |
| Menu habis | `danger` / `danger-soft` | "Habis" |
| Pembayaran lunas | `success` / `success-soft` | "Lunas" |
| Pembayaran menunggu (QRIS belum discan/dikonfirmasi) | `warning` / latar kuning muda | "Menunggu Pembayaran" |
| Pembayaran gagal/kedaluwarsa | `danger` / `danger-soft` | "Gagal" |
| Metode Cash | `text-secondary` + ikon uang | "Tunai" |
| Metode QRIS | `brand-primary` + ikon QR | "QRIS" |

## 7. Contoh Wireframe (ASCII)

### Layar Kasir — Buat Transaksi
```
┌───────────────────────────┐
│ ☰  Buat Transaksi         │
│ Kategori: [Semua][Nasi][Lauk][Minuman] │
├───────────────────────────┤
│ [foto] Kikil Sapi          │
│        Rp 25.000  [－ 1 ＋]│
├───────────────────────────┤
│ [foto] Es Teh Manis        │
│        Rp 5.000   [＋ Tambah] │
├───────────────────────────┤
│           ...              │
├───────────────────────────┤
│ 3 item · Total Rp 55.000   │
│ [   Lanjut ke Pembayaran  ]│  ← tombol penuh lebar, tinggi 52px
└───────────────────────────┘
```

### Layar Pembayaran QRIS
```
┌───────────────────────────┐
│ ←  Pembayaran              │
│ Total: Rp 55.000           │
├───────────────────────────┤
│                             │
│      [  QR CODE BESAR  ]   │
│                             │
│   Menunggu Pembayaran ⏳    │
│   Tunjukkan layar ini ke    │
│   pelanggan untuk dipindai  │
├───────────────────────────┤
│ [   Batalkan Pembayaran   ] │
└───────────────────────────┘
```
Status di layar ini otomatis berubah menjadi "Lunas ✓" (hijau) begitu backend menerima
konfirmasi dari Midtrans, tanpa kasir perlu menekan tombol apa pun.

## 8. Mode Tema

Aplikasi menggunakan **satu tema terang (light theme) tetap**, bukan mengikuti preferensi
sistem. Ini keputusan sadar, bukan keterbatasan: warung beroperasi malam hari (15.00–00.00)
dengan pencahayaan meja kasir yang kadang minim, dan tema terang dengan kontras tinggi lebih
mudah dibaca sekilas dibanding tema gelap pada situasi tersebut. Dark mode dapat menjadi
peningkatan di masa depan, bukan kebutuhan inti saat ini.

## 9. Ringkasan Checklist Aksesibilitas

- [ ] Semua tombol aksi ≥ 48×48px
- [ ] Kontras teks-latar minimum AA (4.5:1 teks normal, 3:1 teks besar)
- [ ] Status tidak pernah hanya mengandalkan warna (selalu + label teks/ikon)
- [ ] Font dasar tidak lebih kecil dari 14px, elemen penting (harga, total) ≥ 16px
- [ ] Setiap input form punya label yang selalu terlihat (bukan hanya placeholder)
- [ ] Aksi destruktif selalu meminta konfirmasi
