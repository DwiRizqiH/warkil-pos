# Deploy

Server: `155.94.164.159` (user `dwi`). Aplikasi jalan di `/home/dwi/warkil-kasir`,
dikelola PM2 dengan nama proses `warkil-kasir` pada port `3100`.
Nginx `testwarkil.remcp.com` (port 80) mem-proxy ke port tersebut.

## Deploy

`.github/workflows/deploy.yml` **tidak** deploy otomatis: push ke `main` dan pull
request hanya menjalankan build + tes. Deploy dipilih manual dari GitHub →
Actions → **CI & Deploy** → *Run workflow*, dengan input:

| Mode | Yang terjadi di server |
| --- | --- |
| `production` (default) | upload, `npm ci --omit=dev`, `prisma migrate deploy`, `npm run seed`. Data penjualan tidak disentuh. |
| `demo` | sama, lalu **semua pesanan, pembayaran, dan shift dihapus** dan diganti riwayat demo 120 hari. |
| `reset` | sama, lalu **semua pesanan, pembayaran, dan shift dihapus** dan dibiarkan kosong — untuk mulai jualan sungguhan dari nol. |

Deploy juga hanya jalan dari `main`: dispatch dari branch lain berhenti sebelum
upload, supaya kode yang belum di-merge tidak mendarat di server.

Mode `demo` dan `reset` menuntut input `confirm` diisi `wipe`; tanpa itu workflow
berhenti sebelum menyentuh server. Keduanya juga menulis peringatan di ringkasan
run, karena penghapusan itu permanen.

Isi langkah di workflow:

1. runner checkout repo, `npm ci` + `npm run build` di `frontend/`
2. `frontend/dist`, `backend/`, dan `deploy/` di-upload ke server
3. `deploy/deploy.sh` dijalankan di server: periksa mode dan env,
   `npm ci --omit=dev`, `prisma migrate deploy`, `npm run seed`, restart PM2,
   lalu cek `/api/health`

**Satu langkah manual yang belum bisa diotomatiskan:** tambahkan repository secret
`SSH_PASSWORD` di Settings → Secrets and variables → Actions. Nilainya password SSH
user `dwi`. Tanpa secret ini job deploy akan gagal di langkah upload.

`SSH_HOST` dan `SSH_USER` opsional — kalau tidak diisi, workflow memakai
`155.94.164.159` dan `dwi`.

## Konfigurasi rahasia

Rahasia backend **tidak** ikut ter-upload (`.env` di-gitignore, dan `scp` hanya
mengirim berkas yang ada di repo). Berkasnya tinggal di server, di luar direktori
yang di-upload:

```
/home/dwi/warkil-kasir/shared/backend.env     # chmod 600, milik dwi
/home/dwi/warkil-kasir/backend/.env -> ../shared/backend.env   # symlink
```

`deploy.sh` membaca berkas itu (bisa diarahkan lewat `ENV_FILE`) dan berhenti
dengan pesan jelas kalau berkasnya hilang atau `DATABASE_URL` kosong. Isinya:
`NODE_ENV`, `HOST`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`,
`MIDTRANS_*`, `SEED_OWNER_USERNAME`, `SEED_OWNER_PASSWORD`.

Baca password pemilik dari server (tidak pernah masuk repo):

```bash
ssh dwi@155.94.164.159 'grep SEED_OWNER_PASSWORD /home/dwi/warkil-kasir/shared/backend.env'
```

## Database

PostgreSQL dipasang native lewat apt (paket `postgresql`), cluster `14 main`
mendengarkan di `127.0.0.1:5432` dan aktif saat boot. Peran `warkil` hanya
LOGIN + CREATEDB, database `warkil_kasir`. Server ini tidak punya Docker, dan
port database utama sengaja tidak dibuka ke publik.

Catatan versi: dev memakai PostgreSQL 16 (container compose) sedangkan server 14
— bawaan Ubuntu 22.04. Migrasi ditulis untuk fitur yang ada di keduanya.

Menyiapkan ulang dari nol (butuh sudo):

```bash
sudo apt-get install -y postgresql
sudo -u postgres psql -c "CREATE ROLE warkil LOGIN CREATEDB PASSWORD '<password>';"
sudo -u postgres createdb -O warkil warkil_kasir
```

Setelah itu tulis `shared/backend.env` (dengan `DATABASE_URL` di atas), buat
symlink `backend/.env`, lalu jalankan `deploy/deploy.sh`.

Deploy memakai `prisma migrate deploy` — bukan `migrate dev`, jadi tidak ada
prompt dan tidak ada migrasi yang dibuat di server.

## Data

`deploy.sh` menjalankan `npm run seed` (data dasar: pemilik, kategori, menu, kasir
demo, pengaturan) setiap kali deploy — semuanya upsert, jadi aman diulang. Kasir
demo punya PIN default `1234`; ganti sebelum dipakai sungguhan.

`demo` dan `reset` sama-sama memanggil `prisma/seed-demo.js`: `demo` mengosongkan
riwayat lalu membuat 120 hari data contoh (`npm run seed:demo`, yang menolak jalan
di `NODE_ENV=production` sehingga deploy memakai `NODE_ENV=development` untuk satu
perintah itu saja), `reset` hanya mengosongkan (`npm run seed:reset`). Keduanya
menyisakan menu, kasir, dan pengaturan.

## Deploy manual

```bash
bash /home/dwi/warkil-kasir/deploy/deploy.sh                     # production
MODE=demo  WIPE_CONFIRMED=wipe bash /home/dwi/warkil-kasir/deploy/deploy.sh
MODE=reset WIPE_CONFIRMED=wipe bash /home/dwi/warkil-kasir/deploy/deploy.sh
```

Script ini hanya membaca env, memasang dependency backend, menjalankan migrasi,
me-restart PM2, dan mengecek health; source-nya berasal dari upload Actions, jadi
tetap perlu push (atau upload manual) kalau ada perubahan kode. Mode `demo` dan
`reset` menolak jalan tanpa `WIPE_CONFIRMED=wipe`.

PM2 memakai `ecosystem.config.cjs` (`script: src/server.js`). Script deploy
melakukan `pm2 delete` + `pm2 start` dari berkas itu, bukan `startOrReload`:
`startOrReload` mempertahankan definisi lama saat path script berubah, dan itu
yang bikin server mock lama tetap jalan di production.

## Nginx

Konfigurasi tersimpan di `deploy/nginx/testwarkil.remcp.com`. Untuk menerapkan ulang:

```bash
sudo cp /home/dwi/warkil-kasir/deploy/nginx/testwarkil.remcp.com /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS belum diatur di origin; domain `remcp.com` berada di belakang Cloudflare,
jadi TLS di-terminate di edge selama record DNS-nya di-proxy (awan oranye).
Untuk Midtrans nanti (butuh HTTPS ke origin juga) baru perlu certbot.
