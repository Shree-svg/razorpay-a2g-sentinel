# Development Phases & Timeline (Project B.I.T.)

Total estimated effort: ~15-22 hours, structured for a hackathon build cycle.

## Phase 1 — Core Libraries & Mock Data (~3-4 hrs) ✅ COMPLETE
* `data/mockCatalog.json`: Inventory with a hidden prompt injection attack embedded in `SKU_003`'s description field, for later use by the Attack Simulator.
* `lib/securityGate.ts`: Deterministic token minting (`generateIntentToken`) and validation (`validateTransaction`), signed with SHA-256.
* `lib/sanitization.ts`: Regex-based sanitizer (`sanitizeCatalogPayload`) stripping prompt injection patterns from catalog text fields.
* `lib/agentLoop.ts`: Schema-enforced Observe → Plan → Act → Verify loop (`runAgentLoop`) with a hard 3-attempt retry cap.

**Exit criteria:** Unit-testable in isolation via `ts-node` or a quick script — no UI or API routes required yet to confirm these work.

## Phase 2 — API Route Infrastructure (~2-3 hrs) ✅ COMPLETE
* `app/api/gateway/route.ts`: POST endpoint validating a transaction against a Bounded Intent Token via `validateTransaction`.
* `app/api/merchant/route.ts`: GET endpoint serving the sanitized catalog only — raw catalog never exposed.
* `app/api/buyer/route.ts`: POST endpoint minting a new Bounded Intent Token within budget constraints.

**Exit criteria:** All three routes callable via `curl`/Postman and returning correctly shaped, Zod-validated JSON.

## Phase 3 — Dashboard UI (~5-7 hrs) ← CURRENT PHASE
* 3.1 Layout scaffold: `app/page.tsx`, `app/layout.tsx`, 3-column dark-mode grid.
* 3.2 `contexts/AuditContext.tsx`: shared live audit log state, rendered in the right-hand column.
* 3.3 `components/BuyerAgentPanel.tsx`: natural-language goal input, drives `runAgentLoop`, renders live loop steps.
* 3.4 `components/MerchantAgentPanel.tsx`: sanitized catalog display with "SANITIZED" badges.
* 3.5 `components/AttackSimulator.tsx`: the Red Team demo — raw vs. sanitized run, before/after diff view.
* 3.6 Polish pass: loading states, error boundaries, transitions.

**Exit criteria:** A full end-to-end demo runs live in the browser — buyer states a goal, loop executes, audit trail populates, attack simulator neutralizes an injected prompt.

## Phase 4 — Integration & Hardening (~2-3 hrs)
* Wire real error propagation from API routes into the UI's error states (no silent failures).
* Add the Human-in-the-Loop approval modal on successful gateway validation.
* Stress-test the retry loop with deliberately malformed LLM outputs to confirm the `HALTED_FAILED_VALIDATION` path renders correctly.
* Verify token replay protection (single-use enforcement) end-to-end.

**Exit criteria:** All rules in `rules.md` are demonstrably enforced by clicking through the UI, not just by reading the code.

## Phase 5 — Demo Prep & Pitch Polish (~2-3 hrs)
* Script a 3-5 minute live demo: happy path purchase → Red Team attack (blocked) → expired token / price tamper edge case (blocked).
* Prepare a 1-slide architecture diagram (reuse the diagram in `architecture.md`) for judges who want the technical story fast.
* Rehearse the "why this isn't a chatbot wrapper" explanation — lead with Bounded Intent Tokens and the Sanitization Proxy as the two non-obvious pieces.
* Final commit, tag a `demo-ready` git tag, and do a clean `npm run build` to catch any last TypeScript errors before presenting.

**Exit criteria:** Full run-through completed twice without a crash, timing under the hackathon's demo slot.
