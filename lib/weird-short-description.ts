import type { RepositoryWithGrowth } from "./types";
import { looksLikeGrowthOrTrendText } from "./weird-what-is-this";

export const SHORT_DESC_MIN = 40;
export const SHORT_DESC_TARGET = 80;
export const SHORT_DESC_MAX = 100;

const FORBIDDEN_PATTERNS: RegExp[] = [
  /репозиторий представляет собой/i,
  /данный проект предназначен/i,
  /инновационн(ая|ой|ую) платформ/i,
  /использует современные технолог/i,
  /проект демонстрирует возможности/i,
  /open-source проект на темы/i,
  /может быть интересн/i,
];

function collapse(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** First sentence, capped at max chars on a word boundary. */
function oneSentence(text: string, max: number): string {
  let t = collapse(text);
  const end = t.search(/[.!?…](?:\s|$)/);
  if (end >= 12 && end < max) {
    t = t.slice(0, end + 1);
  }
  if (t.length > max) {
    const cut = t.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    t = lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut;
    if (!/[.!?…]$/.test(t)) t += ".";
  }
  if (t.length > max) {
    t = t.slice(0, max - 1).replace(/[,;:]\s*[^,;:]*$/, "") + "…";
  }
  return t;
}

export function isForbiddenShortDescription(text: string): boolean {
  return FORBIDDEN_PATTERNS.some((p) => p.test(text));
}

function stripForbiddenOpenings(text: string): string {
  return text
    .replace(
      /^(репозиторий|данный проект|этот проект|проект)\s+(представляет собой|является|предназначен)\s+/i,
      ""
    )
    .trim();
}

function humanizeFromTopics(repo: RepositoryWithGrowth): string {
  const topic = repo.topics[0]?.replace(/-/g, " ");
  if (topic) {
    return oneSentence(`Эксперимент и инструменты на тему «${topic}».`, SHORT_DESC_MAX);
  }
  const name = repo.name.replace(/[-_]/g, " ");
  return oneSentence(`${name} — необычный проект на GitHub.`, SHORT_DESC_MAX);
}

/** One short Russian sentence for gallery cards (40–100 chars). */
export function buildShortDescription(repo: RepositoryWithGrowth): string {
  const sources = [repo.ai_summary?.trim(), repo.description?.trim()].filter(
    Boolean
  ) as string[];

  for (const raw of sources) {
    if (looksLikeGrowthOrTrendText(raw)) continue;
    const cleaned = stripForbiddenOpenings(raw);
    if (isForbiddenShortDescription(cleaned)) continue;
    if (cleaned.length < 12) continue;

    let sentence = oneSentence(cleaned, SHORT_DESC_MAX);
    if (isForbiddenShortDescription(sentence)) continue;

    if (sentence.length < SHORT_DESC_MIN && cleaned.length > sentence.length) {
      const extended = oneSentence(cleaned, SHORT_DESC_MAX);
      if (extended.length >= 15 && !isForbiddenShortDescription(extended)) {
        sentence = extended;
      }
    }

    if (sentence.length >= 15) return sentence;
  }

  return humanizeFromTopics(repo);
}

export function validateShortDescription(text: string): boolean {
  const t = collapse(text);
  if (t.length < 15 || t.length > SHORT_DESC_MAX) return false;
  if (isForbiddenShortDescription(t)) return false;
  if (looksLikeGrowthOrTrendText(t)) return false;
  return true;
}

export function sanitizeShortDescription(
  candidate: string,
  repo: RepositoryWithGrowth
): string {
  const cleaned = oneSentence(stripForbiddenOpenings(candidate), SHORT_DESC_MAX);
  if (validateShortDescription(cleaned)) return cleaned;
  return buildShortDescription(repo);
}
