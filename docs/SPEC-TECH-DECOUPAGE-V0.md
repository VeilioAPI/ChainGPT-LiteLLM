# Spec technique v0 — Découpage features

**Source :** [SPECS.md](../SPECS.md) (vision + exigences)  
**Objectif :** plan d’implémentation pour livrer un **v0 validé contre l’API ChainGPT réelle**  
**Statut repo :** scaffold (routes + mapping + client défensif, **pas encore testé live**)  
**Cible v0 :** UC1–UC4 (chat, stream, models, health)  
**Dernière mise à jour :** 2026-08-28

---

## 1. État actuel (inventaire code)

| Zone | Fichier(s) | État | Gap principal |
|------|------------|------|----------------|
| Bootstrap | `src/index.ts`, `src/config.ts` | ✅ OK | — |
| Health | `src/server.ts` | ⚠️ Partiel | Pas de `?probe=1` |
| Models | `src/server.ts` | ✅ OK v0 | Alias modèles non validés |
| Mapping | `src/mapping/messages-to-question.ts` | ✅ OK | Messages `tool` ignorés (P2) |
| Client upstream | `src/chaingpt/client.ts` | ⚠️ Partiel | Auth headers + format réponse **non validés live** |
| Réponses OpenAI | `src/openai/respond.ts` | ✅ OK | Types à extraire dans `types.ts` |
| Chat route | `src/server.ts` | ⚠️ Partiel | Stream = buffer puis re-chunk (pas relay byte-à-byte) |
| Tools | `src/server.ts` | ✅ 501 | Comportement voulu |
| Logs | `src/server.ts` | ⚠️ Partiel | Pas de `request_id`, pas de niveau `debug` filtré |
| Tests unitaires | `tests/*.test.ts` | ✅ Mapping + parse | Pas de tests HTTP route |
| Tests intégration | — | ❌ | À créer |
| CI | — | ❌ | À créer |
| Docker | `Dockerfile` | ⚠️ Partiel | Pas testé en prod-like |

**Première action demain (bloquante) :** spike live ChainGPT → figer le contrat request/response réel avant de « finir » le client.

---

## 2. Périmètre v0 (Definition of Done globale)

Livrable **v0 done** quand :

1. `npm test` vert (unit + intégration mockée)
2. Script `examples/live-canary.sh` OK avec vraie clé (`content` assistant non vide)
3. OpenAI Python SDK (`examples/openai_client.py`) OK en local
4. Stream : SDK ou `curl -N` reçoit deltas + `[DONE]`
5. `GET /health` et `GET /v1/models` sans appel payant
6. Erreurs upstream → JSON OpenAI-shaped, pas de fuite de clé
7. README mis à jour avec résultat du spike (headers auth, shape réponse)

Hors v0 : tool calling, relay SSE natif upstream, plugin LiteLLM, caps crédits, auth proxy.

---

## 3. Découpage features

Légende statut : `[ ]` à faire · `[~]` partiel · `[x]` fait

---

### Epic E0 — Spike API ChainGPT (Jour 1 matin, ~2h)

> Sans ce spike, le reste est du guesswork.

| ID | Feature | Description | DoD | Statut |
|----|---------|-------------|-----|--------|
| **F-00a** | Spike auth | Tester `POST /chat/stream` avec clé réelle : headers (`Authorization`, `api-key`, autres ?) | Note dans `docs/upstream-spike.md` : headers gagnants + exemple curl | `[ ]` |
| **F-00b** | Spike body | Confirmer payload : `{ model, question, chatHistory }` + codes erreur 401/429 | Exemple request/response redacted commité | `[ ]` |
| **F-00c** | Spike parse | Capturer 3 réponses (courte, longue, stream si applicable) | Liste des champs JSON réels (`bot`, `data`, SSE, etc.) | `[ ]` |
| **F-00d** | Matrice compat | Documenter ce que ChainGPT **ne** supporte pas (tools, multi-turn agent) | § « Compat matrix » dans spike doc | `[ ]` |

**Livrable :** `docs/upstream-spike.md` (créé demain, committé).

**Commande de départ :**

```bash
curl -sS -X POST "https://api.chaingpt.org/chat/stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHAINGPT_API_KEY" \
  -d '{"model":"general_assistant","question":"ping","chatHistory":"off"}'
```

---

### Epic E1 — Client ChainGPT fiable

| ID | Feature | Fichiers | Dépend de | DoD | Statut |
|----|---------|----------|-----------|-----|--------|
| **F-01** | Config stricte | `src/config.ts` | F-00 | Valider port 1–65535 ; message clair si clé absente au boot | `[x]` |
| **F-02** | Client HTTP | `src/chaingpt/client.ts` | F-00a,b | Headers alignés spike ; timeout 60s ; abort signal | `[~]` |
| **F-03** | Parse réponse | `src/chaingpt/client.ts` | F-00c | Parser couvre **format réel** ; tests fixture depuis capture spike | `[~]` |
| **F-04** | Erreurs upstream | `src/chaingpt/client.ts`, `src/server.ts` | F-02 | 401→502 sanitized ; 429→429 ; body tronqué 200 chars max dans logs | `[~]` |
| **F-05** | Séparer stream path | `src/chaingpt/client-stream.ts` (nouveau) | F-00c | v0 : buffer OK ; option `streamUpstream()` si SSE natif confirmé | `[ ]` |

