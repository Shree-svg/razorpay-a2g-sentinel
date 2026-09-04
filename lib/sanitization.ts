/**
 * Strips known prompt-injection and catalog-poisoning patterns before
 * merchant inventory is placed in an LLM context window.
 */

export interface SanitizeResult {
  sanitized: string;
  stripped: string[];
}

const INJECTION_PATTERNS: readonly RegExp[] = [
  // Bracketed jailbreaks: [System:], [System Instruction:], [Instruction:], [Ignore:], [Override:], any wording after.
  /\[\s*(?:System|Instruction|Ignore|Override)\b[^\]]*\]/gi,
  /\{\s*Instruction\s*:[\s\S]*?\}/gi,
  /ignore\s+previous\s+instructions/gi,
  /100%\s*discount/gi,
];

const HOMOGLYPH_MAP: Record<string, string> = {
  "Ѕ": "S", "ѕ": "s",
  "у": "y", "У": "Y",
  "е": "e", "Е": "E",
  "о": "o", "О": "O",
  "а": "a", "А": "A",
  "р": "p", "Р": "P",
  "с": "c", "С": "C",
  "і": "i", "І": "I"
};

export function sanitizeCatalogPayload(rawText: string): SanitizeResult {
  const stripped: string[] = [];
  let sanitized = rawText;

  // Task A: Unicode Homoglyph Normalization
  for (const [cyrillic, latin] of Object.entries(HOMOGLYPH_MAP)) {
    sanitized = sanitized.replace(new RegExp(cyrillic, "g"), latin);
  }

  // Task B: Base64 Decoding and Sanitization
  const BASE64_PATTERN = /[A-Za-z0-9+/]{20,}={0,2}/g;
  sanitized = sanitized.replace(BASE64_PATTERN, (match) => {
    try {
      const decoded = Buffer.from(match, 'base64').toString('utf8');
      // Simple heuristic: if decoded string has printable ascii characters
      // and matches any injection pattern, consider it malicious.
      // But wait, Buffer.from doesn't throw if it's just random alphanumeric,
      // it just decodes to gibberish. We should test if it matches INJECTION_PATTERNS.
      for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(decoded)) {
          // It's a base64 encoded injection.
          // Reset the regex state (since we use /g flag)
          pattern.lastIndex = 0;
          stripped.push(decoded);
          return "";
        }
        pattern.lastIndex = 0;
      }
    } catch (e) {
      // Ignore invalid base64
    }
    return match;
  });

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      stripped.push(match);
      return "";
    });
  }

  sanitized = sanitized
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { sanitized, stripped };
}
