#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-13000}"
BACKEND_VENV_DIR="$BACKEND_DIR/.venv"
ENABLE_POLLING_RELOAD="${ENABLE_POLLING_RELOAD:-true}"

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "backend または frontend ディレクトリが見つかりません: $ROOT_DIR"
  exit 1
fi

ensure_backend_deps() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 が見つかりません"
    exit 1
  fi

  if [[ ! -d "$BACKEND_VENV_DIR" ]]; then
    echo "バックエンド仮想環境を作成中..."
    python3 -m venv "$BACKEND_VENV_DIR"
  fi

  if ! "$BACKEND_VENV_DIR/bin/python" -c "import fastapi, sqlalchemy, jinja2, markdown" >/dev/null 2>&1; then
    echo "バックエンド依存をインストール中..."
    (
      cd "$BACKEND_DIR"
      "$BACKEND_VENV_DIR/bin/pip" install -r requirements.txt
    )
  fi
}

ensure_frontend_deps() {
  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    echo "フロントエンド依存をインストール中..."
    (
      cd "$FRONTEND_DIR"
      npm install
    )
  fi
}

cleanup() {
  echo ""
  echo "停止中..."
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  wait || true
  echo "停止完了"
}

trap cleanup INT TERM EXIT

ensure_backend_deps
ensure_frontend_deps

echo "バックエンド起動: http://localhost:${BACKEND_PORT}"
(
  cd "$BACKEND_DIR"
  if [[ "$ENABLE_POLLING_RELOAD" == "true" ]]; then
    WATCHFILES_FORCE_POLLING=true \
      "$BACKEND_VENV_DIR/bin/uvicorn" main:app --reload --reload-dir "$BACKEND_DIR" --port "${BACKEND_PORT}"
  else
    "$BACKEND_VENV_DIR/bin/uvicorn" main:app --reload --reload-dir "$BACKEND_DIR" --port "${BACKEND_PORT}"
  fi
) &
BACKEND_PID=$!

echo "フロントエンド起動: http://localhost:${FRONTEND_PORT}"
(
  cd "$FRONTEND_DIR"
  if [[ "$ENABLE_POLLING_RELOAD" == "true" ]]; then
    WATCHPACK_POLLING=true \
    CHOKIDAR_USEPOLLING=1 \
    npm run dev -- -p "${FRONTEND_PORT}"
  else
    npm run dev -- -p "${FRONTEND_PORT}"
  fi
) &
FRONTEND_PID=$!

echo "両方起動中。Ctrl+C で両方停止。"
echo "ホットリロード: ENABLE_POLLING_RELOAD=${ENABLE_POLLING_RELOAD}"
wait
