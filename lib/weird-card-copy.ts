import type { RepositoryWithGrowth, WeirdCategoryId, WeirdFindItem } from "./types";
import { WEIRD_CATEGORY_LABELS } from "./weird-constants";
import { WHAT_IS_THIS_UNAVAILABLE, looksLikeGrowthOrTrendText } from "./weird-what-is-this";

export const CARD_MAX_WHAT_IS_IT = 140;
export const CARD_MAX_WHY_INTERESTING = 220;

const GENERIC_WHY_PATTERNS: RegExp[] = [
  /визуальная или интерактивная задумка/i,
  /маленькое странное шоу/i,
  /странные штуки иногда разлетаются/i,
  /разлетаются быстрее серьёзных/i,
  /существует ради шутки/i,
  /хочется открыть/i,
  /интересен своей необычностью/i,
  /быстрым ростом/i,
  /не утилита, а/i,
  /полностью бессмысленно/i,
  /классика github/i,
  /сообщество явно что-то в этом нашло/i,
  /неожиданная находка среди/i,
  /представляет собой проект/i,
  /современн(ые|ых) технолог/i,
  /может быть интересн/i,
  /демонстрирует возможности/i,
];

const GENERIC_WHAT_PATTERNS: RegExp[] = [
  /представляет собой проект/i,
  /использует современные технологии/i,
  /может быть интересн/i,
  /демонстрирует возможности/i,
  /open-source проект на темы/i,
];

function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** First sentence only, capped at max chars. */
export function oneSentence(text: string, max: number): string {
  let t = collapseWhitespace(text);
  const sentenceEnd = t.search(/[.!?…](?:\s|$)/);
  if (sentenceEnd >= 8 && sentenceEnd < max) {
    t = t.slice(0, sentenceEnd + 1);
  } else {
    const cut = t.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    t = lastSpace > max * 0.55 ? cut.slice(0, lastSpace) : cut;
    if (t.length >= max - 1) t = t.replace(/[,;:]\s*[^,;:]*$/, "");
    if (!/[.!?…]$/.test(t)) t += ".";
  }
  if (t.length > max) {
    const cut = t.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(" ");
    t = (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut) + "…";
  }
  return t;
}

function normalizeForDedupe(text: string): string {
  return collapseWhitespace(text).toLowerCase().replace(/\d+/g, "#");
}

export function isGenericWhyInteresting(text: string): boolean {
  return GENERIC_WHY_PATTERNS.some((p) => p.test(text));
}

export function isGenericWhatIsIt(text: string): boolean {
  return GENERIC_WHAT_PATTERNS.some((p) => p.test(text));
}

