import { z } from "zod";
import { TOKEN_TTL_SECONDS } from "@/lib/securityGate";

/** rules.md §2.2 — Schema Enforcement. payload is an object, not z.any(). */
export const StepSchema = z.object({
  thought: z.string(),
  action: z.enum([
    "QUERY_CATALOG",
    "PROPOSE_OFFER",
    "GENERATE_INTENT",
    "HALT",
  ]),
  payload: z.object({}).passthrough(),
});

export type Step = z.infer<typeof StepSchema>;
export type AgentAction = Step;
export type AgentActionName = Step["action"];

/** @deprecated Use StepSchema. */
export const AgentActionSchema = StepSchema;

export type LlmRole = "system" | "user" | "assistant";

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

/**
 * HTTP envelope so Act/Verify can see 401/403 vs 200.
 * Tool adapters wrapping fetch should return this shape.
 */
export interface HttpEnvelope {
  httpStatus: number;
  body: unknown;
}

export interface AgentTools {
  invokeLlm: (messages: LlmMessage[]) => Promise<unknown>;
  fetchCatalog: () => Promise<unknown>;
  mintIntent: (
    sku: string,
    maxAmount: number,
    expiresInSeconds: number
  ) => Promise<unknown>;
  validateWithGateway: (token: unknown, invoice: unknown) => Promise<unknown>;
}

export type AgentLoopEvent =
  | { kind: "observe"; catalog: unknown }
  | { kind: "plan"; attempt: number; step: Step }
  | { kind: "act"; action: AgentActionName; detail: unknown }
  | { kind: "verify"; ok: boolean; detail: unknown }
  | {
      kind: "retry";
      attempt: number;
      error: string;
      cause: "schema" | "business";
    };

export type AgentLoopResult =
  | { status: "SUCCESS"; steps: Step[]; result: unknown }
  | { status: "HALTED_FAILED_VALIDATION"; steps: Step[]; lastError: string }
  | { status: "HALTED_MAX_RETRIES"; steps: Step[]; lastError: string }
  | { status: "HALTED_TERMINAL_SECURITY"; steps: Step[]; reason: string };

export const HALTED_FAILED_VALIDATION = "HALTED_FAILED_VALIDATION" as const;
export const HALTED_MAX_RETRIES = "HALTED_MAX_RETRIES" as const;
export const HALTED_TERMINAL_SECURITY = "HALTED_TERMINAL_SECURITY" as const;

/**
 * Consecutive-failure cap (unchanged). Two independent counters:
 *   schemaFails  → HALTED_FAILED_VALIDATION
 *   businessFails → HALTED_MAX_RETRIES
 */
const MAX_ATTEMPTS = 3;

/** Safety bound so a well-formed QUERY_CATALOG loop cannot run forever. */
const MAX_CYCLES = 12;

const MintPayloadSchema = z.object({
  sku: z.string().min(1),
  maxAmount: z.number().positive(),
  expiresInSeconds: z.number().int().positive().optional(),
});

const InvoiceSchema = z.object({
  sku: z.string().min(1),
  amount: z.number().nonnegative(),
});

const IntentTokenSchema = z.object({
  sku: z.string().min(1),
  maxAmount: z.number().nonnegative(),
  expiry: z.number().positive(),
  nonce: z.string().min(1),
  cryptographicSignature: z.string().min(1),
});

const ReasonBodySchema = z.object({
  reason: z.string(),
});

const GatewaySuccessSchema = z.object({
  status: z.literal("SUCCESS"),
  reason: z.string(),
});

const CatalogSchema = z.array(z.record(z.unknown()));

/**
 * rules.md §2.4 — these gateway reasons are TERMINAL.
 * Do not retry. Do not increment businessFails.
 * PRICE_CEILING is terminal here even though architecture.md §6 allows re-planning;
 * rules.md §2.4 is the stricter, binding rule.
 */
