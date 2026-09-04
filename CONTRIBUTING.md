# Contributing to Project B.I.T.

Thank you for your interest! This is a hackathon demo project but contributions are welcome.

## Getting Started

1. Fork the repo and clone locally
2. Copy `.env.example` → `.env.local` and add your `GROQ_API_KEY`
3. Run `npm install` then `npm run dev`
4. Open `http://localhost:3000`

## Key Rules (from `docs/rules.md`)

- **The Security Gate (`lib/securityGate.ts`) must contain zero LLM calls.** It is the deterministic trust boundary. Adding any AI reasoning to it violates the core architectural principle.
- **The `/api/merchant` route must never return unsanitized catalog data.** The raw catalog is only exposed via `/api/debug/raw-catalog` which is explicitly marked as demo-only.
- **Human-in-the-Loop approval is mandatory.** No code path should move funds (even simulated) without `awaitingHumanApproval: true` being resolved by a user action.

## Adding Products to the Catalog

Edit `data/mockCatalog.json` directly — the server reads it on every request, no rebuild needed.

```json
{
  "sku": "SKU_XXXX",
  "name": "Product Name",
  "price_inr": 9999,
  "stock_available": 50,
  "description": "Short product description."
}
```

## Commit Style

```
<type>: <short description>

Types: feat | fix | docs | refactor | test | chore
```

Examples:
- `feat: add SKU_MISMATCH error UI to BuyerAgentPanel`
- `fix: token replay not blocked when nonces reset on restart`
- `docs: update CATALOG.md with new kitchen appliance SKUs`

## Reporting Issues

Open a GitHub Issue with:
- Which browser and OS
- Steps to reproduce
- What you expected vs. what happened
- Any relevant audit log entries (copy from the Live Audit Ledger)
