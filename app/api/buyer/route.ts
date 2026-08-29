import { NextResponse } from "next/server";
import { z } from "zod";
import {
  TOKEN_TTL_SECONDS,
  generateIntentToken,
} from "@/lib/securityGate";

export const dynamic = "force-dynamic";

const BuyerMintSchema = z.object({
  sku: z.string().min(1, "sku is required"),
  maxAmount: z.number().positive("maxAmount must be a positive number"),
  expiresInSeconds: z
    .number()
    .int("expiresInSeconds must be an integer")
    .positive("expiresInSeconds must be greater than 0"),
});

type ErrorBody = { reason: string };

function jsonError(status: number, reason: string) {
  const body: ErrorBody = { reason };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/buyer — the only minting surface (architecture.md §3).
 * Deterministic. No LLM calls.
 */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const parsed = BuyerMintSchema.safeParse(raw);
  if (!parsed.success) {
    // rules.md §4.2 — Reason Transparency: surface the exact Zod path, never a generic 400.
    const reason = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    return jsonError(400, reason);
  }

  try {
    const { sku, maxAmount, expiresInSeconds } = parsed.data;

    // rules.md §1.3 — Hard Expiration: cap requested TTL at 180s even if the client asks for more.
    const boundedTtl = Math.min(expiresInSeconds, TOKEN_TTL_SECONDS);

    // rules.md §1.1 — No Direct Wallet Access: mint a Bounded Intent Token; never expose a payment key.
    const token = generateIntentToken(sku, maxAmount, boundedTtl);

    return NextResponse.json(token, { status: 200 });
  } catch (error) {
    const reason =
      error instanceof Error
        ? `Token minting failed: ${error.message}`
        : "Token minting failed due to an unexpected server error.";
    return jsonError(500, reason);
  }
}