const TERMINAL_REASON_MARKERS = [
  "TOKEN_EXPIRED",
  "SIGNATURE_MISMATCH",
  "PRICE_CEILING_EXCEEDED",
] as const;

const SCHEMA_REPAIR_PROMPT = [
  "Your previous response failed validation and cannot be executed.",
  "Return a single JSON object with exactly these keys:",
  '{ "thought": string, "action": "QUERY_CATALOG" | "PROPOSE_OFFER" | "GENERATE_INTENT" | "HALT", "payload": object }',
  "Do not wrap the object in markdown fences. Do not include commentary outside the JSON.",
].join(" ");

const SYSTEM_PROMPT = [
  "You are the Buyer Agent in Project B.I.T. (Bounded Intent Tokens).",
  "Follow Observe → Plan → Act → Verify. You only propose actions; you never move funds.",
  "Purchase sequence: QUERY_CATALOG (if needed) → GENERATE_INTENT {sku, maxAmount, expiresInSeconds} → PROPOSE_OFFER {sku, amount} as the invoice.",
  "Respond with a single JSON object matching:",
  '{ "thought": string, "action": "QUERY_CATALOG" | "PROPOSE_OFFER" | "GENERATE_INTENT" | "HALT", "payload": object }',
].join(" ");

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

function validationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return formatZodError(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown validation failure.";
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();

  if (candidate.startsWith("{") && candidate.endsWith("}")) {
    return candidate;
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("No JSON object found in model response.");
  }

  return candidate.slice(start, end + 1);
}

function parseStep(raw: unknown): Step {
  if (typeof raw === "object" && raw !== null) {
    return StepSchema.parse(raw);
  }

  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonObject(text));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse error.";
    throw new Error(`JSON parse failed: ${message}`);
  }

  return StepSchema.parse(parsed);
}

function asEnvelope(raw: unknown): HttpEnvelope {
  if (
    raw !== null &&
    typeof raw === "object" &&
    "httpStatus" in raw &&
    "body" in raw
  ) {
    const httpStatus = Number((raw as HttpEnvelope).httpStatus);
    return {
      httpStatus: Number.isFinite(httpStatus) ? httpStatus : 500,
      body: (raw as HttpEnvelope).body,
    };
  }
  return { httpStatus: 200, body: raw };
}

function reasonFromBody(body: unknown): string {
  const parsed = ReasonBodySchema.safeParse(body);
  if (parsed.success) {
    return parsed.data.reason;
  }
  return "Gateway or tool returned a failure without a reason string.";
}

function isTerminalSecurityReason(reason: string): boolean {
  const upper = reason.toUpperCase();
  return TERMINAL_REASON_MARKERS.some((marker) => upper.includes(marker));
}

function extractInvoice(
  payload: Record<string, unknown>
): z.infer<typeof InvoiceSchema> | null {
  const nested = InvoiceSchema.safeParse(payload.invoice);
  if (nested.success) {
    return nested.data;
  }
  const flat = InvoiceSchema.safeParse(payload);
  return flat.success ? flat.data : null;
}

type CycleDecision =
  | { type: "continue"; observation: string }
  | { type: "success"; result: unknown }
  | { type: "halt_agent"; result: unknown }
  | { type: "retry_business"; error: string }
  | { type: "terminal"; reason: string };

