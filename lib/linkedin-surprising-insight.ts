import type { MostSurprisingInsight, TrendInsights } from "./types";
import { buildLinkedInEvidenceBrief } from "./linkedin-post-evidence";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 90_000;

export const SURPRISING_INSIGHT_DETECTION_PROMPT = `You detect the Most Surprising Insight of the Week from GitTrend GitHub intelligence.

This is NOT "strongest trend" or "fastest growth". It is the most UNEXPECTED observation hidden in the data.

Evaluate these dimensions (evidence_brief + report sections):

1. GROWTH CONCENTRATION — one repo vs distributed across many? Distributed is often more surprising.
2. CONVERGENCE — multiple independent teams solving the same problem? Ecosystem formation signal.
3. CATEGORY BEHAVIOR — growth from existing leaders vs new entrants? Different dynamics.
4. ACCELERATION — accelerating, stable, or fading?
5. ATTENTION MISMATCH — GitHub activity vs expected public attention (hidden_signals, possible_hype, narrative_shifts).
6. UNEXPECTED WINNERS — repos/categories that behaved differently than expected (fastest_growing_projects, unexpectedly_accelerated_topics, market_misconceptions).

Generate 4–6 candidate insights. Each must be:
- Unexpected (not "X category is growing" or "most stars")
- Supported by specific repos/patterns in the data
- More interesting than naming the category alone

Score each candidate:
surprise_score = unexpectedness + evidence_strength + novelty + discussion_potential (each 0–25, total 0–100)

Select the highest-scoring insight.

FORBIDDEN as primary insight:
- "Category X is growing rapidly"
- "Repository Y got the most stars"
- Generic adoption/hype without a non-obvious angle

GOOD surprising insights (patterns):
- Growth distributed rather than concentrated
- Multiple independent teams building the same thing
- Small repos outperforming established leaders
- Category growing despite low media attention
- Dominant category slowing while new entrants appear
- Shift from experimentation to tooling/infrastructure

Return only valid JSON:
{
  "candidates": [
    {
      "headline": "one sentence — the surprising observation",
      "explanation": "1–3 short paragraphs in Russian explaining the insight with evidence",
      "why_surprising": "1 sentence — why this is non-obvious",
      "evidence_repositories": ["owner/repo"],
      "dimensions": ["concentration", "convergence", "category_behavior", "acceleration", "attention_mismatch", "unexpected_winners"],
      "surprise_score": 0,
      "evidence_summary": "brief cite of data supporting this"
    }
  ],
  "selected": {
    "headline": "same as winning candidate",
    "explanation": "1–3 paragraphs Russian — clear, readable block for UI",
    "why_surprising": "why non-obvious",
    "evidence_repositories": ["owner/repo"],
    "dimensions": ["..."],
    "surprise_score": 0
  }
}`;

export function buildSurprisingInsightContext(
  report: TrendInsights,
  analyzedRepositories: number
): Record<string, unknown> {
  const evidence = buildLinkedInEvidenceBrief(report, analyzedRepositories);

  return {
    evidence_brief: evidence,
    report_sections: {
      insight_of_the_week: report.insight_of_the_week,
      narrative_shifts: report.narrative_shifts ?? [],
      hidden_signals: report.hidden_signals ?? [],
      market_misconceptions: report.market_misconceptions ?? [],
      fastest_growing_projects: (report.fastest_growing_projects ?? []).slice(0, 10),
      emerging_signals: report.emerging_signals ?? [],
      controversial_takes: (report.controversial_takes ?? []).slice(0, 5),
      main_trends: (report.main_trends ?? []).map((t) => ({
        title: t.title,
        confidence: t.confidence,
        repository_count: t.evidence_repositories?.length ?? 0,
        repositories: (t.evidence_repositories ?? []).slice(0, 6),
      })),
    },
    detection_rules: [
      "Prefer unexpected patterns over obvious growth headlines.",
      "Rank by surprise_score = unexpectedness + evidence_strength + novelty + discussion_potential.",
      "Every candidate must cite owner/repo names or concentration/distribution findings.",
      "Do NOT pick 'biggest category' or 'most stars' unless the surprise is HOW they grew.",
    ],
  };
}

export function normalizeMostSurprisingInsight(
  raw: Partial<MostSurprisingInsight> | undefined
): MostSurprisingInsight {
  return {
    headline: raw?.headline?.trim() ?? "",
    explanation: raw?.explanation?.trim() ?? "",
    why_surprising: raw?.why_surprising?.trim() ?? "",
    evidence_repositories: Array.isArray(raw?.evidence_repositories)
      ? raw.evidence_repositories.filter(Boolean)
      : [],
    dimensions: Array.isArray(raw?.dimensions)
      ? raw.dimensions.filter(Boolean)
      : [],
    surprise_score:
      typeof raw?.surprise_score === "number" && raw.surprise_score >= 0
        ? Math.round(raw.surprise_score)
        : 0,
  };
}

interface SurprisingInsightResponse {
  selected?: Partial<MostSurprisingInsight>;
  candidates?: Partial<MostSurprisingInsight>[];
}

export async function extractMostSurprisingInsight(
  report: TrendInsights,
  analyzedRepositories: number
): Promise<MostSurprisingInsight> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const userContent =
    `GitTrend data for Surprising Insight Detection:\n` +
    JSON.stringify(
      buildSurprisingInsightContext(report, analyzedRepositories),
      null,
      2
    ) +
    `\n\nPick the insight that would make a reader think "I didn't notice that." Write explanation in Russian.`;

  let res: Response;
  try {
    res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.35,
        max_tokens: 2200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SURPRISING_INSIGHT_DETECTION_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "TimeoutError"
        ? "Surprising insight detection timed out"
        : err instanceof Error
          ? err.message
          : "Surprising insight detection failed";
    throw new Error(msg);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI error ${res.status}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty surprising insight response");
  }

  try {
    const parsed = JSON.parse(content) as SurprisingInsightResponse;
    const selected = parsed.selected ?? parsed.candidates?.[0];
    if (!selected?.headline?.trim()) {
      throw new Error("No selected surprising insight");
    }
    return normalizeMostSurprisingInsight(selected);
  } catch (err) {
    if (err instanceof Error && err.message === "No selected surprising insight") {
      throw err;
    }
    throw new Error("Failed to parse surprising insight JSON");
  }
}
