# ChainGPT-LiteLLM

Open-source **OpenAI / LiteLLM-compatible proxy** for [ChainGPT](https://www.chaingpt.org/) Web3 LLM (`general_assistant`).

Point any OpenAI SDK, LiteLLM, or Strix-style agent at this sidecar and burn **ChainGPT API credits** without rewriting your stack.

```
Your app  →  POST /v1/chat/completions  →  ChainGPT-LiteLLM  →  api.chaingpt.org/chat/stream
```

**Status:** v0.2 — chat bridge (validated with mocked upstream; live canary with grant credits)  
**License:** Apache-2.0  
**Specs:** [SPECS.md](./SPECS.md) · [Découpage v0](./docs/SPEC-TECH-DECOUPAGE-V0.md) · [Upstream spike](./docs/upstream-spike.md)

## Why

ChainGPT’s public chat API uses `question` + `/chat/stream`. Most agents expect OpenAI Chat Completions. This repo is that bridge, built for ecosystem reuse (not a closed Veilio-only shim).

**Reference customer:** [Veilio Exposure](https://veilio.xyz) Deep scan and report enrichment.

## Quick start

```bash
cp .env.example .env.local   # set CHAINGPT_API_KEY (grant credits)
npm install
npm run dev                  # http://127.0.0.1:8787
npm run test:live            # E2E with real key (starts proxy + curl)
```

```bash
curl -s http://127.0.0.1:8787/health
curl -s http://127.0.0.1:8787/v1/models
curl -s http://127.0.0.1:8787/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "general_assistant",
    "messages": [{"role": "user", "content": "What is a reentrancy guard?"}],
    "stream": false
  }'
```

### OpenAI Python

```python
from openai import OpenAI
client = OpenAI(base_url="http://127.0.0.1:8787/v1", api_key="local")
print(client.chat.completions.create(
    model="general_assistant",
    messages=[{"role": "user", "content": "ping"}],
).choices[0].message.content)
```

### Strix / LiteLLM agents

```bash
export STRIX_LLM=openai/general_assistant
export LLM_API_BASE=http://127.0.0.1:8787/v1
```

> Full agent loops need upstream `tools` / `tool_calls`. Until confirmed, use this proxy for chat completions and report enrichment; see SPECS.md §2.2.

## Endpoints

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Liveness (`?probe=1` pings upstream) |
| GET | `/v1/models` | Lists `general_assistant` |
| POST | `/v1/chat/completions` | OpenAI-shaped bridge |

## Docker

```bash
docker build -t chaingpt-litellm .
docker run --rm -p 8787:8787 --env-file .env chaingpt-litellm
```

## Examples

See [`examples/`](./examples/).

## Roadmap

1. Chat non-stream + stream (v0)
2. Agent / tool-calling proof or clear compatibility matrix
3. LiteLLM provider plugin (optional)
4. Exposure Deep reference wiring + co-marketing case study

## Related

- [Grant application (Veilio, Aug 2026)](./docs/grant-application-veilio-2026-08-28.md)
- [Technical proposal / adapter doc](./docs/CHAINGPT-LITELLM-ADAPTER.md)
- [Functional & technical specs](./SPECS.md)
- [ChainGPT Web3 LLM docs](https://docs.chaingpt.org/dev-docs-b2b-saas-api-and-sdk/web3-ai-chatbot-and-llm-api-and-sdk)
- [ChainGPT Web3 AI Grant](https://www.chaingpt.org/web3-ai-grant)

## License

Apache-2.0 © Veilio
