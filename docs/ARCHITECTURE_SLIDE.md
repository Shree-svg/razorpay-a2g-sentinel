# Project B.I.T. — Architecture (1-Slide Reference)

## Core Principle

> **AI reasons. Deterministic code executes.** The LLM can never touch money, SKU data, or raw catalog text directly.

---

## System Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Project B.I.T. — A2G Gateway Engine                 │
│                                                                              │
│  ┌──────────────────┐  sanitized catalog   ┌──────────────────────────────┐ │
│  │  Buyer Agent     │◄────────────────────►│  Sanitization Proxy           │ │
│  │  (LLM + Loop)    │                      │  lib/sanitization.ts          │ │
│  └────────┬─────────┘                      │  strips injections BEFORE LLM │ │
│           │ proposes intent                └──────────────────────────────┘ │
│           ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                 Agent Execution Loop  (lib/agentLoop.ts)               │ │
│  │          Observe → Plan → Act → Verify   (max 3 retries, Zod-schema'd) │ │
│  └────────────────────────────┬───────────────────────────────────────────┘ │
│                               │  GENERATE_INTENT → /api/buyer               │
│                               ▼                                              │
│                  ┌────────────────────────────┐                              │
│                  │  Bounded Intent Token       │                              │
│                  │  { sku, maxAmount, expiry,  │                              │
│                  │    nonce, SHA-256 sig }      │                              │
│                  └──────────────┬─────────────┘                              │
│                                 │  PROPOSE_OFFER → /api/gateway              │
│                                 ▼                                             │
│                  ┌─────────────────────────────┐                             │
│                  │  Security Gate               │  validateTransaction()      │
│                  │  lib/securityGate.ts         │  ← zero LLM calls          │
│                  │  Checks:                     │                             │
│                  │  ✓ Signature integrity        │                             │
│                  │  ✓ Price ceiling (maxAmount)  │                             │
│                  │  ✓ SKU binding               │                             │
│                  │  ✓ TTL / token expiry        │                             │
│                  │  ✓ Single-use nonce           │                             │
│                  └──────────────┬──────────────┘                             │
│                                 │  pass → awaitingHumanApproval              │
│                                 ▼                                             │
│                  ┌─────────────────────────────┐                             │
│                  │  Human-in-the-Loop Modal     │  rules.md §4.1             │
│                  │  Approve / Reject            │  No funds move without it  │
│                  └──────────────┬──────────────┘                             │
│                                 │                                             │
│                                 ▼                                             │
│                  ┌─────────────────────────────┐                             │
│                  │  Live Audit Ledger (UI)      │                             │
│                  │  Every step, every block,    │                             │
│                  │  every approval — logged      │                             │
│                  └─────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Two Non-Obvious Pieces

### 1. Bounded Intent Token
Like a **signed cheque with a printed limit**.

| Field | What it enforces |
|---|---|
| `sku` | Agent can only buy *this exact product* |
| `maxAmount` | Agent cannot spend more than *this price* |
| `expiry` | Token self-destructs after 3 minutes |
| `nonce` | Single-use: replaying the token is a hard 403 |
| `SHA-256 sig` | Tampering the amount = signature mismatch = immediate reject |

### 2. Sanitization Proxy
Strips prompt injection patterns **before** any catalog text touches the LLM's context window.

- Removes `[System Instruction: ...]` patterns
- Removes role-override phrases (`ignore previous instructions`, `you are now...`)
- Strips embedded JSON / code fences from human-readable fields
- Returns a **diff** of what was stripped — visible in the Attack Simulator

---

## Failure Modes (All Handled)

| Scenario | What happens |
|---|---|
| LLM returns non-JSON | Zod parse fail → retry (max 3) → `HALTED_FAILED_VALIDATION` |
| Invoice exceeds token limit | Gateway 403 `PRICE_CEILING_EXCEEDED` → terminal halt, no retry |
| Token expired | Gateway 401 `TOKEN_EXPIRED` → terminal halt, no retry |
| Token reused | Gateway 403 `TOKEN_REPLAY` → terminal halt, no retry |
| Signature tampered | Gateway 403 `SIGNATURE_MISMATCH` → terminal halt, no retry |
| Prompt injection in catalog | Sanitization Proxy strips it; LLM never sees it |
