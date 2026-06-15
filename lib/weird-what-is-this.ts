import type { RepositoryWithGrowth } from "./types";

export const WHAT_IS_THIS_UNAVAILABLE = "Описание проекта пока недоступно.";

const MAX_WHAT_IS_THIS_CHARS = 300;

const GROWTH_OR_TREND_MARKERS =
  /\b(зв[ёе]зд|stars?|рост|popular|popularity|trend|viral|набрал|получил\s*\+|за неделю|за месяц|разлетается|сообщество нашло|weird score|growth)\b/i;

export function truncateWhatIsThis(text: string, max = MAX_WHAT_IS_THIS_CHARS): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

export function looksLikeGrowthOrTrendText(text: string): boolean {
  return GROWTH_OR_TREND_MARKERS.test(text);
}

function hasUsableDescription(repo: RepositoryWithGrowth): boolean {
  const desc = repo.description?.trim();
  return Boolean(desc && desc.length >= 8);
}

function hasUsableTopics(repo: RepositoryWithGrowth): boolean {
  return repo.topics.length > 0;
}

/** True when we lack enough signal to ask AI for a factual description. */
export function isLowQualityProjectData(repo: RepositoryWithGrowth): boolean {
  const summary = repo.ai_summary?.trim();
  if (summary && summary.length >= 20 && !looksLikeGrowthOrTrendText(summary)) {
    return false;
  }
  if (hasUsableDescription(repo)) return false;
  if (hasUsableTopics(repo)) return false;
  return true;
}

/** Synchronous fallback chain: ai_summary → description → topics → unavailable. */
export function buildWhatIsThis(repo: RepositoryWithGrowth): string {
  const summary = repo.ai_summary?.trim();
  if (summary && summary.length >= 12 && !looksLikeGrowthOrTrendText(summary)) {
    return truncateWhatIsThis(summary);
  }

  const desc = repo.description?.trim();
  if (desc && desc.length >= 12 && !looksLikeGrowthOrTrendText(desc)) {
    return truncateWhatIsThis(desc);
  }

  if (repo.topics.length >= 2) {
    return truncateWhatIsThis(
      `Open-source проект на темы: ${repo.topics.slice(0, 5).join(", ")}.`
    );
  }

  if (repo.topics.length === 1) {
    return truncateWhatIsThis(`Проект, связанный с темой «${repo.topics[0]}».`);
  }

  return WHAT_IS_THIS_UNAVAILABLE;
}

export interface WhatIsThisContext {
  full_name: string;
  description: string | null;
  topics: string[];
  language: string | null;
  ai_summary: string | null;
  readme_excerpt: string | null;
}

export function buildWhatIsThisContext(
  repo: RepositoryWithGrowth,
  readmeExcerpt?: string | null
): WhatIsThisContext {
  return {
    full_name: repo.full_name,
    description: repo.description,
    topics: repo.topics,
    language: repo.language,
    ai_summary: repo.ai_summary,
    readme_excerpt: readmeExcerpt ?? null,
  };
}

export function formatWhatIsThisContextForPrompt(ctx: WhatIsThisContext): string {
  const parts = [`Repository: ${ctx.full_name}`];

  if (ctx.readme_excerpt?.trim()) {
    parts.push(`README excerpt (primary):\n${ctx.readme_excerpt.trim()}`);
  }
  if (ctx.description?.trim()) {
    parts.push(`GitHub description:\n${ctx.description.trim()}`);
  }
  if (ctx.topics.length) {
    parts.push(`Topics: ${ctx.topics.join(", ")}`);
  }
  if (ctx.language) {
    parts.push(`Language: ${ctx.language}`);
  }
  if (ctx.ai_summary?.trim()) {
    parts.push(`Existing AI summary (reference only, may reuse facts):\n${ctx.ai_summary.trim()}`);
  }

  return parts.join("\n\n");
}

/** Validate AI output before showing it. */
export function normalizeWhatIsThisCandidate(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (looksLikeGrowthOrTrendText(trimmed)) return null;
  if (trimmed.length < 10) return null;
  return truncateWhatIsThis(trimmed, 140);
}
