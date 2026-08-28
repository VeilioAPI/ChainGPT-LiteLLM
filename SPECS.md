# Specs — ChainGPT-LiteLLM

**Produit :** proxy OpenAI / LiteLLM compatible pour le Web3 LLM ChainGPT (`general_assistant`)  
**Repo :** `ChainGPT-LiteLLM`  
**Statut :** initialisation (v0)  
**Licence :** Apache-2.0  
**Client de référence :** Veilio Exposure (Deep scan + enrichment de rapports)  
**Dernière mise à jour :** 2026-08-27

---

## 1. Vision produit

Permettre à **n’importe quel** client qui parle déjà le protocole OpenAI Chat Completions (`/v1/chat/completions`) ou LiteLLM (`openai/...` + `api_base`) de consommer les crédits ChainGPT **sans** réécrire son SDK.

ChainGPT expose aujourd’hui :

```http
POST https://api.chaingpt.org/chat/stream
{ "model": "general_assistant", "question": "...", "chatHistory": "off" }
```

Les agents et SaaS attendent :

```http
POST /v1/chat/completions
{ "model": "...", "messages": [...], "stream": true|false, "tools": [...]? }
```

Ce projet comble l’écart : **Veilio développe et open-source le bridge** ; ChainGPT n’a pas à livrer un endpoint OpenAI natif pour que l’écosystème démarre.

---

## 2. Specs fonctionnelles

### 2.1 Acteurs

| Acteur | Besoin |
|--------|--------|
| Opérateur (SaaS / agent worker) | Déployer un sidecar, pointer `LLM_API_BASE` / `base_url` dessus |
| Développeur OpenAI SDK | `OpenAI(base_url=..., api_key=...)` inchangé côté app |
| Agent Strix / LiteLLM | `STRIX_LLM=openai/general_assistant` + `LLM_API_BASE=http://host:8787/v1` |
| ChainGPT / grant reviewers | Artifact OSS réutilisable + case study Exposure |
| Utilisateur final Exposure | Ne voit jamais le proxy ; consomme Deep / résumé CTO |

### 2.2 Cas d’usage (priorisés)

| ID | Cas | Priorité | Dépend de tool calling |
|----|-----|----------|------------------------|
| UC1 | Chat non-stream : résumé rapport / canary CI | P0 | Non |
| UC2 | Chat stream SSE au format OpenAI | P0 | Non |
| UC3 | Liste modèles `GET /v1/models` | P0 | Non |
| UC4 | Health `GET /health` | P0 | Non |
| UC5 | Agent Strix (boucle multi-tours + tools) | P1 | Oui (si upstream le permet) |
| UC6 | Plugin LiteLLM natif `chaingpt/...` | P2 | Non pour chat |
| UC7 | Smart Contract Auditor (API séparée, hors proxy chat) | P2 | N/A (doc + exemple client) |

### 2.3 Comportements attendus

#### UC1 — Chat completions (non-stream)

