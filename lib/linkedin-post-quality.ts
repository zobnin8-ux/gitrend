export interface LinkedInPostValidationContext {
  /** Trend / category titles from the report — post must not read as a summary of these alone */
  categoryLabels?: string[];
  /** insight_of_the_week.title — post should anchor on this angle, not replace it with category growth */
  insightTitle?: string;
  /** Most surprising insight headline — post should revolve around this angle */
  surprisingHeadline?: string;
}

const SURPRISE_FRAMING_MARKERS =
  /\b(surpris(e|ing|ed)|unexpected|not that|instead|rather than|what (stood out|surprised)|interesting signal is not|the (real|actual) signal|shift(ing)? from|no longer|multiple independent|distributed|not concentrated|counter-?intuitive|hidden|overlooked|beneath the surface|less obvious|what most people miss|easy to miss|non-?obvious|under the radar|misread|assumption)\b/i;

const PURE_CATEGORY_GROWTH =
  /\b(are growing rapidly|is growing rapidly|continue(s)? growing|gaining traction|becoming (more )?popular|fastest.?growing category|biggest trend)\b/i;

const LINKEDIN_POST_MIN_WORDS = 200;
const LINKEDIN_POST_MAX_WORDS = 600;

const FORBIDDEN_LINKEDIN_PATTERNS: RegExp[] = [
  /\bai agents are (becoming|growing|getting|the main focus)\b/i,
  /\bbusiness(es)? are (increasingly )?adopt(ing)? ai agents\b/i,
  /\bcompanies should invest\b/i,
  /\borganizations should embrace\b/i,
  /\bai is becoming important\b/i,
  /\bthe future is exciting\b/i,
  /\bthis technology will transform everything\b/i,
  /\bthis trend is (becoming )?important\b/i,
  /\bdevelopers are (increasingly )?interested\b/i,
  /\bthe future looks promising\b/i,
  /\bmay change everything\b/i,
  /\bis becoming more popular\b/i,
  /\bis growing rapidly\b/i,
  /\bare becoming (more )?popular\b/i,
  /\bis gaining traction\b/i,
  /\bthe market is shifting toward\b/i,
  /\bthis space is heating up\b/i,
  /\bbusinesses should (invest|adopt|embrace)\b/i,
  /\bembrace innovation\b/i,
  /\btransform everything\b/i,
];

const INTERPRETATION_MARKERS =
  /\b(not the .{3,40} itself|what matters|may suggest|instead|while most|indicates|implies|suggests|because|hidden signal|narrative shift|second.order|broader implication|distributed|concentrated|infrastructure|orchestrat|misconception|experimentation toward|moving from .{3,30} toward)\b/i;

const UNSUPPORTED_SPECULATION_PATTERNS: RegExp[] = [
  /\bmarket overheating\b/i,
  /\bnew business models?\b/i,
  /\bbusiness transformation\b/i,
  /\bindustry disruption\b/i,
  /\bdisrupt the industry\b/i,
  /\bstimulate competition\b/i,
  /\bcould create new (business|market|revenue)/i,
  /\bmay create new (business|market|revenue)/i,
  /\bmay lead to market overheating\b/i,
  /\btransform the (entire )?industry\b/i,
  /\brevolutionize the (market|industry)\b/i,
];

const EVIDENCE_MARKERS =
  /\b(owner\/|\/[\w.-]+|repositor(y|ies)|concentration|distributed|not concentrated|multiple (independent )?teams|signal strength|confidence|snapshot|reporting period|new entrants|cluster|evidence_repositories|stars|growth pattern|низкая|средняя|высокая)\b/i;

const HEDGED_SPECULATION =
  /\b(could|may|might) (stimulate|create|lead to|transform|disrupt|revolutionize|overheat)\b/i;

const GROWTH_ONLY_MARKERS =
  /\b(are growing|is growing|becoming popular|gaining traction|adopt(ing)? ai|invest in ai|becoming important)\b/i;

