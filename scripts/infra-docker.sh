#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-up}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

case "$ACTION" in
  up)
    echo "==> Starting HeyGoodly Dev Infra (PostgreSQL :5432, Redis :6379)..."
    docker compose --env-file .env.dev -f docker-compose.dev.yml up -d
    if ! docker ps --format '{{.Names}}' | grep -Eq '^(shared-minio|heygoodly-minio)$'; then
      echo "WARNING: Shared MinIO is not running on port 9000 yet!"
      echo "Start it from: cd ../shared-infra && ./scripts/up-shared.sh"
    else
      echo "Shared MinIO detected on localhost:9000!"
    fi
    ;;
  down)
    docker compose --env-file .env.dev -f docker-compose.dev.yml stop
    ;;
  status)
    docker compose --env-file .env.dev -f docker-compose.dev.yml ps
    ;;
  *)
    echo "Usage: $0 [up|down|status]"
    exit 1
    ;;
esac