1. Client envoie `POST /v1/chat/completions` avec `messages[]`, `model`, `stream: false`.
2. Le proxy mappe `messages` → une seule chaîne `question`.
3. Le proxy appelle ChainGPT `POST /chat/stream` (ou équivalent documenté), agrège la réponse.
4. Réponse OpenAI-shaped :

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1710000000,
  "model": "general_assistant",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "..." },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
}
```

> Note : si ChainGPT ne renvoie pas de tokens usage, renvoyer `0` ou omettre selon convention documentée ; ne pas inventer de facturation fausse côté client.

#### UC2 — Stream

1. Même entrée avec `stream: true`.
2. Réponse `text/event-stream` avec chunks `chat.completion.chunk` (delta content).
3. Terminer par `data: [DONE]\n\n`.

#### UC3 — Models

`GET /v1/models` retourne au minimum `general_assistant` (et éventuellement d’autres IDs documentés ChainGPT).

#### UC4 — Health

`GET /health` → `{ "ok": true, "upstream": "chaingpt", "version": "..." }` sans appeler l’API payante par défaut. Option `?probe=1` pour un ping crédit-coûteux (désactivé par défaut).

#### UC5 — Tools (phase 2)

- Si la requête contient `tools` / `tool_choice` et que l’upstream **ne** les supporte **pas** : réponse HTTP `501` claire avec message documenté (pas de silence).
- Si support confirmé : mapper vers le format ChainGPT et renvoyer `tool_calls` OpenAI-compatible.

### 2.4 Règles métier

| Règle | Détail |
|-------|--------|
| Clé API | `CHAINGPT_API_KEY` côté serveur uniquement |
| Historique | `chatHistory: "off"` par défaut (agents / jobs) ; configurable |
| Caps | `MAX_CREDITS_PER_JOB` optionnel : log warning ou refuse |
| PII | Le proxy ne doit pas logger le corps `question` / `messages` en clair en prod (ids + latence + status uniquement par défaut) |
| Réseau | Destiné à un réseau privé (sidecar worker), pas exposition publique Internet sans auth |

### 2.5 Critères d’acceptation (v0)

- [ ] `curl` non-stream vers `/v1/chat/completions` retourne un JSON OpenAI valide avec contenu assistant non vide (clé ChainGPT réelle).
- [ ] Stream : au moins un chunk delta + `[DONE]`.
- [ ] `GET /v1/models` et `GET /health` OK sans clé (health) / avec config.
- [ ] Exemple Python `openai` SDK fonctionne avec `base_url`.
- [ ] Exemple env Strix documenté (même si tool calling encore bloqué).
- [ ] Tests unitaires du mapping `messages → question`.
- [ ] README + Docker + `.env.example`.

### 2.6 Hors scope (non-goals)

- Remplacer les SDK ChainGPT NFT / news / AgenticOS.
- Gateway multi-providers (OpenAI + Anthropic + ChainGPT).
- Affirmer « Strix production-ready » tant que tool calling n’est pas prouvé.
- UI dashboard / billing ChainGPT.

---

## 3. Specs techniques

### 3.1 Stack

| Élément | Choix |
|---------|--------|
| Runtime | Node.js ≥ 20 |
| Langage | TypeScript (strict) |
| HTTP | Hono + `@hono/node-server` |
| Tests | `node:test` via `tsx --test` |
| Packaging | `npm` ; binaire `chaingpt-litellm` |
| Conteneur | Dockerfile multi-stage (node alpine) |

### 3.2 Architecture

```
Client (Strix / OpenAI SDK / curl / Exposure worker)
        │
        │  POST /v1/chat/completions
        ▼
┌───────────────────────────────┐
│  ChainGPT-LiteLLM (sidecar)   │
│  ┌─────────┐  ┌────────────┐  │
│  │ routes  │→ │ mapping    │  │
│  └─────────┘  └─────┬──────┘  │
│                     ▼         │
│               ┌────────────┐  │
│               │ chaingpt   │  │
│               │ client     │  │
│               └─────┬──────┘  │
└─────────────────────┼─────────┘
                      │ POST /chat/stream
                      ▼
              api.chaingpt.org
```

### 3.3 Endpoints exposés

| Méthode | Path | Description |
|---------|------|-------------|
| GET | `/health` | Liveness |
| GET | `/v1/models` | Catalogue minimal |
| POST | `/v1/chat/completions` | Bridge principal |

Pas d’auth OpenAI côté proxy en v0 (réseau privé). Option future : Bearer local miroir.

### 3.4 Mapping des champs (phase 1)

| OpenAI | ChainGPT |
|--------|----------|
| `messages[]` | `question` (texte agrégé, voir algorithme) |
| `model` | forcé / validé : `general_assistant` (alias acceptés documentés) |
| `stream: false` | appel stream upstream bufferisé → JSON unique |
| `stream: true` | relay / reformat SSE OpenAI |
| — | `chatHistory` depuis env (`off` défaut) |
| `tools`, `tool_choice` | phase 2 ou `501` |

#### Algorithme `messages → question`

1. Parcourir `messages` dans l’ordre.
2. Pour chaque message :
   - `system` → préfixer `System: …\n`
   - `user` → préfixer `User: …\n` (ou corps seul si un seul message user)
   - `assistant` → préfixer `Assistant: …\n`
   - `tool` / `function` → phase 2
3. Si `content` est un tableau (multimodal), ne garder que les parts `type=text` ; ignorer images avec warning log.
4. Concaténer avec séparateurs `\n`. Truncation optionnelle via `MAX_QUESTION_CHARS` (futur).

### 3.5 Erreurs

| Situation | HTTP | Corps |
|-----------|------|-------|
| JSON invalide | 400 | `{ "error": { "message": "...", "type": "invalid_request_error" } }` |
| Clé manquante | 500 | config error (pas de fuite de secret) |
| Upstream 4xx/5xx | 502 / 429 | message sanitisé + `upstream_status` |
| Tools non supportés | 501 | `tools_not_supported` |
| Cap crédits | 429 | `credit_cap_exceeded` |

Aligner au maximum le shape `error` OpenAI pour les SDKs.

### 3.6 Configuration (env)

| Variable | Requis | Défaut | Rôle |
|----------|--------|--------|------|
| `CHAINGPT_API_KEY` | oui | — | Auth upstream |
| `CHAINGPT_BASE_URL` | non | `https://api.chaingpt.org` | Host API |
| `ADAPTER_HOST` | non | `127.0.0.1` | Bind |
| `ADAPTER_PORT` | non | `8787` | Port |
| `CHAINGPT_CHAT_HISTORY` | non | `off` | Session ChainGPT |
| `MAX_CREDITS_PER_JOB` | non | vide | Cap soft/hard |
| `LOG_LEVEL` | non | `info` | `debug` \| `info` \| `warn` |