async function actAndVerify(
  step: Step,
  tools: AgentTools,
  mintedToken: unknown,
  onStep?: (event: AgentLoopEvent) => void
): Promise<{ decision: CycleDecision; mintedToken: unknown }> {
  switch (step.action) {
    case "QUERY_CATALOG": {
      onStep?.({ kind: "act", action: step.action, detail: "fetchCatalog" });
      const rawCatalog = await tools.fetchCatalog();
      const verified = CatalogSchema.safeParse(rawCatalog);
      if (!verified.success) {
        const error = `Catalog failed Verify schema: ${formatZodError(verified.error)}`;
        onStep?.({ kind: "verify", ok: false, detail: error });
        return {
          decision: { type: "retry_business", error },
          mintedToken,
        };
      }
      // Re-use the same keyword filter to keep this message lean too.
      // The goal string is not directly available here, so we pass the full
      // verified array — filterCatalogForGoal is called by the caller with goal.
      // For QUERY_CATALOG we cap at 30 items to avoid 413.
      const filteredQC = verified.data.slice(0, 30);
      onStep?.({ kind: "verify", ok: true, detail: { itemCount: verified.data.length, sending: filteredQC.length } });
      return {
        decision: {
          type: "continue",
          observation: `VERIFY QUERY_CATALOG — sanitized catalog JSON (${filteredQC.length} of ${verified.data.length} SKUs):\n${JSON.stringify(filteredQC)}`,
        },
        mintedToken,
      };
    }

    case "GENERATE_INTENT": {
      const payload = MintPayloadSchema.safeParse(step.payload);
      if (!payload.success) {
        const error = `GENERATE_INTENT payload failed Verify: ${formatZodError(payload.error)}. payload must include sku and maxAmount.`;
        onStep?.({ kind: "act", action: step.action, detail: error });
        onStep?.({ kind: "verify", ok: false, detail: error });
        return { decision: { type: "retry_business", error }, mintedToken };
      }

      const expiresInSeconds =
        payload.data.expiresInSeconds ?? TOKEN_TTL_SECONDS;
      onStep?.({
        kind: "act",
        action: step.action,
        detail: {
          sku: payload.data.sku,
          maxAmount: payload.data.maxAmount,
          expiresInSeconds,
        },
      });

      const envelope = asEnvelope(
        await tools.mintIntent(
          payload.data.sku,
          payload.data.maxAmount,
          expiresInSeconds
        )
      );

      if (envelope.httpStatus >= 400) {
        const error = reasonFromBody(envelope.body);
        onStep?.({ kind: "verify", ok: false, detail: error });
        return { decision: { type: "retry_business", error }, mintedToken };
      }

      const token = IntentTokenSchema.safeParse(envelope.body);
      if (!token.success) {
        const error = `Mint response failed Verify schema: ${formatZodError(token.error)}`;
        onStep?.({ kind: "verify", ok: false, detail: error });
        return { decision: { type: "retry_business", error }, mintedToken };
      }

      onStep?.({ kind: "verify", ok: true, detail: token.data });
      return {
        decision: {
          type: "continue",
          observation: `VERIFY GENERATE_INTENT — minted token JSON:\n${JSON.stringify(token.data)}`,
        },
        mintedToken: token.data,
      };
    }

    case "PROPOSE_OFFER": {
      const invoice = extractInvoice(step.payload);
      if (!invoice) {
        const error =
          "PROPOSE_OFFER payload failed Verify: need {sku, amount} or {invoice: {sku, amount}}.";
        onStep?.({ kind: "act", action: step.action, detail: error });
        onStep?.({ kind: "verify", ok: false, detail: error });
        return { decision: { type: "retry_business", error }, mintedToken };
      }

      if (!mintedToken) {
        const error =
          "PROPOSE_OFFER Act skipped: no Bounded Intent Token yet. Call GENERATE_INTENT first.";
        onStep?.({ kind: "act", action: step.action, detail: error });
        onStep?.({ kind: "verify", ok: false, detail: error });
        return { decision: { type: "retry_business", error }, mintedToken };
      }

      onStep?.({
        kind: "act",
        action: step.action,
        detail: { token: mintedToken, invoice },
      });

      const envelope = asEnvelope(
        await tools.validateWithGateway(mintedToken, invoice)
      );
      const reason = reasonFromBody(envelope.body);
      const bodyStatus =
        envelope.body !== null &&
        typeof envelope.body === "object" &&
        "status" in envelope.body
          ? String((envelope.body as { status: unknown }).status)
          : "";

      // rules.md §2.4 — check the reason string even if the adapter forgot httpStatus.
      if (isTerminalSecurityReason(reason) || envelope.httpStatus === 401) {
        const terminalReason =
          envelope.httpStatus === 401 && !isTerminalSecurityReason(reason)
            ? `TOKEN_EXPIRED: ${reason}`
            : reason;
        onStep?.({ kind: "verify", ok: false, detail: terminalReason });
        return {
          decision: { type: "terminal", reason: terminalReason },
          mintedToken,
        };
      }

      if (envelope.httpStatus >= 400 || bodyStatus === "FAILED") {
        onStep?.({ kind: "verify", ok: false, detail: reason });
        return {
          decision: { type: "retry_business", error: reason },
          mintedToken,
        };
      }

      const success = GatewaySuccessSchema.safeParse(envelope.body);
      if (!success.success) {
        const error = `Gateway 200 body failed Verify schema: ${formatZodError(success.error)}`;
        onStep?.({ kind: "verify", ok: false, detail: error });
        return { decision: { type: "retry_business", error }, mintedToken };
      }

      onStep?.({ kind: "verify", ok: true, detail: success.data });
      return {
        decision: {
          type: "success",
          result: {
            token: mintedToken,
            invoice,
            gateway: success.data,
            awaitingHumanApproval: true,
          },
        },
        mintedToken,
      };
    }

    case "HALT": {
      onStep?.({ kind: "act", action: step.action, detail: step.payload });
      onStep?.({ kind: "verify", ok: true, detail: "Agent requested HALT." });
      return {
        decision: {
          type: "halt_agent",
          result: { action: "HALT", payload: step.payload },
        },
        mintedToken,
      };
    }
  }
}

