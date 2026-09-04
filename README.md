# Project B.I.T. — Bounded Intent Tokens

> **A cryptographically-bounded AI purchasing agent that can never overspend, never be prompt-injected, and never move funds without human approval.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Groq](https://img.shields.io/badge/LLM-Groq%20API-orange)](https://console.groq.com)

---

## What Is This?

B.I.T. is a live demo of a **secure agentic commerce system**. It answers:

> *"How do you let an AI agent spend money on your behalf — without it being able to overspend, buy the wrong thing, or be tricked by a hacker?"*

The answer: **Bounded Intent Tokens** — cryptographically signed spending mandates that the AI can propose but never forge. Execution is fully deterministic. Human approval is mandatory before any funds move.

### The Three Guarantees

| Guarantee | Mechanism |
|---|---|
| AI can't overspend | Token has a hard `maxAmount` — gateway rejects any invoice above it |
| AI can't be prompt-injected | Catalog is sanitized *before* the AI sees it (structural quarantine, not content policy) |
| No funds move without you | Human-in-the-Loop approval is enforced at architecture level — not a UI nicety |

---

## Architecture

```
┌──────────────────┐   sanitized catalog   ┌───────────────────────────┐
│   Buyer Agent    │◄─────────────────────►│   Sanitization Proxy       │
│   (LLM + Loop)   │                       │   lib/sanitization.ts      │
└────────┬─────────┘                       │   strips injections BEFORE  │
         │ proposes intent                 │   LLM ever sees the data    │
         ▼                                 └───────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│          Agent Execution Loop  (lib/agentLoop.ts)                    │
│    Observe → Plan → Act → Verify   (max 3 retries, Zod-schema'd)    │
└─────────────────────────┬────────────────────────────────────────────┘
                          │  GENERATE_INTENT → /api/buyer
                          ▼
             ┌────────────────────────────┐
             │   Bounded Intent Token      │
             │   { sku, maxAmount, expiry, │
             │     nonce, SHA-256 sig }    │
             └──────────────┬─────────────┘
                            │  PROPOSE_OFFER → /api/gateway
                            ▼
             ┌──────────────────────────────┐
             │   Security Gate              │  Zero LLM calls
             │   lib/securityGate.ts        │  Pure deterministic TS
             │   ✓ Signature integrity      │
             │   ✓ Price ceiling            │
             │   ✓ SKU binding              │
             │   ✓ TTL / token expiry       │
             │   ✓ Single-use nonce         │
             └──────────────┬───────────────┘
                            │  awaitingHumanApproval: true
                            ▼
             ┌──────────────────────────────┐
             │   Human-in-the-Loop Modal    │  rules.md §4.1
             │   Approve  /  Reject         │  No funds move without it
             └──────────────────────────────┘
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/Shree-svg/razorpay-a2g-sentinel.git
cd razorpay-a2g-sentinel
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Edit .env.local and add your GROQ_API_KEY
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).

### 3. Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## Using the App

Type a natural-language goal into the **Buyer Agent** input:

```
buy noise cancelling headphones under 30000 rupees
buy a wireless mouse under 12000 INR
buy a portable SSD under 20000 rupees
```

See [`docs/CATALOG.md`](docs/CATALOG.md) for the full list of 1001 products and 50+ sample commands.

### Happy Path

1. Type a goal → hit **Run**
2. Watch the `Observe → Plan → Act → Verify` loop execute in real time
3. Approve the **Human-in-the-Loop** banner → `FUNDS RELEASED (SIMULATED)`
4. Every step is logged in the **Live Audit Ledger**

### Red Team Demo

Use the **Control & Red Team Suite** (left column) to trigger:

| Button | What it proves |
|---|---|
| **Inject Prompt Attack** | SKU_003 has a hidden `[System Instruction: ...]` in its description — the Sanitization Proxy strips it |
| **Trigger Price Ceiling Breach** | AI cannot spend more than the token's `maxAmount` |
| **Trigger Malformed LLM** | 3 consecutive bad LLM outputs → `HALTED_FAILED_VALIDATION` |
| **Trigger Token Expiry** | 1-second TTL token → gateway returns `401 TOKEN_EXPIRED` |
| **Trigger Token Replay** | Reusing a spent nonce → gateway returns `403 TOKEN_REPLAY` |

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── buyer/route.ts       # POST — mints Bounded Intent Token
│   │   ├── gateway/route.ts     # POST — validates token against invoice
│   │   ├── merchant/route.ts    # GET  — sanitized catalog only
│   │   ├── llm/route.ts         # POST — Groq LLM proxy
│   │   └── debug/raw-catalog/   # GET  — raw catalog for Attack Simulator
│   ├── page.tsx                 # 3-column dashboard layout
│   └── layout.tsx               # AuditProvider wrapper
├── components/
│   ├── AgentWorkspace.tsx       # Dual-agent panel + HITL approval banner
│   ├── BuyerAgentPanel.tsx      # Goal input, loop runner, outcome display
│   ├── MerchantAgentPanel.tsx   # Sanitized catalog display
│   ├── AttackSimulator.tsx      # Before/after diff of injection stripping
│   ├── ControlPanel.tsx         # Red Team buttons + telemetry
│   └── AuditLedger.tsx          # Live scrolling audit log
├── contexts/
│   └── AuditContext.tsx         # Shared audit log state
├── lib/
│   ├── securityGate.ts          # generateIntentToken + validateTransaction
│   ├── sanitization.ts          # Prompt injection stripping
│   └── agentLoop.ts             # Observe → Plan → Act → Verify engine
├── data/
│   └── mockCatalog.json         # 1001 products (SKU_003 has embedded attack)
└── docs/
    ├── architecture.md          # Full system design
    ├── rules.md                 # Security invariants
    ├── phases.md                # Development phases
    ├── CATALOG.md               # All 1001 products + sample commands
    ├── DEMO_SCRIPT.md           # 4-minute live demo script
    └── ARCHITECTURE_SLIDE.md    # 1-slide judge reference
```

---

## API Reference

### `POST /api/buyer` — Mint a Bounded Intent Token

```bash
curl -X POST http://localhost:3000/api/buyer \
  -H "Content-Type: application/json" \
  -d '{"sku":"SKU_001","maxAmount":29990,"expiresInSeconds":180}'
```

Response: `{ sku, maxAmount, expiry, nonce, cryptographicSignature }`

### `POST /api/gateway` — Validate Token Against Invoice

```bash
curl -X POST http://localhost:3000/api/gateway \
  -H "Content-Type: application/json" \
  -d '{"token":{...},"invoice":{"sku":"SKU_001","amount":29990}}'
```

Returns `200 SUCCESS` or `401/403` with a structured `reason` string.

### `GET /api/merchant` — Sanitized Catalog

```bash
curl http://localhost:3000/api/merchant
```

Returns all catalog items with prompt injections stripped. Raw catalog is **never exposed** through this route.

---

## Integration Status & Metrics

**Integration Status:**
- Razorpay Orders API (test mode) successfully integrated. Validated tokens mint real Razorpay test orders.

**Red Team Benchmark Results (N=50 per attack):**
- **Price Ceiling Breach:** 100% Blocked (0.02ms avg)
- **Token Expiry / Replay:** 100% Blocked
- **Malformed LLM:** 100% Blocked
- **Basic Prompt Injection:** 100% Blocked

**Known Limitations:**
The regex-based sanitization proxy successfully blocks basic attacks, but sophisticated variants bypass it:
1. **Unicode Homoglyphs** (e.g., Cyrillic characters resembling English) bypass the regex.
2. **Base64-Encoded Instructions** are ignored by the sanitizer but can still be decoded by an LLM at runtime.

---

## Security Rules (Summary)

See [`docs/rules.md`](docs/rules.md) for the full specification.

- **§1.1** No direct wallet access — all execution via Bounded Intent Token
- **§1.2** Strict price ceiling — invoice amount must be ≤ token `maxAmount`
- **§1.3** Hard TTL — tokens expire after 180 seconds maximum
- **§1.4** Single-use nonce — replaying a spent token is a hard 403
- **§1.5** SKU binding — token is bound to one exact product
- **§1.6** Signature integrity — SHA-256 over `{sku, maxAmount, expiry, nonce}` + server secret
- **§4.1** Human-in-the-Loop — no funds move without explicit human approval

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS |
| LLM | Groq API (`openai/gpt-oss-120b`) |
| Schema Validation | Zod |
| Crypto | Node.js `crypto` (SHA-256 + HMAC) |

---

## License

MIT — see [LICENSE](LICENSE).