function shortConcept(repo: RepositoryWithGrowth): string {
  const desc = repo.description?.trim();
  if (desc && desc.length >= 10) {
    return oneSentence(desc.replace(/^[\s"'«»]+/, ""), 48).replace(/\.$/, "");
  }
  if (repo.topics[0]) return repo.topics[0];
  return repo.name.replace(/[-_]/g, " ");
}

function stripGrowthFromWhat(text: string): string {
  return text
    .replace(/\b(за неделю|рост|зв[ёе]зд|stars?|popular|trend)\b[^.!?]*[.!?]?/gi, "")
    .trim();
}

/** One short Russian sentence — what the repo does (cards). */
export function buildCardWhatIsIt(repo: RepositoryWithGrowth): string {
  const sources = [repo.ai_summary?.trim(), repo.description?.trim()].filter(
    Boolean
  ) as string[];

  for (const raw of sources) {
    if (looksLikeGrowthOrTrendText(raw)) continue;
    let cleaned = stripGrowthFromWhat(raw);
    if (isGenericWhatIsIt(cleaned)) continue;
    if (cleaned.length >= 12) {
      return oneSentence(cleaned, CARD_MAX_WHAT_IS_IT);
    }
  }

  if (repo.topics.length >= 1) {
    const topic = repo.topics.slice(0, 2).join(", ");
    return oneSentence(`Инструмент или эксперимент на тему ${topic}.`, CARD_MAX_WHAT_IS_IT);
  }

  return WHAT_IS_THIS_UNAVAILABLE;
}

function repoSpecificDetail(text: string, repo: RepositoryWithGrowth): boolean {
  const lower = text.toLowerCase();
  if (lower.includes(repo.name.toLowerCase())) return true;
  if (lower.includes(repo.full_name.toLowerCase())) return true;
  if (/\+\d+/.test(text) || /\d+\s*⭐/.test(text)) return true;
  if (repo.growth_7d > 0 && lower.includes(String(repo.growth_7d))) return true;
  const concept = shortConcept(repo).toLowerCase();
  if (concept.length >= 4 && lower.includes(concept.slice(0, Math.min(12, concept.length)))) {
    return true;
  }
  return false;
}

/** Repo-specific why selected — max 220 chars, avoids generic phrases. */
export function buildCardWhyInteresting(
  repo: RepositoryWithGrowth,
  category: WeirdCategoryId,
  breakdown: WeirdFindItem["score_breakdown"],
  usedPhrases: Set<string>
): string {
  const label = WEIRD_CATEGORY_LABELS[category];
  const name = repo.name;
  const growth = repo.growth_7d;
  const concept = shortConcept(repo);
  const stars = repo.stars;

  const candidates: string[] = [];

  if (growth >= 8) {
    candidates.push(
      `«${name}» за неделю +${growth} ⭐ — для категории ${label} это заметный скачок.`,
      `+${growth} звёзд за 7 дней: ${concept} у ${name} неожиданно зацепило GitHub.`,
      `Рост +${growth}/нед у ${name} — редко так взлетает проект про «${concept}».`
    );
  } else if (growth >= 2) {
    candidates.push(
      `${name} (+${growth} ⭐/нед) — скромный, но живой сигнал в категории ${label}.`
    );
  }

  if (stars >= 500 && growth < 8) {
    candidates.push(
      `У ${name} уже ${stars.toLocaleString("ru-RU")} ⭐ — ${concept} держит внимание без хайпа.`
    );
  }

  if (breakdown.humor >= 35 || category === "developer-humor") {
    candidates.push(
      `${name} — явная шутка в коде; +${growth} ⭐ за неделю, и это не случайность.`,
      `Репозиторий ${name} высмеивает «${concept}» — за неделю +${growth} ⭐.`
    );
  }

  if (breakdown.visual_interest >= 35 || category === "visual-experiments") {
    candidates.push(
      `${name} заточен под визуал («${concept}») — +${growth} ⭐ за неделю.`,
      `Смотреть на ${name} интереснее, чем пользоваться: +${growth} ⭐, ${label}.`
    );
  }

  if (category === "desktop-pets") {
    candidates.push(
      `${name} — desktop-питомец «${concept}»; +${growth} ⭐ за неделю.`,
      `Живой питомец ${name} на рабочем столе: +${growth} ⭐ за 7 дней.`
    );
  }

  if (category === "useless-brilliant") {
    candidates.push(
      `${name} решает несуществующую проблему («${concept}») — +${growth} ⭐/нед.`,
      `Бесполезно, но гениально: ${name}, +${growth} ⭐ за неделю.`
    );
  }

  if (category === "retro-computing") {
    candidates.push(
      `${name} копает retro (${concept}); +${growth} ⭐ за неделю.`,
      `Ностальгия в ${name}: +${growth} ⭐, категория ${label}.`
    );
  }

  if (category === "ai-oddities") {
    candidates.push(
      `${name} — странный AI-эксперимент («${concept}»), +${growth} ⭐/нед.`,
      `LLM с необычным углом: ${name}, +${growth} ⭐ — ${label}.`
    );
  }

  if (category === "internet-culture") {
    candidates.push(
      `${name} пахнет мемом; «${concept}», +${growth} ⭐ за 7 дней.`,
      `Интернет-культура в ${name}: +${growth} ⭐ за неделю.`
    );
  }

  if (category === "unexpected-tools") {
    candidates.push(
      `${name} — инструмент с вопросом «зачем?», но +${growth} ⭐/нед.`,
      `Зачем ${name}? «${concept}» — и всё равно +${growth} ⭐.`
    );
  }

  const offset = repo.github_id % Math.max(candidates.length, 1);
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];

  for (const c of rotated) {
    const text = oneSentence(c, CARD_MAX_WHY_INTERESTING);
    const key = normalizeForDedupe(text);
    if (
      !usedPhrases.has(key) &&
      !isGenericWhyInteresting(text) &&
      repoSpecificDetail(text, repo) &&
      text.length <= CARD_MAX_WHY_INTERESTING
    ) {
      usedPhrases.add(key);
      return text;
    }
  }

  const fallback = oneSentence(
    `За неделю +${growth} ⭐; ${label}. ${name} — «${concept}».`,
    CARD_MAX_WHY_INTERESTING
  );
  let n = 0;
  let unique = fallback;
  while (usedPhrases.has(normalizeForDedupe(unique)) && n < 5) {
    n++;
    unique = oneSentence(
      `+${growth} ⭐/нед у ${name} (${label}), идея «${concept}».`,
      CARD_MAX_WHY_INTERESTING
    );
  }
  usedPhrases.add(normalizeForDedupe(unique));
  return unique;
}

export function validateWeirdCardCopy(
  whatIsIt: string,
  whyInteresting: string,
  repo: RepositoryWithGrowth
): { ok: boolean; reason?: string } {
  if (!whatIsIt.trim()) return { ok: false, reason: "empty whatIsIt" };
  if (whatIsIt.length > CARD_MAX_WHAT_IS_IT) {
    return { ok: false, reason: "whatIsIt too long" };
  }
  if (whyInteresting.length > CARD_MAX_WHY_INTERESTING) {
    return { ok: false, reason: "whyInteresting too long" };
  }
  if (isGenericWhatIsIt(whatIsIt)) return { ok: false, reason: "generic whatIsIt" };
  if (isGenericWhyInteresting(whyInteresting)) {
    return { ok: false, reason: "generic whyInteresting" };
  }
  const w = whatIsIt.toLowerCase();
  const y = whyInteresting.toLowerCase();
  if (w.length > 20 && y.includes(w.slice(0, Math.min(40, w.length)))) {
    return { ok: false, reason: "why duplicates what" };
  }
  if (!repoSpecificDetail(whyInteresting, repo)) {
    return { ok: false, reason: "why not repo-specific" };
  }
  return { ok: true };
}

/** Fix duplicates and re-validate across a batch of cards. */
export function finalizeWeirdCardCopy(
  items: WeirdFindItem[],
  reposById: Map<number, RepositoryWithGrowth>
): WeirdFindItem[] {
  const usedWhy = new Set<string>();

  return items.map((item) => {
    const repo = reposById.get(item.github_id);
    if (!repo) return item;

    return applyCardCopyToItem(item, repo, usedWhy);
  });
}

export function applyCardCopyToItem(
  item: WeirdFindItem,
  repo: RepositoryWithGrowth,
  usedWhy: Set<string>
): WeirdFindItem {
  let whatIsIt = oneSentence(
    isGenericWhatIsIt(item.what_is_this) ? buildCardWhatIsIt(repo) : item.what_is_this,
    CARD_MAX_WHAT_IS_IT
  );
  let whyInteresting = item.why_interesting;

  const whyKey = normalizeForDedupe(whyInteresting);
  const check = validateWeirdCardCopy(whatIsIt, whyInteresting, repo);

  if (usedWhy.has(whyKey) || !check.ok || isGenericWhyInteresting(whyInteresting)) {
    whyInteresting = buildCardWhyInteresting(
      repo,
      item.category,
      item.score_breakdown,
      usedWhy
    );
  } else {
    usedWhy.add(whyKey);
  }

  return { ...item, what_is_this: whatIsIt, why_interesting: whyInteresting };
}

/** Sanitize AI-generated card copy with deterministic fallback. */
export function sanitizeCardWhatIsIt(
  candidate: string,
  repo: RepositoryWithGrowth
): string {
  let what = oneSentence(candidate, CARD_MAX_WHAT_IS_IT);
  if (
    isGenericWhatIsIt(what) ||
    looksLikeGrowthOrTrendText(what) ||
    what.length < 10
  ) {
    what = buildCardWhatIsIt(repo);
  }
  return oneSentence(what, CARD_MAX_WHAT_IS_IT);
}

export function sanitizeCardWhyInteresting(
  candidate: string,
  item: WeirdFindItem,
  repo: RepositoryWithGrowth,
  usedWhy: Set<string>
): string {
  let why = oneSentence(candidate, CARD_MAX_WHY_INTERESTING);
  const check = validateWeirdCardCopy(item.what_is_this, why, repo);
  if (!check.ok || isGenericWhyInteresting(why) || usedWhy.has(normalizeForDedupe(why))) {
    why = buildCardWhyInteresting(
      repo,
      item.category,
      item.score_breakdown,
      usedWhy
    );
  } else {
    usedWhy.add(normalizeForDedupe(why));
  }
  return why;
}