**Tâches demain :**

1. Ajuster `chaingptChat()` selon spike
2. Ajouter fixtures JSON dans `tests/fixtures/chaingpt/`
3. Tests `parseChainGptBody` avec fixtures réelles (pas seulement synthétiques)

---

### Epic E2 — Route OpenAI `/v1/chat/completions`

| ID | Feature | Fichiers | DoD | Statut |
|----|---------|----------|-----|--------|
| **F-10** | Validation body | `src/openai/validate.ts` (nouveau) | Rejeter `messages` absent/vide ; modèle inconnu → 400 | `[ ]` |
| **F-11** | Alias modèles | `src/openai/models.ts` (nouveau) | Accepter `general_assistant`, `openai/general_assistant` ; normaliser en sortie | `[~]` |
| **F-12** | Non-stream | `src/server.ts` | JSON OpenAI valide ; `finish_reason: stop` ; usage à 0 si absent upstream | `[~]` |
| **F-13** | Stream OpenAI | `src/server.ts`, `src/openai/respond.ts` | Chunks role → content → stop → `[DONE]` ; `Content-Type: text/event-stream` | `[~]` |
| **F-14** | Tools guard | `src/server.ts` | 501 + `tools_not_supported` si `tools` ou `tool_choice` | `[x]` |
| **F-15** | Handler extrait | `src/routes/chat-completions.ts` (nouveau) | `server.ts` < 80 lignes ; route testable isolément | `[ ]` |

**Ordre d’implémentation :** F-10 → F-11 → F-12 (E2E) → F-13 → F-15 (refactor).

---

### Epic E3 — Routes auxiliaires

| ID | Feature | DoD | Statut |
|----|---------|-----|--------|
| **F-20** | `GET /health` | `{ ok, upstream, version }` sans clé | `[x]` |
| **F-21** | `GET /health?probe=1` | Appel upstream minimal (« ping ») ; `ok: false` si upstream down ; **opt-in** | `[ ]` |
| **F-22** | `GET /v1/models` | Liste `general_assistant` ; shape OpenAI `object: list` | `[x]` |

---

### Epic E4 — Observabilité & ops

| ID | Feature | Fichiers | DoD | Statut |
|----|---------|----------|-----|--------|
| **F-30** | Request ID | `src/middleware/request-id.ts` | Header `X-Request-Id` ; injecté dans logs JSON | `[ ]` |
| **F-31** | Logs structurés | `src/log.ts` (nouveau) | Champs : `request_id`, `route`, `stream`, `latency_ms`, `upstream_status`, `ok` | `[~]` |
| **F-32** | Pas de PII en info | `src/log.ts` | `question` / `messages` uniquement si `LOG_LEVEL=debug` | `[ ]` |
| **F-33** | Version injectée | `src/version.ts` | Une source (`package.json` ou constante build) pour `/health` | `[ ]` |

---

### Epic E5 — Tests

| ID | Feature | Fichiers | DoD | Statut |
|----|---------|----------|-----|--------|
| **F-40** | Unit mapping | `tests/messages-to-question.test.ts` | Cas single-user, multi-turn, multimodal text, empty | `[x]` |
| **F-41** | Unit parse | `tests/parse-chaingpt-body.test.ts` | + fixtures spike | `[~]` |
| **F-42** | Intégration HTTP | `tests/integration/chat.test.ts` | Hono `app.request()` ; upstream mocké (`fetch` stub ou undici MockAgent) | `[ ]` |
| **F-43** | Intégration erreurs | `tests/integration/errors.test.ts` | 400 JSON invalide ; 501 tools ; 502 upstream 500 | `[ ]` |
| **F-44** | Live canary (manual) | `examples/live-canary.sh` | Script opt-in `CHAINGPT_API_KEY` ; exit 0 si content non vide | `[ ]` |

**npm scripts à ajouter :**

```json
"test:unit": "tsx --test tests/**/*.test.ts --test-skip 'tests/integration/**'",
"test:integration": "tsx --test tests/integration/**/*.test.ts",
"test:live": "bash examples/live-canary.sh"
```

---

### Epic E6 — Packaging & CI

| ID | Feature | DoD | Statut |
|----|---------|-----|--------|
| **F-50** | Dockerfile | Build + run ; user non-root ; `HEALTHCHECK` curl `/health` | `[~]` |
| **F-51** | CI GitHub Actions | `.github/workflows/ci.yml` : install, typecheck, test unit (+ intégration sans clé) | `[ ]` |
| **F-52** | README | Section « Validated against ChainGPT » post-spike | `[~]` |

---

## 4. Plan Jour 1 (demain)

### Matin — Spike + client (E0 + E1)

| Heure | Tâche | Feature |
|-------|-------|---------|
| 1 | Spike curl + documenter | F-00a–d |
| 2 | Fix client headers + parse | F-02, F-03 |
| 3 | Fixtures + tests parse | F-41 |

