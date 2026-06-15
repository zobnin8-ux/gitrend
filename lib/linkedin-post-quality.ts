const LINKEDIN_POST_MIN_WORDS = 200;
const LINKEDIN_POST_MAX_WORDS = 600;

const FORBIDDEN_LINKEDIN_PATTERNS: RegExp[] = [
  /\bai agents are (becoming|growing|getting|the main focus)\b/i,
  /\bthis trend is (becoming )?important\b/i,
  /\bdevelopers are (increasingly )?interested\b/i,
  /\bthe future looks promising\b/i,
  /\bmay change everything\b/i,
  /\bis becoming more popular\b/i,
  /\bis growing rapidly\b/i,
  /\bis becoming the main focus\b/i,
  /\bthis technology is evolving\b/i,
  /\bare becoming (more )?popular\b/i,
  /\bis gaining traction\b/i,
  /\bthe market is shifting toward\b/i,
  /\bthis space is heating up\b/i,
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function checkLinkedInPostQuality(english: string): {
  ok: boolean;
  reason?: string;
  wordCount: number;
} {
  const trimmed = english.trim();
  const wordCount = countWords(trimmed);

  if (!trimmed) {
    return { ok: false, reason: "empty post", wordCount };
  }

  if (wordCount < LINKEDIN_POST_MIN_WORDS) {
    return {
      ok: false,
      reason: `too short (${wordCount} words, need ${LINKEDIN_POST_MIN_WORDS}+)`,
      wordCount,
    };
  }
  if (wordCount > LINKEDIN_POST_MAX_WORDS) {
    return {
      ok: false,
      reason: `too long (${wordCount} words, max ${LINKEDIN_POST_MAX_WORDS})`,
      wordCount,
    };
  }

  for (const pattern of FORBIDDEN_LINKEDIN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        ok: false,
        reason: `forbidden generic phrase: ${pattern.source}`,
        wordCount,
      };
    }
  }

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length < 3) {
    return {
      ok: false,
      reason: "needs at least 3 paragraphs with blank lines",
      wordCount,
    };
  }

  const reasoningMarkers =
    /\b(because|suggests|implies|while|instead|indicates|may lead|shift|orchestrat|infrastructure|workflow|misconception|narrative|second.order|hidden signal|implication)\b/i;
  if (!reasoningMarkers.test(trimmed)) {
    return {
      ok: false,
      reason: "missing interpretation / reasoning markers",
      wordCount,
    };
  }

  if (!/\b[\w.-]+\/[\w.-]+\b/.test(trimmed)) {
    return {
      ok: false,
      reason: "missing concrete repository evidence (owner/repo)",
      wordCount,
    };
  }

  const genericOpeners =
    /^(ai agents|this trend|developers|the future|artificial intelligence|machine learning)\b/i;
  if (genericOpeners.test(paragraphs[0] ?? "")) {
    return {
      ok: false,
      reason: "hook opens with generic category restatement",
      wordCount,
    };
  }

  return { ok: true, wordCount };
}
