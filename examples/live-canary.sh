#!/usr/bin/env bash
# Live canary against ChainGPT via the local proxy (requires real CHAINGPT_API_KEY).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi
if [ -f .env ]; then set -a; . ./.env; set +a; fi

if [ -z "${CHAINGPT_API_KEY:-}" ] || echo "$CHAINGPT_API_KEY" | grep -qE 'your_key|placeholder|change'; then
  echo "ERROR: set CHAINGPT_API_KEY in .env.local" >&2
  exit 1
fi

PORT="${ADAPTER_PORT:-8787}"
BASE="http://${ADAPTER_HOST:-127.0.0.1}:${PORT}"

cleanup() { [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

npm run build >/dev/null
node --env-file=.env.local --env-file=.env dist/index.js &
SERVER_PID=$!
sleep 1

echo "== health =="
curl -sf "${BASE}/health" | jq .

echo "== models =="
curl -sf "${BASE}/v1/models" | jq '.data[].id'

echo "== chat non-stream =="
RESP=$(curl -sf "${BASE}/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "general_assistant",
    "messages": [{"role": "user", "content": "Reply with exactly: pong"}],
    "stream": false
  }')
echo "$RESP" | jq .
CONTENT=$(echo "$RESP" | jq -r '.choices[0].message.content // empty')
if [ -z "$CONTENT" ]; then
  echo "ERROR: empty assistant content" >&2
  exit 1
fi
echo "OK: got assistant content (${#CONTENT} chars)"
