#!/usr/bin/env bash
# Runs on the VPS, called by GitHub Actions after the source upload.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/dwi/warkil-kasir}"

cd "$APP_DIR/backend"
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "deploy selesai: $(date -Is)"
pm2 describe warkil-kasir | grep -E 'status|uptime|restarts' || true
