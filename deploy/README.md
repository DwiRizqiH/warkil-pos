# Deploy

Server: `155.94.164.159` (user `dwi`). Aplikasi jalan di `/home/dwi/warkil-kasir`,
dikelola PM2 dengan nama proses `warkil-kasir` pada port `3100`.
Nginx `testwarkil.remcp.com` (port 80) mem-proxy ke port tersebut.

## Auto deploy

`.github/workflows/deploy.yml` jalan tiap push ke `main`:

1. runner checkout repo, `npm ci` + `npm run build` di `frontend/`
2. `frontend/dist`, `backend/`, dan `deploy/` di-upload ke server
3. `deploy/deploy.sh` dijalankan di server: `npm ci --omit=dev` + `pm2 startOrReload`

**Satu langkah manual yang belum bisa diotomatiskan:** tambahkan repository secret
`SSH_PASSWORD` di Settings → Secrets and variables → Actions. Nilainya password SSH
user `dwi`. Tanpa secret ini job deploy akan gagal di langkah upload.

`SSH_HOST` dan `SSH_USER` opsional — kalau tidak diisi, workflow memakai
`155.94.164.159` dan `dwi`.

## Deploy manual

```bash
bash /home/dwi/warkil-kasir/deploy/deploy.sh
```

Script ini hanya memasang dependency backend dan me-reload PM2; source-nya berasal
dari upload Actions, jadi tetap perlu push (atau upload manual) kalau ada perubahan kode.

## Nginx

Konfigurasi tersimpan di `deploy/nginx/testwarkil.remcp.com`. Untuk menerapkan ulang:

```bash
sudo cp /home/dwi/warkil-kasir/deploy/nginx/testwarkil.remcp.com /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS belum diatur di origin; domain `remcp.com` berada di belakang Cloudflare,
jadi TLS di-terminate di edge selama record DNS-nya di-proxy (awan oranye).
Untuk Midtrans nanti (butuh HTTPS ke origin juga) baru perlu certbot.
