# Architecture Specification: A2G Gateway Engine (Project B.I.T.)

## 1. System Overview
The architecture separates **AI Reasoning (Non-Deterministic)** from **Financial Execution (Deterministic)**. The LLM is only ever allowed to *propose* actions; every action that touches money, inventory, or catalog data passes through a deterministic, non-LLM checkpoint before it can take effect. This is the central architectural principle of the entire system.

```
┌─────────────────┐        ┌──────────────────────┐        ┌──────────────────┐
│  Buyer Agent     │        │  Sanitization Proxy   │        │  Merchant Agent   │
│  (LLM Reasoning) │◄──────►│  (Deterministic)       │◄──────►│  (LLM Reasoning)  │
└────────┬─────────┘        └──────────────────────┘        └─────────┬─────────┘
         │                                                              │
         │  proposes intent                                proposes offer
         ▼                                                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                       Agent Execution Loop Engine                          │
│               Observe → Plan → Act → Verify (max 3 retries)                │
└───────────────────────────────────┬────────────────────────────────────────┘
                                     │  generateIntentToken()
                                     ▼
                        ┌─────────────────────────┐
                        │   Security Gate (Deterministic) │
                        │   validateTransaction()          │
                        └────────────────┬────────────────┘
                                          │  pass/fail
                                          ▼
                              ┌───────────────────────┐
                              │  Live Audit Trail (UI)  │
                              └───────────────────────┘
```

## 2. Component Breakdown

### 2.1 `lib/securityGate.ts` — Deterministic Trust Boundary
* `generateIntentToken(sku, maxAmount, expiresInSeconds)`: Mints a signed, single-use token. Signature is computed via `SHA-256` over `{sku, maxAmount, expiry, nonce}`.
* `validateTransaction(token, invoice)`: Re-derives the signature and checks it against the token; verifies `invoice.amount <= token.maxAmount`, `invoice.sku === token.sku`, and `Date.now() < token.expiry`. Returns a typed pass/fail result with a `reason` string — never throws silently.
* This file contains **zero LLM calls**. It is pure, deterministic TypeScript, which is the point: it must be independently auditable.

### 2.2 `lib/sanitization.ts` — Adversarial Catalog Defense
* `sanitizeCatalogPayload(rawCatalog)`: Strips bracketed system-instruction patterns (e.g. `[System Instruction: ...]`), role-override phrases ("ignore previous instructions", "you are now..."), and any embedded JSON/code fences inside human-readable text fields.
* Runs **before** any catalog data is placed into an LLM prompt/context window — never after.
* Returns both the sanitized payload and a diff of what was stripped, which the UI uses for the Red Team Attack Simulator's before/after view.

### 2.3 `lib/agentLoop.ts` — Iterative Execution Engine
* `runAgentLoop(goal, tools)`: Implements the Observe → Plan → Act → Verify cycle.
  * **Observe:** Gather current state (catalog, prior steps).
  * **Plan:** LLM proposes a `thought` + `action` + `payload` per the strict Zod schema (see `rules.md`).
  * **Act:** Executes the proposed action against the relevant API route.
  * **Verify:** Validates the action's result against the Zod schema and business constraints; on failure, feeds the error back into the next Plan step.
* Hard-capped at 3 retries. On the 3rd consecutive validation failure, the loop halts with status `HALTED_FAILED_VALIDATION` rather than looping indefinitely.

## 3. API Route Layer (Next.js App Router)

| Route | Method | Responsibility |
|---|---|---|
| `app/api/merchant/route.ts` | GET | Reads `data/mockCatalog.json`, pipes through `sanitizeCatalogPayload`, returns sanitized JSON only. Raw catalog is never exposed to this route's callers. |
| `app/api/buyer/route.ts` | POST | Accepts `{sku, maxAmount, expiresInSeconds}`, calls `generateIntentToken`, returns the signed token. This is the *only* place a token is minted. |
| `app/api/gateway/route.ts` | POST | Accepts `{token, invoice}`, calls `validateTransaction`. Returns `200` on pass, `403` with a structured reason on failure. This is the *only* place a transaction is authorized. |

## 4. Decoupling Principle
No single component holds both **reasoning power** (LLM) and **execution power** (money movement, catalog trust). The Buyer/Merchant Agents can hallucinate, get prompt-injected, or produce malformed output — and the worst outcome is a wasted loop iteration, never a bad transaction, because the Security Gate and Sanitization Proxy sit outside the LLM's control entirely.

## 5. Data Flow for a Successful Purchase
1. Merchant Agent's raw catalog (`mockCatalog.json`) is sanitized on read.
2. Buyer Agent's loop observes sanitized catalog, plans a match against user goal.
3. Buyer Agent proposes `GENERATE_INTENT` action → `/api/buyer` mints a Bounded Intent Token.
4. Buyer Agent proposes `PROPOSE_OFFER` → Merchant Agent responds with an invoice.
5. Loop calls `/api/gateway` with `{token, invoice}` → Security Gate validates deterministically.
6. On pass, UI renders a Human-in-the-Loop approval modal; on fail, Audit Trail logs a `blocked` entry with the exact reason.

## 6. Failure Modes & Handling
* **Expired token:** Gateway returns `401`, loop does not retry (retrying won't fix an expired token) — surfaces directly to UI as a terminal failure.
* **Price mismatch:** Gateway returns `403` with reason `PRICE_CEILING_EXCEEDED`; loop may re-plan with a lower-priced SKU if one exists in the sanitized catalog.
* **Malformed LLM output:** Zod parse failure triggers the retry path in `agentLoop.ts`, feeding the validation error back as context for the next Plan step.
* **Prompt injection detected:** Sanitization diff is non-empty; this event itself is logged to the Audit Trail as a security event, independent of transaction outcome.
