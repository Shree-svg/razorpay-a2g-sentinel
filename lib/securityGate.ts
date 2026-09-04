import { createHash, randomBytes } from "crypto";

/**
 * Bounded Intent Token — a cryptographically bound spending mandate.
 * AI reasoning may propose values; only this token authorizes execution.
 * Field names match architecture.md §2.1 (sku, maxAmount, expiry, nonce).
 */
export interface IntentToken {
  sku: string;
  maxAmount: number;
  expiry: number;
  nonce: string;
  cryptographicSignature: string;
}

export interface Invoice {
  sku: string;
  amount: number;
}

export type TransactionStatus = "SUCCESS" | "FAILED";

export type TransactionFailureCode =
  | "SIGNATURE_MISMATCH"
  | "TOKEN_EXPIRED"
  | "SKU_MISMATCH"
  | "PRICE_CEILING_EXCEEDED"
  | "TOKEN_REPLAY";

export interface TransactionResult {
  status: TransactionStatus;
  reason: string;
  code?: TransactionFailureCode;
  orderId?: string;
}

/** rules.md §1.3 — Hard Expiration (TTL): 180,000 ms (3 minutes). */
export const TOKEN_TTL_MS = 180_000;
export const TOKEN_TTL_SECONDS = TOKEN_TTL_MS / 1000;

const spentNonces = new Set<string>();

function verifierSecret(): string {
  return process.env.INTENT_TOKEN_SECRET ?? "bit-demo-verifier-secret";
}

function computeSignature(
  sku: string,
  maxAmount: number,
  expiry: number,
  nonce: string
): string {
  // architecture.md §2.1 — SHA-256 over {sku, maxAmount, expiry, nonce}.
  // Server secret is appended so clients cannot forge tokens (rules.md §1.6).
  const canonical = JSON.stringify({ sku, maxAmount, expiry, nonce });
  return createHash("sha256")
    .update(canonical)
    .update(verifierSecret())
    .digest("hex");
}

/**
 * architecture.md §2.1 — generateIntentToken(sku, maxAmount, expiresInSeconds).
 * TTL is capped at 180s (rules.md §1.3); never mint an unbounded token.
 */
export function generateIntentToken(
  sku: string,
  maxAmount: number,
  expiresInSeconds: number
): IntentToken {
  const boundedSeconds = Math.min(
    Math.max(expiresInSeconds, 1),
    TOKEN_TTL_SECONDS
  );
  const expiry = Date.now() + boundedSeconds * 1000;
  const nonce = randomBytes(16).toString("hex");

  return {
    sku,
    maxAmount,
    expiry,
    nonce,
    cryptographicSignature: computeSignature(sku, maxAmount, expiry, nonce),
  };
}

/**
 * architecture.md §2.1 — validateTransaction(token, invoice).
 * Pure deterministic TypeScript. Zero LLM calls.
 */
export function validateTransaction(
  token: IntentToken,
  invoice: Invoice
): TransactionResult {
  const expectedSignature = computeSignature(
    token.sku,
    token.maxAmount,
    token.expiry,
    token.nonce
  );

  // rules.md §1.6 — Signature Integrity: re-derive SHA-256 server-side.
  if (expectedSignature !== token.cryptographicSignature) {
    return {
      status: "FAILED",
      code: "SIGNATURE_MISMATCH",
      reason:
        "SIGNATURE_MISMATCH: cryptographic signature does not match the re-derived SHA-256 hash. The token was tampered with or minted with a different secret.",
    };
  }

  // rules.md §1.3 — Hard Expiration (TTL).
  if (Date.now() >= token.expiry) {
    return {
      status: "FAILED",
      code: "TOKEN_EXPIRED",
      reason:
        "TOKEN_EXPIRED: this intent token's TTL has elapsed. Expired tokens cannot authorize a transaction.",
    };
  }

  // rules.md §1.5 — SKU Binding.
  if (invoice.sku !== token.sku) {
    return {
      status: "FAILED",
      code: "SKU_MISMATCH",
      reason: `SKU_MISMATCH: token is bound to ${token.sku} but the invoice is for ${invoice.sku}. A token must never authorize a different SKU.`,
    };
  }

  // rules.md §1.2 — Strict Price Ceiling.
  if (invoice.amount > token.maxAmount) {
    return {
      status: "FAILED",
      code: "PRICE_CEILING_EXCEEDED",
      reason: `PRICE_CEILING_EXCEEDED: invoice amount ${invoice.amount} exceeds token maxAmount ${token.maxAmount}.`,
    };
  }

  // rules.md §1.4 — Single-Use Tokens.
  if (spentNonces.has(token.nonce)) {
    return {
      status: "FAILED",
      code: "TOKEN_REPLAY",
      reason:
        "TOKEN_REPLAY: this intent token was already consumed by a successful validateTransaction call and cannot be reused.",
    };
  }

  spentNonces.add(token.nonce);

  return {
    status: "SUCCESS",
    reason: "Transaction authorized within bounded intent. Human approval is still required before funds move.",
  };
}
