import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { StepSchema } from "@/lib/agentLoop";

// Allow larger request bodies — multi-turn conversations can grow.
export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

// Groq's token limit means we should never send more than ~60KB of messages.
// If the conversation has grown beyond this (e.g., 3 repair cycles), trim it.
const MAX_PAYLOAD_CHARS = 60_000;

export async function POST(request: Request) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
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

  try {
    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: fullMessages,
      response_format: { type: "json_object" } as any,
    });

    const rawContent = completion.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      return NextResponse.json({ reason: "Empty response from LLM" }, { status: 502 });
    }

    const parsed = JSON.parse(rawContent);
    const validated = StepSchema.parse(parsed);

    return NextResponse.json(validated, { status: 200 });
  } catch (err: any) {
    // Log full error for debugging 413s
    console.error("[/api/llm] Groq error:", {
      status: err?.status,
      message: err?.message,
      error: err?.error,
      payloadSize: JSON.stringify(fullMessages).length,
      messageCount: fullMessages.length,
    });

    // If Groq returns 413 (payload too large), retry with only last 2 messages
    if (err?.status === 413) {
      try {
        const trimmed = [systemPrompt, ...messages.slice(-2)];
        const retryCompletion = await client.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: trimmed,
          response_format: { type: "json_object" } as any,
        });
        const retryContent = retryCompletion.choices?.[0]?.message?.content?.trim();
        if (retryContent) {
          const parsed = JSON.parse(retryContent);
          const validated = StepSchema.parse(parsed);
          return NextResponse.json(validated, { status: 200 });
        }
      } catch (retryErr: any) {
        console.error("[/api/llm] Retry after 413 also failed:", retryErr?.message);
      }
    }

    // Detect Groq model deprecation (404 with model_not_found)
    const isModelNotFound = err?.status === 404 && String(err?.message).includes("model_not_found");
    const reason = isModelNotFound
      ? "GROQ MODEL DEPRECATED — check console.groq.com/docs/deprecations and update app/api/llm/route.ts"
      : err?.message ?? "Unexpected error";
    const status = err?.status ?? 500;
    return NextResponse.json({ reason }, { status });
  }
}
