#!/usr/bin/env bash
# Dipanggil di server oleh GitHub Actions (.github/workflows/deploy.yml).
# Asumsi: source sudah ada di /home/dwi/warkil-kasir (hasil upload Actions).
set -euo pipefail

APP_DIR="${APP_DIR:-/home/dwi/warkil-kasir}"

cd "$APP_DIR/backend"
npm ci --omit=dev

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "deploy selesai: $(date -Is)"
pm2 describe warkil-kasir | grep -E 'status|uptime|restarts' || true