### 3.7 Structure du repo

```
ChainGPT-LiteLLM/
  README.md
  SPECS.md                 ← ce document
  LICENSE
  package.json
  tsconfig.json
  Dockerfile
  .env.example
  src/
    index.ts               # entry
    config.ts
    server.ts              # routes Hono
    mapping/
      messages-to-question.ts
    chaingpt/
      client.ts            # POST /chat/stream
    openai/
      types.ts
      respond.ts           # JSON + SSE builders
  tests/
    messages-to-question.test.ts
  examples/
    litellm_config.yaml
    report-summary.curl.sh
    juice-shop-strix.sh
    openai_client.py
```

### 3.8 Observabilité

Logs structurés (une ligne JSON) :

- `request_id`, `route`, `stream`, `latency_ms`, `upstream_status`, `ok`
- **Pas** de `question` / `messages` en `info` (uniquement `debug` explicite et local)

### 3.9 Sécurité

- Pas de commit de `.env` / clés.
- Image Docker : user non-root.
- Surface d’attaque minimale : 3 routes HTTP.
- Recommandation doc : bind `127.0.0.1` ou réseau Docker interne.

### 3.10 Intégration de référence (Exposure)

```bash
# Sidecar
CHAINGPT_API_KEY=... ADAPTER_PORT=8787 npm start

# Worker Deep / Strix
export STRIX_LLM=openai/general_assistant
export LLM_API_BASE=http://127.0.0.1:8787/v1
```

Enrichissement OSINT (sans agent) : un seul `chat.completions` avec le JSON de findings (sans PII) → bullets CTO.

### 3.11 Roadmap technique

| Phase | Livrable | Horizon indicatif |
|-------|----------|-------------------|
| M1 | Proxy v0 chat + models + health + tests mapping + Docker | 4–6 semaines post-kickoff grant |
| M2 | Preuve agent / doc tool calling (ou matrice d’incompatibilité) + Juice Shop example | +8–10 sem. |
| M3 | Wiring Exposure Deep staging | +12–14 sem. |
| M4 | Plugin LiteLLM optionnel + case study co-marketing | +14–16 sem. |

---

## 4. Exemples d’utilisation (cible)

### OpenAI Python

```python
from openai import OpenAI
client = OpenAI(base_url="http://127.0.0.1:8787/v1", api_key="local")
r = client.chat.completions.create(
    model="general_assistant",
    messages=[{"role": "user", "content": "What is a reentrancy guard?"}],
)
print(r.choices[0].message.content)
```

### curl canary

```bash
curl -s http://127.0.0.1:8787/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "general_assistant",
    "messages": [{"role": "user", "content": "ping"}],
    "stream": false
  }'
```

### Strix

```bash
export STRIX_LLM=openai/general_assistant
export LLM_API_BASE=http://127.0.0.1:8787/v1
strix -n -t https://staging.example.com --scan-mode quick \
  --instruction "Non-destructive. Prefer authz gaps and misconfig."
```

---

## 5. Risques et questions ouvertes

| Risque | Mitigation |
|--------|------------|
| Pas de `tool_calls` upstream | UC1–UC4 + UC6 d’abord ; UC5 documenté honnêtement |
| Brûlure de crédits en boucle agent | caps, `chatHistory=off`, budgets scan |
| Drift API ChainGPT | client isolé + tests d’intégration optionnels derrière clé |

**Questions pour ChainGPT**

1. Endpoint `/v1/chat/completions` officiel prévu, ou proxy communautaire OK ?
2. Support natif `tools` / `tool_calls` sur `general_assistant` ?
3. Bonnes pratiques multi-tours avec `chatHistory=off` ?
4. Pool de crédits pour CI publique de ce repo ?

---

## 6. Références

- [Web3 LLM API (ChainGPT)](https://docs.chaingpt.org/dev-docs-b2b-saas-api-and-sdk/web3-ai-chatbot-and-llm-api-and-sdk)
- [LiteLLM OpenAI-compatible](https://docs.litellm.ai/docs/providers/openai_compatible)
- [Web3 AI Grant](https://www.chaingpt.org/web3-ai-grant)
- Spec partenaire Exposure : `Veilio Exposure/docs/CHAINGPT-LITELLM-ADAPTER.md`
- Grant application : `Veilio Exposure/docs/ChainGPT Grant Application Template - Veilio - August 28th 2026.md`
