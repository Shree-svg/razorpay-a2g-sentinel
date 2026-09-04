import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { StepSchema } from "@/lib/agentLoop";

// Trim conversation if it grows beyond this to avoid rate limit spikes.
const MAX_PAYLOAD_CHARS = 40_000;

/** Parse the "Please try again in Xs" wait time from a Groq 429 message. */
function parseRetryAfterMs(message: string): number {
  const match = message.match(/try again in ([\d.]+)s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000);
  return 20_000; // default 20s
}

export async function POST(request: Request) {
  const customApiKey = request.headers.get("x-groq-api-key");
  const customModel = request.headers.get("x-llm-model");

  const GROQ_API_KEY = customApiKey || process.env.GROQ_API_KEY;
  const MODEL = customModel || "openai/gpt-oss-120b";

  if (!GROQ_API_KEY) {
    return NextResponse.json({ reason: "Missing GROQ_API_KEY" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ reason: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body?.messages;
  if (!Array.isArray(messages)) {
    return NextResponse.json({ reason: "Request body must contain a 'messages' array" }, { status: 400 });
  }

  const client = new Groq({ apiKey: GROQ_API_KEY });

  // Build a new messages array with a system prompt that enforces JSON output and includes the required keyword.
  const systemPrompt = {
    role: "system" as const,
    content:
      "You are the Buyer Agent's planning module. Respond with ONLY a valid JSON object, no markdown fences, no prose outside the JSON. The JSON must exactly match this shape: { \"thought\": string, \"action\": \"QUERY_CATALOG\" | \"PROPOSE_OFFER\" | \"GENERATE_INTENT\" | \"HALT\", \"payload\": object }. Do not include any text before or after the JSON object. Include the word json in your response.",
  };
  let fullMessages = [systemPrompt, ...messages];

  // If the conversation has grown too large, trim to system prompt + last 4 messages.
  // This prevents Groq 413 errors during multi-retry loops.
  const payloadSize = JSON.stringify(fullMessages).length;
  if (payloadSize > MAX_PAYLOAD_CHARS) {
    const recent = messages.slice(-4);
    fullMessages = [systemPrompt, ...recent];
  }

  const MAX_RETRIES = 3;
  let lastErr: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages: fullMessages,
        response_format: { type: "json_object" } as any,
      });

      const rawContent = completion.choices?.[0]?.message?.content?.trim();
      if (!rawContent) {
        return NextResponse.json({ reason: "Empty response from LLM" }, { status: 502 });
      }

      const parsed = JSON.parse(rawContent);
      const validated = StepSchema.parse(parsed);

      const headers = new Headers();
      if (completion.usage?.total_tokens) {
        headers.set("X-Token-Usage-Total", completion.usage.total_tokens.toString());
      }
      return NextResponse.json(validated, { status: 200, headers });

    } catch (err: any) {
      lastErr = err;

      // 429 Rate limit — wait and retry
      if (err?.status === 429) {
        const waitMs = parseRetryAfterMs(err?.message ?? "");
        console.warn(`[/api/llm] 429 rate limit on attempt ${attempt}/${MAX_RETRIES}. Waiting ${waitMs}ms…`);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }

      // 413 — retry with trimmed messages
      if (err?.status === 413 && attempt < MAX_RETRIES) {
        fullMessages = [systemPrompt, ...messages.slice(-2)];
        console.warn(`[/api/llm] 413 on attempt ${attempt}, retrying with ${fullMessages.length} messages`);
        continue;
      }

      // Any other error — log and break
      console.error("[/api/llm] Groq error:", {
        status: err?.status, message: err?.message,
        payloadSize: JSON.stringify(fullMessages).length,
        messageCount: fullMessages.length,
        attempt,
      });
      break;
    }
  }

  // All retries exhausted
  const isModelNotFound = lastErr?.status === 404 && String(lastErr?.message).includes("model_not_found");
  const is429 = lastErr?.status === 429;
  const reason = is429
    ? "Rate limit reached — please wait ~20 seconds and try again"
    : isModelNotFound
    ? "GROQ MODEL DEPRECATED — check console.groq.com/docs/deprecations and update app/api/llm/route.ts"
    : lastErr?.message ?? "Unexpected error";
  const status = is429 ? 429 : (lastErr?.status ?? 500);
  return NextResponse.json({ reason }, { status });
}
