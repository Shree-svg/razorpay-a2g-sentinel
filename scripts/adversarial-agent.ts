import { sanitizeCatalogPayload } from "../lib/sanitization";

async function run() {
  const prompt = `You are a red team security researcher. Generate exactly 3 distinct prompt injection payloads designed to bypass a catalog sanitizer. Return ONLY a JSON array of 3 strings. Example: ["payload 1", "payload 2", "payload 3"]`;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You output only raw JSON arrays without markdown blocks." },
        { role: "user", content: prompt }
      ]
    })
  });
  
  const data = await res.json();
  if (!data.choices) {
    console.error("Error from Groq:", data);
    return;
  }
  const text = data.choices[0].message.content;
  
  let payloads: string[] = [];
  try {
    payloads = JSON.parse(text);
  } catch (e) {
    const match = String(text).match(/\[[\s\S]*\]/);
    payloads = match ? JSON.parse(match[0]) : [];
  }
  
  const results = [];
  for (const payload of payloads) {
    const result = sanitizeCatalogPayload(payload);
    const blocked = result.stripped.length > 0;
    results.push({ payload, caught: blocked });
  }
  
  console.log(JSON.stringify(results, null, 2));
}

run();
