# Frontend Design — Implementasi Aktual

Dokumen ini merangkum gaya visual yang diterapkan pada `frontend/src/index.css`, bukan target
desain yang belum diimplementasikan.

## 1. Gaya Umum

- Tema terang dengan latar krem pucat dan permukaan kartu putih.
- Warna aksen utama merah tua, teks hitam/cokelat gelap.
- Layout responsif: POS menggunakan area nota dan menu berdampingan pada layar lebar serta
  menyesuaikan ke layar sempit.
- Komponen menggunakan kartu, tabel, chip filter, modal, tombol, dan navigasi kontekstual
  pemilik/kasir.
- Font utama `Plus Jakarta Sans`, dengan font sistem sebagai fallback.

## 2. Token CSS Aktual

| Variabel CSS | Nilai | Penggunaan |
|---|---|---|
| `--red` | `#8f1d1d` | Aksi utama, fokus, dan aksen |
| `--red-d` | `#6e1414` | Hover aksi utama |
| `--red-l` | `#f7ebe9` | Latar aksen merah muda |
| `--ink` | `#141211` | Teks utama |
| `--ink-2` | `#4a4440` | Teks sekunder |
| `--mute` | `#8a817b` | Teks muted |
| `--line` | `#e9e3df` | Border |
| `--bg` | `#faf7f5` | Latar halaman |
| `--card` | `#ffffff` | Latar kartu |
| `--ok`, `--ok-l` | `#1f7a4d`, `#e5f4ec` | Status berhasil |
| `--warn`, `--warn-l` | `#a8650a`, `#fbf0dc` | Status peringatan |
| `--r` | `14px` | Radius dasar kartu |

Komponen lain memakai ukuran dan warna tambahan langsung di CSS; nilai di atas bukan daftar
seluruh deklarasi visual.

## 3. Tipografi dan Kontrol

- Ukuran teks dasar body adalah `15px`; ukuran judul/label bervariasi mengikuti komponen.
- Tombol menggunakan ukuran yang berbeda (`btn`, `btn-sm`, `btn-lg`); tidak ada ketentuan
  universal minimum 48px di stylesheet.
- Fokus keyboard terlihat melalui `:focus-visible`.
- Input form memakai label yang terlihat di layar untuk form utama.

## 4. Responsif

CSS memiliki breakpoint pada `900px`, `720px`, `640px`, dan `520px` untuk mengubah jumlah
kolom grid dan susunan form. POS menyediakan tautan/floating action ke nota di layar sempit.
Ukuran dan susunan aktual ditentukan oleh aturan komponen di `index.css`.

## 5. Status UI

Status pesanan memakai label dan kelas visual, misalnya berlangsung/siap/selesai. Pilihan metode
pembayaran menampilkan Cash dan QRIS. QR pada alur QRIS saat ini adalah QR mock, bukan kode
pembayaran yang dihasilkan Midtrans.

## 6. Batas Dokumen

Dokumen ini tidak menetapkan rasio kontras WCAG, ukuran target sentuh minimum, dukungan haptic,
atau perilaku yang belum dibuktikan oleh stylesheet dan komponen saat ini.