function countRepoCitations(text: string): number {
  const matches = text.match(/\b[\w.-]+\/[\w.-]+\b/g);
  return matches ? new Set(matches.map((m) => m.toLowerCase())).size : 0;
}

function hasUnsupportedSpeculation(text: string): string | null {
  for (const pattern of UNSUPPORTED_SPECULATION_PATTERNS) {
    if (pattern.test(text)) {
      return `unsupported speculation not grounded in GitTrend data: ${pattern.source}`;
    }
  }

  if (HEDGED_SPECULATION.test(text) && countRepoCitations(text) < 2) {
    return "speculative prediction (could/may + transform/disrupt/create) without enough repository evidence";
  }

  return null;
}

const REPORT_FORMAT_LABELS =
  /^(observation|evidence|interpretation|implication|broader implication|practical takeaway|what happened|why it matters|key takeaway|part \d+|step \d+)\s*[—:\-]/im;

const REPORT_FORMAT_INLINE =
  /\b(observation|evidence|interpretation|implication|practical takeaway)\s*:\s/i;

function hasReportFormatting(text: string): string | null {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const p of paragraphs) {
    if (REPORT_FORMAT_LABELS.test(p)) {
      return "post exposes internal report section labels — rewrite as natural prose";
    }
  }

  if (REPORT_FORMAT_INLINE.test(text)) {
    return "post contains report-style labels (Observation:, Evidence:, etc.)";
  }

  return null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True if the post could have been written from the category name alone. */
function looksLikeCategorySummary(
  english: string,
  context?: LinkedInPostValidationContext
): string | null {
  const labels = (context?.categoryLabels ?? [])
    .map(normalizeLabel)
    .filter((l) => l.length >= 4);

  const lower = english.toLowerCase();

  for (const label of labels) {
    const escaped = escapeRegExp(label);
    const categoryGrowth = new RegExp(
      `\\b${escaped}\\b[^.\\n]{0,80}\\b(are growing|is growing|becoming (more )?popular|becoming important|gaining traction|businesses are adopting)\\b`,
      "i"
    );
    if (categoryGrowth.test(lower)) {
      return `reads like category summary for "${label}" (growth/adoption without interpretation)`;
    }

    const opensWithCategory = new RegExp(`^[^\\n]{0,120}\\b${escaped}\\b`, "i");
    if (
      opensWithCategory.test(english.trim()) &&
      GROWTH_ONLY_MARKERS.test(lower) &&
      !INTERPRETATION_MARKERS.test(lower.slice(0, 400))
    ) {
      return `opens with category "${label}" and describes growth, not why it matters`;
    }
  }

  if (GROWTH_ONLY_MARKERS.test(lower) && !INTERPRETATION_MARKERS.test(lower)) {
    return "describes growth/adoption without interpretation (why it matters / what it indicates)";
  }

  const insightTitle = context?.insightTitle?.trim();
  if (insightTitle && insightTitle.length >= 8) {
    const insightNorm = normalizeLabel(insightTitle);
    if (
      lower.includes(insightNorm) &&
      GROWTH_ONLY_MARKERS.test(lower) &&
      !INTERPRETATION_MARKERS.test(lower)
    ) {
      return "restates insight title as growth story without analytical angle";
    }
  }

  return null;
}

