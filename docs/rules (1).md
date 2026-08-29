# System Security & Execution Rules (Project B.I.T.)

## 1. Deterministic Security Rules (Non-Negotiable)
1. **No Direct Wallet Access:** LLMs shall never possess API keys or the capability to move money directly. All execution must go through a Bounded Intent Token.
2. **Strict Price Ceiling:** If `Merchant_Price > Token_Max_Amount`, the Security Gate **MUST** halt execution immediately without consulting the LLM.
3. **Hard Expiration (TTL):** Intent Tokens expire after 180,000 ms (3 minutes). Expired tokens trigger an immediate `401 Unauthorized` status.
4. **Single-Use Tokens:** Once a token has been consumed by a successful `validateTransaction` call, it must be invalidated (e.g. marked spent in memory) so it cannot be replayed against a second invoice.
5. **SKU Binding:** A token minted for `SKU_001` must never validate a transaction for any other SKU, even if price and amount otherwise match.
6. **Signature Integrity:** Every token's `SHA-256` signature must be re-derived and compared server-side on every validation call — never trust a client-supplied "valid" flag.

## 2. Agent Execution Loop Rules
1. **Max Retry Bound:** The Agent Execution Loop is strictly limited to 3 retries. If schema or validation fails 3 times sequentially, the loop breaks with status `HALTED_FAILED_VALIDATION`.
2. **Schema Enforcement:** Every step within the loop must strictly adhere to a pre-defined Zod JSON schema:
   ```typescript
   {
     thought: string;
     action: "QUERY_CATALOG" | "PROPOSE_OFFER" | "GENERATE_INTENT" | "HALT";
     payload: object;
   }
   ```
3. **No Silent Retries:** Every retry must be logged to the Audit Trail with the specific validation error that triggered it — retries are never invisible to the observer.
4. **Terminal Halt on Non-Recoverable Errors:** Expired tokens (`TOKEN_EXPIRED` / HTTP 401), exceeded price ceilings (`PRICE_CEILING_EXCEEDED`), and signature mismatches (`SIGNATURE_MISMATCH`) are treated as terminal failures, not retryable errors — retrying will not change a deterministic outcome, so the loop must halt immediately with status `HALTED_TERMINAL_SECURITY` and the gateway's exact reason string, without incrementing any retry counter.
5. **Hard Cycle Ceiling:** Independent of the 3-retry cap on validation/business failures, the loop is additionally bounded by `MAX_CYCLES = 12` total iterations. This guards against an agent that never fails outright but also never converges — e.g. one that only ever calls `QUERY_CATALOG` without progressing to `GENERATE_INTENT` or `PROPOSE_OFFER`. Hitting this ceiling returns `HALTED_MAX_RETRIES`.
6. **Retryable vs. Terminal Business Failures:** Not every non-2xx gateway response is terminal. `SKU_MISMATCH` and `TOKEN_REPLAY` are retryable — the loop may mint a fresh token or re-propose with the correct SKU, since these reflect a planning error the agent can correct, not a security boundary being pressed against. Only the three conditions in rule 4 above are terminal.

## 3. Catalog Sanitization Rules
1. **Sanitize Before Context:** Raw catalog data must pass through `sanitizeCatalogPayload` before it is ever included in an LLM prompt or context window. There is no code path where raw merchant text reaches the LLM directly.
2. **Strip, Don't Trust:** Any bracketed instruction-like pattern (e.g. `[System Instruction: ...]`), role-override phrase ("ignore previous instructions", "you are now a..."), or embedded code/markup inside a human-readable field (name, description) must be stripped, not merely flagged.
3. **Log Every Strip:** Every sanitization event that actually removes content must be logged to the Audit Trail as a security event, independent of whether a transaction follows.
4. **Fail Closed:** If the sanitizer itself errors on malformed input, the affected catalog item must be excluded from the agent's context entirely rather than passed through unsanitized.

## 4. Human-in-the-Loop Rules
1. **Approval Gate:** No funds may be considered "moved" (even in mock/demo mode) without a final human-facing approval step, regardless of how many automated checks have already passed.
2. **Reason Transparency:** Any blocked transaction must surface a specific, human-readable reason string to the UI — never a generic "transaction failed."

## 5. Auditability Rules
1. **Immutable Log Order:** Audit Trail entries are append-only within a session; earlier entries are never edited or removed, only superseded by new entries.
2. **Every Boundary Crossing Logged:** Any time control passes from LLM reasoning to a deterministic function (Security Gate, Sanitization Proxy), that crossing must produce an Audit Trail entry, whether it passes or fails.