**Gate :** `curl` direct ChainGPT **et** `curl` via proxy non-stream retournent du texte.

### Après-midi — Route + E2E (E2 + E5)

| Heure | Tâche | Feature |
|-------|-------|---------|
| 4 | Validation body + alias modèles | F-10, F-11 |
| 5 | E2E non-stream + live-canary.sh | F-12, F-44 |
| 6 | Stream + test OpenAI Python | F-13 |
| 7 | Tests intégration mockés | F-42, F-43 |

**Gate fin de journée :** critères §2 (points 1–4 minimum) OK en local.

---

## 5. Plan Jour 2–3 (durcissement v0)

| Priorité | Features | But |
|----------|----------|-----|
| P0 | F-15, F-30, F-31, F-32 | Refactor route + logs prod-ready |
| P0 | F-21 | Probe health pour Docker/K8s |
| P1 | F-51, F-50 | CI + Docker validé |
| P1 | F-04 | Erreurs upstream peaufinées |
| P2 | F-05 | Relay SSE natif si spike montre un vrai stream upstream |

---

## 6. Backlog post-v0 (P1/P2 grant milestones)

| ID | Feature | Epic grant | Notes |
|----|---------|------------|-------|
| **F-60** | `MAX_CREDITS_PER_JOB` | M1 | Compteur in-memory par header `X-Job-Id` |
| **F-61** | Tool calling | M2 | Bloqué par upstream ; sinon 501 documenté |
| **F-62** | Messages `tool` / `function` | M2 | Extension `messagesToQuestion` |
| **F-63** | Plugin LiteLLM | M4 | Package ou PR upstream |
| **F-64** | Exposure wiring | M3 | Repo Exposure : env worker Deep |
| **F-65** | Smart Contract Auditor example | M3 | Client séparé, hors proxy chat |

---

## 7. Structure cible post-refactor

```
src/
  index.ts
  config.ts
  version.ts
  log.ts
  server.ts                    # montage app uniquement
  middleware/
    request-id.ts
  routes/
    health.ts
    models.ts
    chat-completions.ts
  mapping/
    messages-to-question.ts
  chaingpt/
    client.ts                  # non-stream buffer
    client-stream.ts           # optionnel post-spike
    parse-response.ts          # extrait de client.ts
  openai/
    types.ts
    validate.ts
    models.ts
    respond.ts
tests/
  messages-to-question.test.ts
  parse-chaingpt-body.test.ts
  fixtures/chaingpt/
  integration/
    chat.test.ts
    errors.test.ts
docs/
  upstream-spike.md            # créé J1
  SPEC-TECH-DECOUPAGE-V0.md    # ce document
examples/
  live-canary.sh               # créé J1
```

---

## 8. Contrats API (référence rapide dev)

### Entrée OpenAI (proxy)

```http
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "general_assistant",
  "messages": [{"role": "user", "content": "..."}],
  "stream": false
}
```

### Sortie ChainGPT (attendu, à confirmer spike)

```http
POST https://api.chaingpt.org/chat/stream

{
  "model": "general_assistant",
  "question": "<mapped>",
  "chatHistory": "off"
}
```

### Mapping (implémenté)

| OpenAI | ChainGPT |
|--------|----------|
| `messages[]` | `question` via `messagesToQuestion()` |
| `model` | `general_assistant` (aliases normalisés) |
| `stream` | v0 : toujours buffer upstream ; re-emit OpenAI SSE côté proxy |
| — | `chatHistory` ← env `CHAINGPT_CHAT_HISTORY` |

### Erreurs (cible)

| Cas | HTTP | `error.code` |
|-----|------|--------------|
| JSON invalide | 400 | — |
| messages invalides | 400 | — |
| tools présents | 501 | `tools_not_supported` |
| upstream 429 | 429 | `upstream_error` |
| upstream 5xx / réseau | 502 | `upstream_error` |
| clé manquante au boot | process exit 1 | — |

---

## 9. Checklist dev avant PR v0

- [ ] Spike doc complété (`docs/upstream-spike.md`)
- [ ] `npm run typecheck` OK
- [ ] `npm test` OK (unit + integration)
- [ ] `examples/live-canary.sh` OK (manual, clé locale)
- [ ] `examples/openai_client.py` OK
- [ ] `examples/report-summary.curl.sh` OK
- [ ] Stream vérifié (`curl -N` ou SDK)
- [ ] Aucun log de clé API / question en niveau `info`
- [ ] README : prérequis, spike summary, limites connues (tools, fake stream v0)

---

## 10. Liens

- [SPECS.md](../SPECS.md) — exigences produit
- [CHAINGPT-LITELLM-ADAPTER.md](./CHAINGPT-LITELLM-ADAPTER.md) — proposition partenaire
- [Grant application](./grant-application-veilio-2026-08-28.md)
- [ChainGPT Web3 LLM API](https://docs.chaingpt.org/dev-docs-b2b-saas-api-and-sdk/web3-ai-chatbot-and-llm-api-and-sdk)
