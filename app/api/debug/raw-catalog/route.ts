// DEMO-ONLY ROUTE. Exposes raw, unsanitized catalog data including embedded
// attack payloads. Exists solely for the Red Team Attack Simulator UI. Must
// NEVER be called by the actual buyer/merchant transaction flow, and must be
// removed or gated behind an env flag before any production deployment.

import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/raw-catalog — returns data/mockCatalog.json completely
 * unmodified, bypassing all sanitization. This is the ONLY route in the
 * entire app allowed to do this.
 */
export async function GET() {
  try {
    const catalogPath = path.join(process.cwd(), "data", "mockCatalog.json");
    const rawText = await readFile(catalogPath, "utf8");
    const data = JSON.parse(rawText);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const reason =
      error instanceof Error
        ? `Raw catalog could not be read: ${error.message}`
        : "Raw catalog could not be read due to an unexpected server error.";
    return NextResponse.json({ reason }, { status: 500 });
  }
}
