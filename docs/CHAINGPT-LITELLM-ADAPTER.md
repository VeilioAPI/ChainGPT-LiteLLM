# ChainGPT ↔ LiteLLM Adapter

**Status:** v0 scaffold published — https://github.com/VeilioAPI/ChainGPT-LiteLLM  
**Scope:** Open-source OpenAI/LiteLLM bridge for ChainGPT’s Web3 LLM.  
**Reference customer:** Veilio Exposure : first production integration, not the only market.  
**Audience:** ChainGPT partnership, builders, grant reviewers  
**Last updated:** 2026-08-28

---

## 0. About Veilio Exposure

**Veilio Exposure** is a public acquisition product: a free, one-minute **OSINT exposure report**. It aggregates passive open-source intelligence (subdomains, public leaks / breach corpora, DNS and email hygiene, API surface clues) into a plain-language view for founders and CTOs, with no account required.

The paid upsell is **Deep scan**: ownership verification, then an active Strix-powered assessment of a single HTTPS target, delivered as a structured findings report.

Exposure’s funnel is awareness first (**OSINT detection**), then conversion to active testing and Veilio’s broader data-protection offering. This adapter proposal exists so Deep (and related report AI) can run on **ChainGPT credits** through the standard LiteLLM / OpenAI protocol.

---



## 1. Objectives



### 1.1 Primary