/**
 * Scores a catalog item against the user's goal.
 * Returns items with the highest keyword overlap, capped at `limit`.
 * This keeps LLM context lean even with 1000+ SKU catalogs.
 */
function filterCatalogForGoal(
  catalog: Record<string, unknown>[],
  goal: string,
  limit = 30
): Record<string, unknown>[] {
  // Tokenise the goal into lowercase words, stripping stop-words and numbers
  const stopWords = new Set([
    "buy", "get", "find", "purchase", "order", "me", "a", "an", "the",
    "under", "below", "within", "for", "less", "than", "rupees", "inr",
    "rs", "₹", "of", "and", "or", "with", "at", "in", "to", "i", "want",
  ]);
  const keywords = goal
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w) && isNaN(Number(w)));

  if (keywords.length === 0) {
    return catalog.slice(0, limit);
  }

  const scored = catalog.map((item) => {
    const haystack = [
      String(item.name ?? ""),
      String(item.description ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    const score = keywords.reduce(
      (acc, kw) => acc + (haystack.includes(kw) ? 1 : 0),
      0
    );
    return { item, score };
  });

  // Sort by score desc, then return top `limit`; always include score>0 items first
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Observe → Plan → Act → Verify until a purchase is gateway-authorized
 * (still awaiting human approval — rules.md §4.1) or a halt status fires.
 *
 * Outcome sequences (for tests / BuyerAgentPanel):
 *
 * SUCCESS
 *   LLM: valid GENERATE_INTENT {sku: SKU_001, maxAmount: 29990}
 *     → mintIntent 200 → valid PROPOSE_OFFER {sku: SKU_001, amount: 29990}
 *     → validateWithGateway 200 SUCCESS.
 *
 * HALTED_FAILED_VALIDATION
 *   LLM returns non-JSON or a Step missing `action` three times in a row
 *   (schemaFails hits MAX_ATTEMPTS). No Act is executed on those turns.
 *
 * HALTED_MAX_RETRIES
 *   Plans are well-formed and Acted on, but Verify keeps failing retryably:
 *   e.g. GENERATE_INTENT succeeds, then three consecutive PROPOSE_OFFER
 *   invoices with the wrong sku → gateway 403 SKU_MISMATCH (not a §2.4 code).
 *
 * HALTED_TERMINAL_SECURITY
 *   First well-formed PROPOSE_OFFER whose gateway reason contains
 *   TOKEN_EXPIRED, SIGNATURE_MISMATCH, or PRICE_CEILING_EXCEEDED
 *   (or HTTP 401). Returned immediately; businessFails is not incremented.
 */
export async function runAgentLoop(
  goal: string,
  tools: AgentTools,
  onStep?: (event: AgentLoopEvent) => void
): Promise<AgentLoopResult> {
  const steps: Step[] = [];
  const conversation: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  const fullCatalog = await tools.fetchCatalog();
  // Filter to top 30 most relevant items so the LLM prompt stays within token limits.
  // With 1000+ SKUs the raw catalog would exceed Groq's context window (413 Too Large).
  const catalogArray = CatalogSchema.safeParse(fullCatalog).success
    ? (fullCatalog as Record<string, unknown>[])
    : [];
  const catalog = filterCatalogForGoal(catalogArray, goal, 30);
  onStep?.({ kind: "observe", catalog });
  conversation.push({
    role: "user",
    content: `OBSERVE — sanitized catalog JSON (${catalog.length} most relevant of ${catalogArray.length} total SKUs):\n${JSON.stringify(catalog)}`,
  });
  conversation.push({
    role: "user",
    content: `User goal: ${goal}`,
  });

  let mintedToken: unknown = null;
  let schemaFails = 0;
  let businessFails = 0;
  let lastSchemaError = "Unknown validation failure.";
  let lastBusinessError = "Unknown business verification failure.";

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    const raw = await tools.invokeLlm(conversation);

    let step: Step;
    try {
      step = parseStep(raw);
    } catch (error) {
      schemaFails += 1;
      lastSchemaError = validationMessage(error);
      onStep?.({
        kind: "retry",
        attempt: schemaFails,
        error: lastSchemaError,
        cause: "schema",
      });
      conversation.push({
        role: "assistant",
        content: typeof raw === "string" ? raw : JSON.stringify(raw),
      });
      conversation.push({
        role: "user",
        content: `${SCHEMA_REPAIR_PROMPT} Validation error: ${lastSchemaError}`,
      });

      if (schemaFails >= MAX_ATTEMPTS) {
        return {
          status: "HALTED_FAILED_VALIDATION",
          steps,
          lastError: lastSchemaError,
        };
      }
      continue;
    }

    schemaFails = 0;
    steps.push(step);
    onStep?.({ kind: "plan", attempt: cycle, step });
    conversation.push({
      role: "assistant",
      content: JSON.stringify(step),
    });

    const { decision, mintedToken: nextToken } = await actAndVerify(
      step,
      tools,
      mintedToken,
      onStep
    );
    mintedToken = nextToken;

    if (decision.type === "continue") {
      businessFails = 0;
      conversation.push({ role: "user", content: decision.observation });
      continue;
    }

    if (decision.type === "success") {
      return { status: "SUCCESS", steps, result: decision.result };
    }

    if (decision.type === "halt_agent") {
      return { status: "SUCCESS", steps, result: decision.result };
    }

    if (decision.type === "terminal") {
      return {
        status: "HALTED_TERMINAL_SECURITY",
        steps,
        reason: decision.reason,
      };
    }

    businessFails += 1;
    lastBusinessError = decision.error;
    onStep?.({
      kind: "retry",
      attempt: businessFails,
      error: lastBusinessError,
      cause: "business",
    });
    conversation.push({
      role: "user",
      content: `VERIFY failed (retryable): ${lastBusinessError}. Propose a corrected action. Do not retry expired tokens, signature mismatches, or price-ceiling breaches — those are terminal.`,
    });

    if (businessFails >= MAX_ATTEMPTS) {
      return {
        status: "HALTED_MAX_RETRIES",
        steps,
        lastError: lastBusinessError,
      };
    }
  }

  return {
    status: "HALTED_MAX_RETRIES",
    steps,
    lastError: lastBusinessError,
  };
}
