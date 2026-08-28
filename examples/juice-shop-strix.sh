#!/usr/bin/env bash
# Lab: Strix quick scan via this proxy (needs Strix + tool calling support upstream).
# Start the proxy first: npm run dev
set -euo pipefail

export STRIX_LLM="${STRIX_LLM:-openai/general_assistant}"
export LLM_API_BASE="${LLM_API_BASE:-http://127.0.0.1:8787/v1}"
TARGET="${1:-http://127.0.0.1:3000}"

echo "STRIX_LLM=$STRIX_LLM"
echo "LLM_API_BASE=$LLM_API_BASE"
echo "TARGET=$TARGET"

strix -n -t "$TARGET" --scan-mode quick \
  --instruction "Non-destructive. Prefer authz gaps and misconfig. Lab only (e.g. OWASP Juice Shop)."
