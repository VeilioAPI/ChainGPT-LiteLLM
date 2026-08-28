# **ChainGPT AI Grant Application**

```
Note: Please create your own copy of this Google Doc by selecting File → “Make a copy”. Once completed, ensure your new document’s sharing settings allow "Anyone with the link" to have viewing access, then share the link with us.
```

---

## **Applicant Information**

* Project Name: **Veilio Exposure** (+ open-source **[ChainGPT-LiteLLM](https://github.com/VeilioAPI/ChainGPT-LiteLLM)** bridge)  
* Project Website: https://veilio.xyz · Deep / Exposure staging: https://staging.exposure.veilio.xyz  
* Project Docs:  
  - Grant application (this doc): https://github.com/VeilioAPI/ChainGPT-LiteLLM/blob/develop/docs/grant-application-veilio-2026-08-28.md  
  - Technical proposal: https://github.com/VeilioAPI/ChainGPT-LiteLLM/blob/develop/docs/CHAINGPT-LITELLM-ADAPTER.md  
  - OSS specs: https://github.com/VeilioAPI/ChainGPT-LiteLLM/blob/develop/SPECS.md  
  - Product Deep/Strix: https://github.com/VeilioAPI/Exposure/blob/develop/docs/EXP-DEEP-SCAN-STRIX.md  
* Github / HuggingFace: https://github.com/VeilioAPI/Exposure (public product) · https://github.com/VeilioAPI/ChainGPT-LiteLLM (OSS adapter, Apache-2.0, default branch `develop`)  
* Primary Contact (Name, Email): **[Quentin — fill email]**  
* Application Date: **August 28, 2026**

---

## **Project Overview**

* Briefly describe your project. *(Max 200 words)*  

  Answer:  

  **Veilio Exposure** is a public cybersecurity acquisition product. In under a minute, any founder or CTO can run a free **OSINT exposure report**: passive open-source intelligence on their domain (subdomains, public leak/breach corpora, DNS and email hygiene, API surface clues), with no account required. The paid upsell is **Deep scan**: after ownership proof, we run an **active, non-destructive assessment** (Strix agent) against one HTTPS URL the customer owns, and deliver a structured findings report (~€99 one-shot).

  Deep agents today speak **LiteLLM / OpenAI Chat Completions**. ChainGPT’s Web3 LLM is exposed as `POST /chat/stream` with a `question` payload. That protocol gap blocks credit burn on agent stacks.

  Under this grant, **Veilio builds and open-sources** an **OpenAI-compatible proxy** ([ChainGPT-LiteLLM](https://github.com/VeilioAPI/ChainGPT-LiteLLM)) so any LiteLLM/Strix/OpenAI-SDK app can call `general_assistant` via `/v1/chat/completions`. Exposure Deep is the **reference customer**; the OSS bridge is reusable across ChainGPT’s builder ecosystem (security SaaS, DeFi AppSec, CI, ISVs). We also plan optional **Smart Contract Auditor** API usage for Web3 Deep sections. We are **not** asking ChainGPT to develop the adapter: we ship it, document it, and co-market it.

* What stage is your project currently in? (Idea, Prototype, MVP, Production)  

  Answer: **MVP / early production.** Free OSINT Exposure is live on staging/production paths; Deep funnel (verify → pay/mock → report) is implemented; Strix is installed and smoke-tested. The ChainGPT adapter is **public on GitHub** ([ChainGPT-LiteLLM](https://github.com/VeilioAPI/ChainGPT-LiteLLM), v0 scaffold: proxy routes, mapping tests, Docker, examples). This grant funds live upstream validation, agent/Strix proof, Exposure Deep wiring, and co-marketing.

* Please provide the current Daily Active Users (DAUs) and Monthly Active Users (MAUs) for your entire product or ecosystem.  

  Answer: **Early-stage.** Veilio is a young B2B security / data-protection company. Exposure is in **staging + limited public rollout**; we do not yet have stable DAU/MAU at consumer-social scale. Traction today is founder-led demos, security/Web3 partnerships (incl. Canton ecosystem work), and conversion-oriented OSINT → Deep funnel testing. We prefer honesty over inflated vanity metrics.

* Additionally, specify the Daily Active Users (DAUs), Monthly Active Users (MAUs), and average monthly web visits specifically for the product or page where ChainGPT integration is planned.

  Answer:  

  **Integration surface:** Exposure Deep worker + report enrichment + OSS adapter consumers.  
  **Current Exposure staging:** low hundreds of experimental scans/month during build-out (OSINT free path + Deep mock). Post-grant target (6 months): thousands of free OSINT reports/month and a growing share of Deep jobs on ChainGPT credits. Exact public analytics can be shared under NDA if useful for co-marketing KPIs.

---

## **ChainGPT Integration**

Which ChainGPT products do you plan to integrate?

- [x] **Web3 AI Chatbot & LLM**  
- [ ] Smart Contract Generator  
- [x] **Smart Contract Auditor**  
- [ ] AI NFT Generator  
- [ ] AI Crypto News Feed  
- [ ] AgenticOS for X/Twitter  
- [x] **Other (please specify):** Open-source **OpenAI/LiteLLM-compatible proxy** for `general_assistant` — https://github.com/VeilioAPI/ChainGPT-LiteLLM (built by Veilio, reusable by the whole ecosystem)

Briefly explain how you plan to use each selected product.  

Answer:  

### 1) Web3 AI Chatbot & LLM (`general_assistant`) — primary

**A. Veilio Exposure Deep (reference integration)**  
- Strix (or equivalent agent) configured with:  
  `STRIX_LLM=openai/general_assistant`  
  `LLM_API_BASE=https://<adapter>/v1`  
- Flow: ownership verified → payment → agent quick scan on customer HTTPS URL → SARIF/findings → Deep report UI/PDF.  
- Example lab: OWASP Juice Shop `http://127.0.0.1:3000` with capped credits to prove the loop before production targets.  
- Example production: authorized customer staging `https://staging.customer.io` (non-destructive instructions only).

**B. Report enrichment (chat-only, ships even before tool-calling is proven)**  
- Free OSINT JSON (counts, categories, no raw PII emails) → one ChainGPT call → 5 CTO bullets + Deep CTA copy.  
- Deep findings titles/severities → executive one-pager for PDF.  
- Cost shape: ~0.5–1 credit per summary; cache by scan id.

**C. Ecosystem via OSS proxy (market adoption)**  
Any stack that already does OpenAI Chat Completions can point `base_url` at the proxy:

```python
from openai import OpenAI
client = OpenAI(base_url="http://adapter:8787/v1", api_key="local")
client.chat.completions.create(
    model="general_assistant",
    messages=[{"role": "user", "content": "What is a reentrancy guard?"}],
)
```

```bash
# Strix / LiteLLM-style agents
export STRIX_LLM=openai/general_assistant
export LLM_API_BASE=http://adapter:8787/v1
strix -n -t https://staging.acme.io --scan-mode quick
```

```yaml
# CI canary
- run: |
    curl -sf "$LLM_API_BASE/chat/completions" -H "Content-Type: application/json" \
      -d '{"model":"general_assistant","messages":[{"role":"user","content":"ping"}],"stream":false}'
```

**Market segments the OSS unlocks (not Veilio-only):**  
1. Agentic security scanners (Strix peers, MSSPs, AppSec release gates)  
2. ASM / GRC / SOC report generation  
3. Web3 AppSec products (dApp URL + contract in one report)  
4. CI/CD platform engineering canaries  
5. ISVs already on OpenAI/LiteLLM SDKs (analytics bots, IDE explainers, education)

**Important:** ChainGPT does **not** need to build this adapter. Public docs expose `/chat/stream` + `question`; we implement the `/v1/chat/completions` bridge, document mapping (`messages` ↔ `question`, streaming SSE), and upstream a LiteLLM provider plugin when stable. Tool calling support will be validated with your eng team; if not available day-one, we ship chat enrichment + OSS first, then enable full Strix when `tools`/`tool_calls` work.

### 2) Smart Contract Auditor — secondary (same Exposure Deep SKU for Web3 ICP)

When a Deep buyer verifies a dApp and provides a verified contract address / source:  
1. Web agent scan on `https://app.protocol.xyz` (LLM via adapter)  
2. Parallel **Smart Contract Auditor** API on `0x…`  
3. Single Deep PDF: “Web” + “On-chain” sections  

Example buyer: launchpad pre-TGE checklist, protocol security startup, wallet/bridge staging review.

---

## **Grant Request**

* Requested API Credits Amount (up to $20,000): **$20,000**  
* Requested Cash Grant Amount (up to $10,000): **$5,000** (optional / stretch — primarily for OSS packaging, docs, demos; we prioritize **API credits + co-marketing**)

Briefly justify your budget request. (Explain how the requested API credits and/or cash grant amounts align with the activities described in your milestones).  

Answer:  

**API credits ($20,000) — primary ask**

| Activity | Why credits | Rough use |
|----------|-------------|-----------|
| M1 Adapter R&D | Live `/chat/stream` calls while mapping OpenAI shapes, streaming, error codes | Dev/staging burn |
| M2 Strix / agent spikes | Agentic loops are multi-turn (tens of requests per quick scan). Lab Juice Shop + owned staging targets | High density |
| M3 Exposure Deep staging | Real Deep jobs on mock/paid path; report enrichment on free OSINT | Product QA |
| M4 Public CI + OSS demos | Nightly canaries, grant demo videos, community try-outs without burning personal cards | Sustained |
| M5 Web3 Deep add-on | Smart Contract Auditor calls on sample/protocol demos | Secondary product |
| Buffer | Rate-limit retries, eval harness A/B, partner workshop | Continuity |

Without credits, we cannot prove agent economics or run co-marketing demos. Gemini free-tier already failed mid-scan (quota ~20 req/day). ChainGPT credits are the intended production fuel for Exposure Deep and for **other builders** cloning the OSS proxy.

**Cash ($5,000) — secondary**  
Engineering time to harden OSS (tests, Docker image, LiteLLM plugin PR, English docs, security review of logging/PII). If cash is reserved for larger brands only, we accept **credits-only** and still deliver OSS + Exposure integration + co-marketing assets.

**Co-marketing (explicit ask, non-cash)**  
Joint announcement, case study, newsletter/X feature, docs listing of the adapter, intro to builder community. See Value section.

---

## **Milestones and Deliverables**

| Milestone | Approx. Completion Date | Deliverable |
| ----- | ----- | ----- |
| **1 — OpenAI-compatible proxy (v0)** | **+4–6 weeks** from grant kickoff | Repo live: https://github.com/VeilioAPI/ChainGPT-LiteLLM (Apache-2.0). Deliverable: hardened v0 — `/v1/chat/completions` + `/v1/models`; map `messages`→`question`; stream + non-stream; credit/latency logs; Docker + README; CI with mocked upstream. **Live canary against ChainGPT LLM** (scaffold already published). |
| **2 — Agent / Strix proof** | **+8–10 weeks** | Documented Strix (or peer) config using adapter; Juice Shop lab script in `examples/`; success criteria: completed quick run and/or ≥1 finding **or** written partner note if tool-calling blocked upstream. Optional LiteLLM `config.yaml` example. |
| **3 — Exposure Deep on ChainGPT** | **+12–14 weeks** | Staging Exposure Deep worker env wired to adapter; report enrichment (OSINT→CTO summary) live; health endpoint shows ChainGPT path; optional Smart Contract Auditor section for Web3 demo target; short Loom walkthrough for co-marketing. |
| **4 — Ecosystem pack + co-marketing** | **+14–16 weeks** | Case study draft (problem → adapter → Exposure Deep); architecture diagram; blog-ready technical post; PR or plugin path toward LiteLLM listing; workshop notes / FAQ for builders; metrics: credits burned, Deep jobs on ChainGPT, GitHub stars/forks, inbound builder questions. |

Milestone payments / credit unlocks can be staged (e.g. 25% credits at M1, 25% M2, 30% M3, 20% M4) at ChainGPT’s discretion.

---

## **Value to ChainGPT**

Clearly outline how your integration will directly benefit ChainGPT. Focus on specific and quantifiable benefits:

Answer:  

### User growth (credit consumers beyond Veilio)

- **Direct:** Every Exposure Deep job + enrichment call burns `general_assistant` (and Auditor when Web3).  
- **Indirect (larger):** The OSS proxy turns **any** LiteLLM/OpenAI-SDK product into a ChainGPT customer without a custom integration project. Target segments: security agents, ASM/GRC report tools, DeFi AppSec platforms, CI platforms, education/IDE bots.  
- **Estimate (12 months, directional):**  
  - Exposure: hundreds → low thousands of Deep/enrichment calls/month as funnel scales  
  - OSS clones: even **50–200 external deployments** each running canaries + light chat can exceed Exposure-only burn  
  - We will report monthly: credits used, adapter GitHub traffic, known downstream adopters  

### Case studies

- **Primary case study:** “From OSINT exposure report to agentic Deep scan on ChainGPT credits” (Veilio Exposure).  
- **Secondary:** “Drop-in OpenAI base_url → ChainGPT for Strix/LiteLLM agents” (technical builder story).  
- Assets: Loom demo, architecture diagram, before/after (Gemini 429 vs ChainGPT credits), sample Deep report (redacted).

### Brand visibility & co-marketing (requested)

We commit to and request:

| Channel | What we offer | What we ask |
|---------|---------------|-------------|
| Launch | Joint announcement (X + LinkedIn + optional blog) | Quote/RT from ChainGPT, listing in newsletter/ecosystem |
| Docs | Link adapter in our Deep docs | Link from ChainGPT developer docs / “community integrations” |
| Events | Demo at relevant Web3/security meetups when possible | Introductions to Pad/Labs/builder Discord where relevant |
| Content | Technical write-up + screenshots | Amplification to ChainGPT’s audience |

### Open-source contributions (core of this grant)

| Asset | Reuse |
|-------|--------|
| [ChainGPT-LiteLLM](https://github.com/VeilioAPI/ChainGPT-LiteLLM) | Any language via HTTP OpenAI shape |
| Mapping docs | `messages` ↔ `question`, streaming, errors, credits |
| Examples | Strix env, Juice Shop script, Python OpenAI client, CI curl |
| Optional LiteLLM provider plugin | `chaingpt/general_assistant` in community configs |
| Feedback loop | Document gaps (e.g. tool calling) → product/docs improvements |

This matches ChainGPT’s stated preference for **innovative / open-source projects** that are reusable across the ecosystem—not a closed one-off SDK paste.

### Product and documentation improvements

We will file concrete feedback from real agent traffic: latency, streaming edge cases, credit accounting under multi-turn loops, recommended `chatHistory=off` patterns for agents, and whether an official `/v1/chat/completions` should exist upstream. If tool calling is unsupported, we will publish a clear “chat vs agent” compatibility matrix so other builders do not fail silently.

---

## **Integration Information** 

Enhance your application by providing supporting materials:

* **Grant application (this doc):** https://github.com/VeilioAPI/ChainGPT-LiteLLM/blob/develop/docs/grant-application-veilio-2026-08-28.md  
* **Technical proposal (detailed):** https://github.com/VeilioAPI/ChainGPT-LiteLLM/blob/develop/docs/CHAINGPT-LITELLM-ADAPTER.md  
* **OSS repo (public):** https://github.com/VeilioAPI/ChainGPT-LiteLLM · specs: https://github.com/VeilioAPI/ChainGPT-LiteLLM/blob/develop/SPECS.md · examples: `examples/`  
* **Product Deep spec:** https://github.com/VeilioAPI/Exposure/blob/develop/docs/EXP-DEEP-SCAN-STRIX.md  
* **Live product:** https://staging.exposure.veilio.xyz (OSINT + Deep funnel) · https://veilio.xyz  
* **Architecture (summary):**

```
Exposure Deep UI / other agents
        → Worker (Strix or OpenAI SDK)
        → ChainGPT-LiteLLM  (/v1/chat/completions)
        → api.chaingpt.org/chat/stream  (general_assistant)
        → findings / summaries / reports
```

* **Visuals / Loom:** To be delivered at Milestone 3–4 (Deep on ChainGPT + OSS demo). Happy to schedule a live walkthrough with the grants team anytime.  
* **Pitch one-pager:** This application + adapter doc; slide deck available on request within 1 week.

---

## **Submission Instructions:**

Please complete this form and submit it via email to [grants@chaingpt.org](mailto:grants@chaingpt.org).

---

## **Grant Expectations Match:**

We self-assess against ChainGPT’s criteria as:

- **Not** a mega-DAU consumer brand yet → we do not claim “established large user base” cash priority alone.  
- **Yes — Innovative / Open-Source:** We build a **unique, reusable OpenAI/LiteLLM bridge** that ChainGPT is not shipping itself, plus a real security product (Exposure OSINT → Deep) as reference customer. This is the category that qualifies for **substantial API credits** and, where appropriate, cash.  
- **Documentation / product feedback:** Agent-loop learnings fed back to ChainGPT eng/docs.

**Primary request:** **$20,000 API credits** + **co-marketing**.  
**Secondary:** **$5,000 cash** for OSS hardening if aligned with program norms.

## **Co-Marketing Expectations Match:**

We request co-marketing as:

- Innovative application of ChainGPT’s LLM (+ Auditor) in **cybersecurity / OSINT → active scan**  
- Open-source distribution vehicle for **all** LiteLLM builders  
- Willing to produce case study, joint posts, and demo assets post-milestones  

Pre-TGE / Pad paths are optional follow-ons; this grant stands on **API integration + OSS + Exposure reference**, not a token launch.

---

**Thank you for applying to the ChainGPT Grant Program!**

We appreciate your commitment to innovation and are excited to review your project. If you have any questions or need assistance during the review process, feel free to reach out anytime.

---

### **Internal checklist before sending**

- [ ] Fill Primary Contact name + email  
- [x] Confirm GitHub org for OSS repo name → https://github.com/VeilioAPI/ChainGPT-LiteLLM  
- [x] Grant + adapter docs published in OSS repo (`docs/`)  
- [ ] Set Google Doc sharing: Anyone with the link → Viewer (if submitting Google Doc copy)  
- [ ] Email: grants@chaingpt.org with links below
