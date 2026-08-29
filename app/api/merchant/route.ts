import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeCatalogPayload } from "@/lib/sanitization";

export const dynamic = "force-dynamic";

const CatalogItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  price_inr: z.number(),
  stock_available: z.number(),
  description: z.string(),
});

const CatalogSchema = z.array(CatalogItemSchema);

type ErrorBody = { reason: string };

function jsonError(status: number, reason: string) {
  const body: ErrorBody = { reason };
  return NextResponse.json(body, { status });
}

/**
 * GET /api/merchant — sanitized catalog only (architecture.md §3).
 * Raw mockCatalog.json is never returned to callers.
 */
export async function GET() {
  try {
    const catalogPath = path.join(process.cwd(), "data", "mockCatalog.json");
    const rawText = await readFile(catalogPath, "utf8");

    // rules.md §3.1 — Sanitize Before Context: strip injection patterns before any consumer sees catalog text.
    // rules.md §3.2 — Strip, Don't Trust: regex removal, not a trust/flag pass-through.
    // stripped[] is for the Attack Simulator (later phase) — this route never exposes it.
    const { sanitized } = sanitizeCatalogPayload(rawText);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(sanitized);
    } catch {
      // rules.md §3.4 — Fail Closed: never fall back to the raw catalog if sanitizer output is not valid JSON.
      return jsonError(
        500,
        "Catalog sanitizer produced malformed JSON. Raw catalog was withheld (fail closed)."
      );
    }

    const catalog = CatalogSchema.safeParse(parsedJson);
    if (!catalog.success) {
      // rules.md §3.4 — Fail Closed: exclude an unsanitized/invalid catalog rather than serve it.
      const reason = catalog.error.issues
        .map((issue) => `${issue.path.join(".") || "catalog"}: ${issue.message}`)
        .join("; ");
      return jsonError(
        500,
        `Sanitized catalog failed schema validation and was withheld: ${reason}`
      );
    }

    return NextResponse.json(catalog.data, { status: 200 });
  } catch (error) {
    const reason =
      error instanceof Error
        ? `Merchant catalog could not be read: ${error.message}`
        : "Merchant catalog could not be read due to an unexpected server error.";
    return jsonError(500, reason);
  }
}
