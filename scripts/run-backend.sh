#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$ROOT_DIR/.env.dev" ]; then
  set -a
  source "$ROOT_DIR/.env.dev"
  set +a
fi

if [ -z "${JAVA_HOME:-}" ]; then
  if [ -d "/Users/khoinguyen/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home" ]; then
    export JAVA_HOME="/Users/khoinguyen/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home"
  elif /usr/libexec/java_home -v 21 >/dev/null 2>&1; then
    export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
  fi
fi

MVN_BIN="mvn"
if command -v /opt/homebrew/bin/mvn >/dev/null 2>&1; then
  MVN_BIN="/opt/homebrew/bin/mvn"
fi

echo "=========================================================="
echo " Starting HeyGoodly Spring Boot 3 Backend Locally..."
echo " Database: PostgreSQL on localhost:${DB_PORT:-5432} (${DB_NAME:-heygoodly_db})"
echo " Cache:    Redis on localhost:${REDIS_PORT:-6379}"
echo " Storage:  Shared MinIO on ${MINIO_ENDPOINT:-http://localhost:9000} (bucket: ${MINIO_BUCKET_NAME:-heygoodly-media})"
echo " URL:      http://127.0.0.1:${SERVER_PORT:-8081}"
echo "=========================================================="

cd "$ROOT_DIR/backend"
exec "$MVN_BIN" spring-boot:run
