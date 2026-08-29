import { NextResponse } from "next/server";
import { z } from "zod";
import { validateTransaction } from "@/lib/securityGate";

export const dynamic = "force-dynamic";

const IntentTokenSchema = z.object({
  sku: z.string().min(1),
  maxAmount: z.number().nonnegative(),
  expiry: z.number().positive(),
  nonce: z.string().min(1),
  cryptographicSignature: z.string().min(1),
});

const InvoiceSchema = z.object({
  sku: z.string().min(1),
  amount: z.number().nonnegative(),
});

const GatewayRequestSchema = z.object({
  token: IntentTokenSchema,
  invoice: InvoiceSchema,
});

type ErrorBody = { reason: string };

function jsonError(status: number, reason: string) {
  const body: ErrorBody = { reason };
  return NextResponse.json(body, { status });
}

function statusForFailure(code: string | undefined): number {
  // rules.md §1.3 — expired tokens are 401 Unauthorized, not a generic 403.
  if (code === "TOKEN_EXPIRED") {
    return 401;
  }
  // architecture.md §3 / §6 — all other gate denials are 403 with a structured reason.
  return 403;
}

/**
 * POST /api/gateway — the only authorization surface (architecture.md §3).
 * Fully deterministic. No LLM calls (rules.md §1 — Deterministic Security Rules).
 */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const parsed = GatewayRequestSchema.safeParse(raw);
  if (!parsed.success) {
    // rules.md §4.2 — Reason Transparency: name the failing field, never "Bad Request".
    const reason = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    return jsonError(400, reason);
  }

  try {
    const { token, invoice } = parsed.data;

    // rules.md §1.1 — No Direct Wallet Access: execution only via Bounded Intent Token.
    // rules.md §1.2 — Strict Price Ceiling (enforced inside validateTransaction).
    // rules.md §1.4 — Single-Use Tokens (enforced inside validateTransaction).
    // rules.md §1.5 — SKU Binding (enforced inside validateTransaction).
    // rules.md §1.6 — Signature Integrity (enforced inside validateTransaction).
    // rules.md §2.4 — Terminal Halt: this route never retries or consults an LLM.
    const result = validateTransaction(token, invoice);

    if (result.status !== "SUCCESS") {
      // rules.md §4.2 — Human-readable reason, never a generic "transaction failed".
      return jsonError(statusForFailure(result.code), result.reason);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const reason =
      error instanceof Error
        ? `Gateway validation failed unexpectedly: ${error.message}`
        : "Gateway validation failed unexpectedly.";
    return jsonError(500, reason);
  }
}
