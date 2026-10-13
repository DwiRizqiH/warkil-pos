#!/usr/bin/env bash
# Runs on the VPS, called by GitHub Actions after the source upload.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/dwi/warkil-kasir}"
ENV_FILE="${ENV_FILE:-$APP_DIR/shared/backend.env}"

# The upload owns $APP_DIR/backend, so the secrets live beside it; backend/.env symlinks here
# and the app and Prisma CLI load it themselves, so this script checks it without sourcing it.
if [ ! -f "$ENV_FILE" ]; then
  echo "env file tidak ada: $ENV_FILE — lihat deploy/README.md" >&2
  exit 1
fi
if ! grep -qE '^DATABASE_URL=[^[:space:]]' "$ENV_FILE"; then
  echo "DATABASE_URL kosong di $ENV_FILE" >&2
  exit 1
fi

cd "$APP_DIR/backend"
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run seed

# startOrReload keeps the old definition when the script path changed, which is how the mock
# server kept running in production; starting from the config always applies it.
pm2 delete warkil-kasir >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs
pm2 save

healthy=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS --max-time 5 http://127.0.0.1:3100/api/health >/dev/null; then
    healthy=true
    break
  fi
  sleep 1
done
if [ "$healthy" != true ]; then
  echo "API tidak sehat setelah restart — cek: pm2 logs warkil-kasir" >&2
  exit 1
fi

echo "deploy selesai: $(date -Is)"
pm2 describe warkil-kasir | grep -E 'script path|status|uptime|restarts' || true
