# ChainGPT upstream spike (v0)

**Date:** 2026-09-01  
**Status:** Documented from official API docs + parser fixtures; **live validation pending** `CHAINGPT_API_KEY` in `.env.local`.

---

## Endpoint

```http
POST https://api.chaingpt.org/chat/stream
Authorization: Bearer <CHAINGPT_API_KEY>
Content-Type: application/json

{
  "model": "general_assistant",
  "question": "...",
  "chatHistory": "off"
}
```

Source: [ChainGPT Web3 LLM API reference](https://docs.chaingpt.org/dev-docs-b2b-saas-api-and-sdk/web3-ai-chatbot-and-llm-api-and-sdk/api-reference)

---

## Auth

| Header | Value | Notes |
|--------|-------|-------|
| `Authorization` | `Bearer <API_KEY>` | **Required** (official docs) |
| `Content-Type` | `application/json` | Required |

We do **not** send duplicate `api-key` header in v0.2+.

---

## Buffered success response (documented)

```json
{
  "status": true,
  "message": "Chat response generated successfully.",
  "data": {
    "bot": "<assistant text>"
  }
}
```

Parser: `src/chaingpt/parse-response.ts` → `data.bot`

Fixture: `tests/fixtures/chaingpt/buffered-success.json`

---

## Error response

```json
{
  "status": false,
  "message": "Invalid API key"
}
```

Mapped to `ChainGptApiError` → proxy returns OpenAI-shaped `502` / `429` as appropriate.

---

## Streaming upstream

ChainGPT may also return a **readable text stream** (raw chunks) when using `responseType: stream` in their SDK examples.  
**v0 proxy strategy:** buffer full upstream body, then re-emit OpenAI SSE chunks to the client. Sufficient for Exposure enrichment + first Strix tests.

---

## Compatibility matrix (v0)

| Feature | ChainGPT native | Proxy v0 |
|---------|-----------------|----------|
| Chat `messages` → `question` | N/A | ✅ |
| Non-stream OpenAI JSON | N/A | ✅ |
| OpenAI SSE to client | N/A | ✅ (re-chunked) |
| `tools` / `tool_choice` | ❓ unconfirmed | ❌ HTTP 501 |
| Multi-turn agent (Strix) | ❓ needs tool calling | ⏳ phase 2 |
| `chatHistory=on` | ✅ | ✅ via env |

---

## Live validation commands

```bash
# 1. Direct upstream
curl -sS -X POST "https://api.chaingpt.org/chat/stream" \
  -H "Authorization: Bearer $CHAINGPT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"general_assistant","question":"ping","chatHistory":"off"}' | jq .

# 2. Via proxy
npm run dev
bash examples/live-canary.sh
```

After grant credits land, paste a redacted sample response into this doc.
