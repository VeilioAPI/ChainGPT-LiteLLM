#!/usr/bin/env bash
# Report-summary canary (chat-only, no tool calling).
set -euo pipefail
BASE="${LLM_API_BASE:-http://127.0.0.1:8787/v1}"

curl -sS "${BASE}/chat/completions" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "general_assistant",
    "stream": false,
    "messages": [
      {
        "role": "user",
        "content": "Findings JSON (no PII): {\"items\":[{\"title\":\"Missing SPF\",\"sev\":\"medium\"},{\"title\":\"2 breach corpus hits\",\"sev\":\"high\"}]}. Write 3 CTO bullets, severity order, one next step."
      }
    ]
  }' | jq .
