export type ReasoningLevel = "observation" | "interpretation" | "hypothesis";

export interface LinkedInReasoningMap {
  observations: string[];
  interpretations: string[];
  hypotheses: string[];
}

/** Strong claims GitTrend repository data cannot directly prove. */
const OVERCLAIM_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(is|are)\s+saturated\b/i, label: "saturation stated as fact" },
  { pattern: /\bshowing signs of saturation\b/i, label: "saturation framed as established" },
  { pattern: /\bmarket is (becoming |getting )?(stale|saturated|declining)\b/i, label: "market state overclaim" },
  { pattern: /\b(the )?market is (overheated|cooling|dying)\b/i, label: "market prediction as fact" },
  { pattern: /\bfail(ing|ed|ure) to innovate\b/i, label: "innovation failure as fact" },
  { pattern: /\black(s|ing)? (of )?innovation\b/i, label: "lack of innovation as fact" },
  { pattern: /\bnew (entrants|projects) (are |is )?fail(ing|ed)\b/i, label: "entrant failure as fact" },
  { pattern: /\b(this )?proves\b/i, label: "'proves' — data cannot prove market claims" },
  { pattern: /\bdevelopers are failing\b/i, label: "developer failure as fact" },
  { pattern: /\bcompanies will\b/i, label: "business prediction" },
  { pattern: /\b(business|enterprise) adoption\b/i, label: "business adoption not in GitTrend data" },
  { pattern: /\binvestment trends?\b/i, label: "investment trends not in GitTrend data" },
  { pattern: /\b(is|are) (in )?decline\b/i, label: "decline stated as fact" },
  { pattern: /\becosystem is (collapsing|dying|dead)\b/i, label: "ecosystem death as fact" },
  { pattern: /\bno longer innovat/i, label: "innovation ended as fact" },
  { pattern: /\bhas failed to differentiate\b/i, label: "differentiation failure as fact" },
];

const HEDGE_MARKERS =
  /\b(may|might|could|appears?|seems?|suggests?|possibly|perhaps|one possible|worth watching|raises? (a |the )?question|does not prove|don't prove|cannot prove|not prove|if that continues|it is worth asking|we cannot|unclear whether)\b/i;

const QUESTION_MARKERS = /\?|^(is|are|could|might|will|what if)\b/i;

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
}

function sentenceHasHedge(sentence: string): boolean {
  return HEDGE_MARKERS.test(sentence);
}

function sentenceIsQuestion(sentence: string): boolean {
  return sentence.includes("?") || QUESTION_MARKERS.test(sentence);
}

/**
 * Reject posts that state hypotheses as facts or claim what GitTrend cannot prove.
 */
export function checkLinkedInReasoningSafety(english: string): {
  ok: boolean;
  reason?: string;
} {
  const trimmed = english.trim();
  if (!trimmed) return { ok: false, reason: "empty post" };

  for (const { pattern, label } of OVERCLAIM_PATTERNS) {
    if (!pattern.test(trimmed)) continue;

    const offending = sentences(trimmed).find((s) => pattern.test(s));
    if (!offending) continue;

    if (/\b(does not prove|don't prove|cannot prove|not prove)\b/i.test(offending)) {
      continue;
    }

    if (sentenceHasHedge(offending) || sentenceIsQuestion(offending)) {
      continue;
    }

    return {
      ok: false,
      reason: `overclaim — ${label}. Soften with may/could/appears or frame as a question.`,
    };
  }

  const categoricalMarket = sentences(trimmed).find(
    (s) =>
      /\bthe market is\b/i.test(s) &&
      !sentenceHasHedge(s) &&
      !sentenceIsQuestion(s) &&
      !/\bnot\b/i.test(s)
  );
  if (categoricalMarket) {
    return {
      ok: false,
      reason:
        "states 'the market is…' as fact — GitTrend shows repository signals, not market truth",
    };
  }

  const provesClaims = sentences(trimmed).filter(
    (s) =>
      /\b(proves|demonstrates that|confirms that)\b/i.test(s) &&
      !/\b(does not|cannot|don't)\b/i.test(s) &&
      !sentenceHasHedge(s)
  );
  if (provesClaims.length > 0) {
    return {
      ok: false,
      reason: "uses proof language for conclusions GitTrend cannot verify",
    };
  }

  return { ok: true };
}

export function emptyReasoningMap(): LinkedInReasoningMap {
  return { observations: [], interpretations: [], hypotheses: [] };
}

export function normalizeReasoningMap(
  raw: Partial<LinkedInReasoningMap> | undefined,
  fallback?: { observation?: string; interpretation?: string; broader?: string }
): LinkedInReasoningMap {
  const observations = Array.isArray(raw?.observations)
    ? raw!.observations.map((s) => s.trim()).filter(Boolean)
    : [];
  const interpretations = Array.isArray(raw?.interpretations)
    ? raw!.interpretations.map((s) => s.trim()).filter(Boolean)
    : [];
  const hypotheses = Array.isArray(raw?.hypotheses)
    ? raw!.hypotheses.map((s) => s.trim()).filter(Boolean)
    : [];

  if (observations.length === 0 && fallback?.observation) {
    observations.push(fallback.observation);
  }
  if (interpretations.length === 0 && fallback?.interpretation) {
    interpretations.push(fallback.interpretation);
  }
  if (hypotheses.length === 0 && fallback?.broader) {
    hypotheses.push(fallback.broader);
  }

  return { observations, interpretations, hypotheses };
}

export const REASONING_MAP_INSTRUCTIONS = `Before writing prose, classify claims into a reasoning_map (internal only — never expose labels in the post):

{
  "reasoning_map": {
    "observations": ["facts directly supported by GitTrend data — repo growth, concentration, category comparison"],
    "interpretations": ["careful readings — MUST be phrased with may/could/appears/suggests when used in post"],
    "hypotheses": ["open possibilities — MUST be questions or 'one possible explanation' in the post, never facts"]
  }
}

Rules:
- observations: cite what the data shows (repo names, growth contrast, concentration)
- interpretations: reasonable reading, cautious language only
- hypotheses: unproven explanations — questions welcome
- NEVER put market saturation, lack of innovation, business adoption, or investment trends in observations unless explicitly in evidence_brief
- If unsure, downgrade: observation → interpretation → hypothesis`;

export const LINKEDIN_REASONING_PROSE_RULES = `REASONING SAFETY (mandatory):
- observations → may be stated directly, tied to GitTrend evidence
- interpretations → use may, could, appears, suggests, may indicate
- hypotheses → open questions or "one possible explanation is…" / "worth watching whether…"
- NEVER state hypotheses as facts
- NEVER claim: market saturation, lack of innovation, failed differentiation, future decline, business adoption, investment trends — unless hedged as a question or possibility
- Prefer: strong observation → careful interpretation → open question
- Example rhythm: "AI Agent repos showed stronger momentum… That does not prove automation is declining. But it raises a question: …"`;