export function checkLinkedInPostQuality(
  english: string,
  context?: LinkedInPostValidationContext
): {
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
  if (paragraphs.length < 4) {
    return {
      ok: false,
      reason:
        "needs at least 4 paragraphs of natural prose (hook, observation, reasoning, conclusion)",
      wordCount,
    };
  }

  const formattingIssue = hasReportFormatting(trimmed);
  if (formattingIssue) {
    return { ok: false, reason: formattingIssue, wordCount };
  }

  const speculationIssue = hasUnsupportedSpeculation(trimmed);
  if (speculationIssue) {
    return { ok: false, reason: speculationIssue, wordCount };
  }

  const repoCount = countRepoCitations(trimmed);
  const hasEvidenceLanguage = EVIDENCE_MARKERS.test(trimmed);
  if (repoCount < 1 && !hasEvidenceLanguage) {
    return {
      ok: false,
      reason: "missing GitTrend evidence (repository names or concentration/distribution signals from data)",
      wordCount,
    };
  }
  if (repoCount < 2 && !/\b(concentration|distributed|multiple (independent )?(teams|repositories)|new entrants|clustering)\b/i.test(trimmed)) {
    return {
      ok: false,
      reason: "insufficient evidence — cite at least 2 repositories or a clear concentration/distribution finding",
      wordCount,
    };
  }

  const hasEvidence =
    repoCount >= 1 ||
    /\b(multiple (independent )?repositories|across several|distributed growth|not concentrated|more than one project|several repos|concentration|clustering)\b/i.test(
      trimmed
    );
  if (!hasEvidence) {
    return {
      ok: false,
      reason: "missing observable GitTrend evidence woven into the narrative",
      wordCount,
    };
  }

  if (!INTERPRETATION_MARKERS.test(trimmed)) {
    return {
      ok: false,
      reason: "missing interpretation — connect evidence to why the signal matters",
      wordCount,
    };
  }

  const hasSurpriseFraming = SURPRISE_FRAMING_MARKERS.test(trimmed);
  const isPureCategoryGrowth =
    PURE_CATEGORY_GROWTH.test(trimmed) && !hasSurpriseFraming;

  if (isPureCategoryGrowth) {
    return {
      ok: false,
      reason:
        "reads like category growth summary — lead with what surprised us, not what grew",
      wordCount,
    };
  }

  if (!hasSurpriseFraming && GROWTH_ONLY_MARKERS.test(trimmed)) {
    return {
      ok: false,
      reason:
        "describes growth without a surprising angle — answer 'what surprised us?' first",
      wordCount,
    };
  }

  const genericOpeners =
    /^(ai agents|this trend|developers|the future|artificial intelligence|machine learning|businesses are)\b/i;
  if (genericOpeners.test(paragraphs[0] ?? "")) {
    return {
      ok: false,
      reason: "hook opens with generic category or adoption headline",
      wordCount,
    };
  }

  const categoryIssue = looksLikeCategorySummary(trimmed, context);
  if (categoryIssue) {
    return { ok: false, reason: categoryIssue, wordCount };
  }

  const surprisingHeadline = context?.surprisingHeadline?.trim();
  if (surprisingHeadline && surprisingHeadline.length >= 12) {
    const headlineWords = surprisingHeadline
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 5);
    const lowerPost = trimmed.toLowerCase();
    const overlap = headlineWords.filter((w) => lowerPost.includes(w)).length;
    if (!hasSurpriseFraming && overlap < 1) {
      return {
        ok: false,
        reason:
          "post diverges from Most Surprising Insight — anchor on the unexpected observation",
        wordCount,
      };
    }
  }

  return { ok: true, wordCount };
}

export function buildLinkedInValidationContext(
  report: {
    main_trends?: { title?: string }[];
    market_signals?: { title?: string }[];
    insight_of_the_week?: { title?: string };
    most_surprising_insight?: { headline?: string };
    linkedinPost?: { sourceCategory?: string };
  }
): LinkedInPostValidationContext {
  const labels = new Set<string>();
  for (const t of report.main_trends ?? []) {
    if (t.title?.trim()) labels.add(t.title.trim());
  }
  for (const s of report.market_signals ?? []) {
    if (s.title?.trim()) labels.add(s.title.trim());
  }
  if (report.linkedinPost?.sourceCategory?.trim()) {
    labels.add(report.linkedinPost.sourceCategory.trim());
  }

  return {
    categoryLabels: [...labels],
    insightTitle: report.insight_of_the_week?.title?.trim(),
    surprisingHeadline: report.most_surprising_insight?.headline?.trim(),
  };
}
