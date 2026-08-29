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

export function sanitizeCatalogPayload(rawText: string): SanitizeResult {
  const stripped: string[] = [];
  let sanitized = rawText;

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