Build an **OpenAI-compatible bridge** between [ChainGPT’s Web3 LLM API](https://docs.chaingpt.org/dev-docs-b2b-saas-api-and-sdk/web3-ai-chatbot-and-llm-api-and-sdk) and the **LiteLLM / OpenAI Chat Completions** ecosystem, so any agent or SaaS that already speaks that protocol can consume ChainGPT credits without a custom SDK rewrite.

### 1.2 Success criteria


| Criterion                           | Concrete target                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Drop-in for LiteLLM / Strix         | `STRIX_LLM=openai/general_assistant` + `LLM_API_BASE=<adapter>/v1` works           |
| Chat path                           | Non-stream + stream `/v1/chat/completions` → valid OpenAI-shaped JSON/SSE          |
| Tool path (if upstream supports it) | Agentic scan (e.g. Strix quick on a lab app) completes with findings or clean exit |
| Cost control                        | Per-job credit estimate + configurable hard cap                                    |
| OSS                                 | Public MIT/Apache-2.0 repo ChainGPT can cite for grant / co-marketing              |
| Secrets                             | `CHAINGPT_API_KEY` server-side only                                                |




### 1.3 Non-goals

- Replacing ChainGPT’s NFT / news / auditor SDKs wholesale
- Claiming full agent parity before **tool calling** is proven upstream
- Building a multi-provider gateway beyond ChainGPT

---



## 2. Problem

ChainGPT today:

```http
POST https://api.chaingpt.org/chat/stream
{ "model": "general_assistant", "question": "...", "chatHistory": "off" }
```

Most agent frameworks and SaaS backends expect:

```http
POST /v1/chat/completions
{ "model": "...", "messages": [...], "tools": [...], "stream": true }
```

There is no first-class public LiteLLM provider for ChainGPT. Builders either adopt `@chaingpt/generalchat` only, or skip ChainGPT for agent workloads and burn OpenAI/Anthropic/Gemini instead.

**Reference pain (Exposure Deep):** a single Strix quick scan can exhaust Gemini free-tier quotas mid-run (`429`), so credit-based ChainGPT + an adapter is strategically attractive, if the protocol gap is closed.

---



## 3. Use cases (market & adoption)

Generic segments. Any vendor can adopt the adapter; Exposure is the reference implementation.

### 3.1 Agentic security scanners

**Need:** Pentest / AppSec agents (Strix and peers) already route LLMs through LiteLLM. They want a **credit-priced, Web3-aware** model without rewriting the agent.


| Buyer                   | Example                                         |
| ----------------------- | ----------------------------------------------- |
| Security SaaS           | Continuous quick scans of customer staging URLs |
| MSSP / boutique pentest | Overnight batch jobs on authorized scopes       |
| In-house AppSec         | Release gate: scan preview env before prod      |


**Example**

```bash
export STRIX_LLM=openai/general_assistant
export LLM_API_BASE=http://adapter:8787/v1
strix -n -t https://staging.acme.io --scan-mode quick \
  --instruction "Non-destructive. Prefer authz gaps and misconfig."
```

**Lab proof (vendor-agnostic):** OWASP Juice Shop / DVWA → findings or a **completed** run (not provider 429 mid-loop).

**Adoption:** one env change swaps frontier LLM → ChainGPT credits.  
**Dependency:** native `tools` / `tool_calls` for a real agent loop.

---



### 3.2 Security & risk report generation (chat-only)

**Need:** Turn scanner JSON into executive language without a second LLM vendor.


| Buyer                         | Example                                                 |
| ----------------------------- | ------------------------------------------------------- |
| ASM / exposure platforms      | Explain DNS / breach signals to a non-technical founder |
| GRC / audit firms             | Management summary from severity-tagged findings        |
| SOC / vulnerability platforms | Nightly top-10 digest → Slack or email copy             |


**Example**

- Input: `{ "findings": [{"title":"Missing SPF","sev":"medium"}, ...] }` (no raw PII)
- Prompt: “5 bullets for a CTO, severity order, one recommended next step”
- Cost shape: ~0.5–1 credit per summary; cache by scan hash

Works **without** tool calling → fastest path to credit consumption and demos.

---



### 3.3 Web3 / DeFi application security products

**Need:** One deliverable covering **HTTP dApp surface** and **Solidity**.


| Buyer                      | Example                                              |
| -------------------------- | ---------------------------------------------------- |
| Protocol security startups | Scan `app.protocol.xyz` + audit `Vault.sol`          |
| Launchpads / incubators    | Pre-TGE checklist: web misconfig + contract findings |
| Wallet / bridge vendors    | Staging URL + verifier-linked contract               |


**Example**

1. Agentic web scan via adapter (Strix or similar) on the dApp URL
2. Parallel ChainGPT **Smart Contract Auditor** API on `0x…` / source
3. Single PDF: “Web” + “On-chain”

**Adoption:** ChainGPT as both **LLM brain** (via adapter) and **auditor API** in one credit economy.

---



### 3.4 CI/CD and platform engineering

**Need:** Same OpenAI-shaped health checks in GitHub Actions / GitLab CI.


| Buyer                   | Example                                            |
| ----------------------- | -------------------------------------------------- |
| Product engineering     | Canary `POST /v1/chat/completions` on every deploy |
| Security platform teams | Nightly Juice Shop agent job with credit budget    |
| OSS maintainers         | Public CI using grant credits (org secret)         |


**Example**

```yaml
- run: |
    curl -sf "$LLM_API_BASE/chat/completions" \
      -H "Content-Type: application/json" \
      -d '{"model":"general_assistant","messages":[{"role":"user","content":"ping"}],"stream":false}'
```

**Adoption:** SRE-friendly canaries keep ChainGPT keys in production configs.

---



### 3.5 ISVs already on OpenAI / LiteLLM SDKs

**Need:** Domain-specialized Web3 answers without migrating off `openai.ChatCompletions`.


| Buyer                          | Example                                            |
| ------------------------------ | -------------------------------------------------- |
| Portfolio / analytics products | “Explain this token’s 24h move” in an existing bot |
| Developer tools / IDEs         | Explain-this-Solidity via `base_url=<adapter>`     |
| Education platforms            | Student bots on capped ChainGPT credits            |


**Example**

```python
from openai import OpenAI
client = OpenAI(base_url="http://adapter:8787/v1", api_key="local")
client.chat.completions.create(
    model="general_assistant",
    messages=[{"role": "user", "content": "What is a reentrancy guard?"}],
)
```

**Adoption:** lowest friction into the existing OpenAI-compatible market.

---



### 3.6 Ecosystem distribution 

**Need:** Reusable artifact so `general_assistant` appears wherever LiteLLM already is.


| Artifact                             | Adoption effect                            |
| ------------------------------------ | ------------------------------------------ |
| [ChainGPT-LiteLLM](https://github.com/VeilioAPI/ChainGPT-LiteLLM) (Apache-2.0) | Copy-paste for any stack                   |
| LiteLLM provider / plugin            | Listed in LiteLLM docs and configs         |
| Reference demos                      | Juice Shop agent + report-summary curl     |
| Grant / co-marketing                 | Builder track: credits → real integrations |


**Adoption:** every LiteLLM user becomes a potential ChainGPT credit consumer, not only native Web3 apps.

---



## 4. Proposed technical solution



### 4.1 Architecture (reference: Exposure Deep)

```
┌────────────────────┐
│ Product Deep UI    │  (e.g. Exposure)
└─────────┬──────────┘
          │ job paid
          ▼
┌────────────────────┐     OpenAI /v1/chat/completions
│ Worker + Strix CLI │ ──────────────────────────────────┐
└────────────────────┘                                   ▼
                                              ┌─────────────────────┐
                                              │ ChainGPT-LiteLLM    │
                                              │ (sidecar)           │
                                              └──────────┬──────────┘
                                                         │ messages → question
                                                         ▼
                                              ┌─────────────────────┐
                                              │ api.chaingpt.org    │
                                              │ POST /chat/stream   │
                                              └─────────────────────┘
```

Same adapter serves §3.2–3.5 chat clients without Strix.

### 4.2 v0 component

**OpenAI-compatible HTTP proxy** (sidecar next to the agent worker).

Why: Strix and most agents already support `LLM_API_BASE` + `openai/...` via LiteLLM.

v1 optional: native LiteLLM provider `chaingpt/general_assistant` + upstream PR.

### 4.3 Field mapping

**Phase 1 : chat** (covers §3.2, §3.4 canaries, §3.5)


| OpenAI                     | ChainGPT                                          |
| -------------------------- | ------------------------------------------------- |
| `messages[]` → single text | `question`                                        |
| `model`                    | `general_assistant`                               |
| `stream`                   | `/chat/stream` stream vs buffered                 |
| —                          | `chatHistory: "off"` default for agents (cheaper) |


**Phase 2 : tools** (required for §3.1)  
Only if ChainGPT confirms support. Otherwise agents stay on another LLM; ChainGPT still wins on chat / auditor / OSS paths.

### 4.4 Example env (agent worker)

```bash
CHAINGPT_API_KEY=cgpt_...
ADAPTER_PORT=8787
MAX_CREDITS_PER_JOB=200

STRIX_LLM=openai/general_assistant
LLM_API_BASE=http://127.0.0.1:8787/v1
LLM_API_KEY=not-required
```

**Canary**

```bash
curl http://127.0.0.1:8787/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "general_assistant",
    "messages": [
      {"role": "user", "content": "Missing SPF and 2 breach hits for example.com. 3 CTO bullets."}
    ],
    "stream": false
  }'
```



### 4.5 Package layout

```
ChainGPT-LiteLLM/   →  https://github.com/VeilioAPI/ChainGPT-LiteLLM
  README.md
  SPECS.md
  LICENSE
  src/
    chaingpt/
    mapping/
    openai/
  tests/
  examples/
    litellm_config.yaml
    juice-shop-strix.sh
    report-summary.curl.sh
    openai_client.py
```



### 4.6 Security

- Adapter private to the worker network
- No raw PII in enrichment prompts
- Credit/latency logs keyed by job id
- Rate limits and credit caps per job

---



## 5. Delivery plan


| Phase                 | Output                                     |
| --------------------- | ------------------------------------------ |
| Scaffold (done)       | Public repo + proxy routes + tests + Docker |
| Spike                 | Chat canary + credit burn log              |
| Partner gate          | Written yes/no on `tool_calls`             |
| Reference integration | Exposure Deep staging when tools OK        |
| Lab demo              | Juice Shop script in `examples/`           |
| OSS + grant           | Hardened v0 + short demo (agent + summary) |


---



## 6. Risks


| Risk                       | Impact       | Mitigation                                   |
| -------------------------- | ------------ | -------------------------------------------- |
| No tool calling            | §3.1 blocked | Ship §3.2–3.6; keep alternate LLM for agents |
| Credit burn in agent loops | Cost spikes  | Caps, `chatHistory=off`, scan `--max-budget` |
| Overclaim “Strix-ready”    | Trust        | Market as OpenAI bridge until tools proven   |


---



## 7. Open questions for ChainGPT

1. OpenAI-compatible `/v1/chat/completions` planned, or OK if we publish the proxy?
2. Native `tools` / `tool_calls` on `general_assistant`?
3. Best practice for multi-turn agent calls with `chatHistory=off`?
4. Credit pool for public CI demos of the OSS adapter?
5. Co-marketing and grant if we open-source the proxy with a security-agent case study?

---



## 9. References

- **OSS repo:** https://github.com/VeilioAPI/ChainGPT-LiteLLM
- [ChainGPT Developer Tools](https://docs.chaingpt.org/dev-docs-b2b-saas-api-and-sdk/introduction-to-chaingpts-developer-tools)
- [Web3 LLM API](https://docs.chaingpt.org/dev-docs-b2b-saas-api-and-sdk/web3-ai-chatbot-and-llm-api-and-sdk)
- [API Reference](https://docs.chaingpt.org/dev-docs-b2b-saas-api-and-sdk/web3-ai-chatbot-and-llm-api-and-sdk/javascript/api-reference)
- [LiteLLM OpenAI-compatible](https://docs.litellm.ai/docs/providers/openai_compatible)
- [Web3 AI Grant](https://www.chaingpt.org/web3-ai-grant)
