#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$ROOT_DIR/.env.dev" ]; then
  set -a
  source "$ROOT_DIR/.env.dev"
  set +a
fi

echo "=========================================================="
echo " Starting HeyGoodly Next.js 16 Frontend Locally..."
echo " Node:    $(node -v)"
echo " API URL: ${NEXT_PUBLIC_API_URL:-http://127.0.0.1:8081}"
echo " Portal:  http://localhost:${FRONTEND_PORT:-3001}"
echo " Admin:   http://localhost:${FRONTEND_PORT:-3001}/admin/dashboard"
echo "=========================================================="

cd "$ROOT_DIR/frontend"
exec npm run dev -- -p "${FRONTEND_PORT:-3001}"
