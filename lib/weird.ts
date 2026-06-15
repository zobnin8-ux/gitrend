import { getRepositoriesWithGrowth } from "./analytics";
import { WEIRD_CATEGORY_LABELS } from "./weird-constants";
import {
  buildCardWhatIsIt,
  buildCardWhyInteresting,
  finalizeWeirdCardCopy,
} from "./weird-card-copy";
import type {
  RepositoryWithGrowth,
  WeirdCategoryId,
  WeirdFilterId,
  WeirdFindItem,
  WeirdFindOfWeek,
  WeirdFindsResponse,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export { WEIRD_CATEGORY_LABELS } from "./weird-constants";

const CATEGORY_PATTERNS: Record<WeirdCategoryId, RegExp[]> = {
  "desktop-pets": [
    /\b(cat|dog|pet|pets|neko|puppy|kitten|tamagotchi|companion|desktop pet|virtual pet|ascii pet)\b/i,
  ],
  "developer-humor": [
    /\b(joke|jokes|funny|humor|humour|parody|satire|meme|shitpost|prank|troll)\b/i,
  ],
  "useless-brilliant": [
    /\b(useless|overengineer|over-engineer|because i can|nobody asked|pointless|absurd|unnecessary)\b/i,
  ],
  "retro-computing": [
    /\b(retro|vintage|dos|windows 95|win95|c64|commodore|amiga|bbs|8-bit|16-bit|old school|nostalgia)\b/i,
  ],
  "ai-oddities": [
    /\b(ai pet|llm personality|ai companion|ai friend|chatbot personality|sentient|ai agent weird)\b/i,
    /\b(strange ai|weird ai|ai experiment)\b/i,
  ],
  "visual-experiments": [
    /\b(generative|shader|webgl|canvas|ascii art|visualization|particle|demo scene|interactive art)\b/i,
  ],
  "internet-culture": [
    /\b(meme|memes|viral|copypasta|discord bot|tiktok|reddit|internet culture|community joke)\b/i,
  ],
  "unexpected-tools": [
    /\b(why does|why would|strange tool|weird tool|cursed|unhinged|chaos|wtf|what if)\b/i,
  ],
};

const WEIRD_SIGNAL = /\b(weird|strange|bizarre|cursed|unhinged|chaos|absurd|unexpected|bizarre|duck|potato|goose|penguin|silly|ridiculous|bonkers)\b/i;

const HUMOR_SIGNAL = /\b(funny|humor|joke|meme|lol|hilarious|satire|parody|useless|unnecessary)\b/i;

const VISUAL_SIGNAL = /\b(visual|shader|canvas|webgl|generative|animation|animated|pixel|ascii|demo|interactive)\b/i;

const CRYPTO_SPAM =
  /\b(airdrop|pump\.fun|pump coin|token sale|nft mint|free crypto|100x|get rich|presale|web3 scam)\b/i;

const MARKETING_SPAM =
  /\b(follow us on twitter|buy now|limited offer|affiliate link|subscribe to my|promo code)\b/i;

function haystack(repo: RepositoryWithGrowth): string {
  return [
    repo.full_name,
    repo.name,
    repo.description ?? "",
    repo.ai_summary ?? "",
    repo.topics.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function logNorm(value: number, cap: number): number {
  if (value <= 0) return 0;
  return clamp((Math.log10(value + 1) / Math.log10(cap + 1)) * 100);
}

export function isWeirdExcluded(repo: RepositoryWithGrowth): boolean {
  const text = haystack(repo);
  const now = Date.now();

  if (/\bfork of\b/i.test(repo.description ?? "")) return true;
  if (repo.name.toLowerCase().endsWith("-fork")) return true;

  if (CRYPTO_SPAM.test(text)) return true;
  if (MARKETING_SPAM.test(text)) return true;

  const inactiveDays = (now - Date.parse(repo.pushed_at)) / DAY_MS;
  if (inactiveDays > 120) return true;

  if (
    !repo.description?.trim() &&
    repo.topics.length === 0 &&
    repo.stars < 8
  ) {
    return true;
  }

  if (repo.stars < 3 && repo.growth_7d < 2) return true;

  return false;
}

export function detectWeirdCategory(
  repo: RepositoryWithGrowth
): WeirdCategoryId {
  const text = haystack(repo);
  let best: WeirdCategoryId = "unexpected-tools";
  let bestScore = 0;

  for (const [id, patterns] of Object.entries(CATEGORY_PATTERNS) as [
    WeirdCategoryId,
    RegExp[],
  ][]) {
    let hits = 0;
    for (const p of patterns) {
      if (p.test(text)) hits++;
    }
    if (hits > bestScore) {
      bestScore = hits;
      best = id;
    }
  }

  if (bestScore === 0) {
    if (/\b(cat|pet|neko)\b/i.test(text)) return "desktop-pets";
    if (/\b(ai|llm|gpt|agent)\b/i.test(text)) return "ai-oddities";
  }

  return best;
}

function scoreNovelty(text: string): number {
  let score = 0;
  if (WEIRD_SIGNAL.test(text)) score += 55;
  if (/\b(experiment|prototype|toy project|weekend project|just for fun)\b/i.test(text)) {
    score += 25;
  }
  if (text.split(/\s+/).length < 120 && WEIRD_SIGNAL.test(text)) score += 15;
  return clamp(score);
}

function scoreUnexpectedness(repo: RepositoryWithGrowth, text: string): number {
  let score = 0;
  const mainstream = /\b(nextjs|react|kubernetes|docker|typescript|enterprise|saas)\b/i.test(
    text
  );
  const odd = WEIRD_SIGNAL.test(text) || HUMOR_SIGNAL.test(text);
  if (odd && !mainstream) score += 45;
  if (repo.stars >= 500 && odd) score += 35;
  if (repo.topics.length >= 2 && odd) score += 15;
  return clamp(score);
}

function scoreVirality(repo: RepositoryWithGrowth): number {
  const starScore = logNorm(repo.stars, 50000);
  const growthBoost = logNorm(repo.growth_7d, 500);
  return clamp(starScore * 0.65 + growthBoost * 0.35);
}

function scoreVisualInterest(text: string): number {
  let score = 0;
  if (VISUAL_SIGNAL.test(text)) score += 60;
  if (/\b(screenshot|gif|demo|preview|animation)\b/i.test(text)) score += 20;
  return clamp(score);
}

function scoreHumor(text: string): number {
  let score = 0;
  if (HUMOR_SIGNAL.test(text)) score += 65;
  if (/\b(useless|unnecessary|because why not)\b/i.test(text)) score += 25;
  return clamp(score);
}

function scoreGrowthRate(repo: RepositoryWithGrowth): number {
  const abs = logNorm(repo.growth_7d, 300);
  const pct = clamp(repo.growth_7d_percent, 0, 100);
  return clamp(abs * 0.7 + pct * 0.3);
}

export function computeWeirdScore(repo: RepositoryWithGrowth): {
  total: number;
  breakdown: WeirdFindItem["score_breakdown"];
} {
  const text = haystack(repo);
  const breakdown = {
    novelty: scoreNovelty(text),
    unexpectedness: scoreUnexpectedness(repo, text),
    virality: scoreVirality(repo),
    visual_interest: scoreVisualInterest(text),
    humor: scoreHumor(text),
    growth_rate: scoreGrowthRate(repo),
  };

  const total =
    breakdown.novelty * 0.2 +
    breakdown.unexpectedness * 0.15 +
    breakdown.virality * 0.2 +
    breakdown.visual_interest * 0.15 +
    breakdown.humor * 0.1 +
    breakdown.growth_rate * 0.2;

  return { total: Math.round(total * 10) / 10, breakdown };
}

export function buildWhyInteresting(
  repo: RepositoryWithGrowth,
  category: WeirdCategoryId,
  breakdown: WeirdFindItem["score_breakdown"]
): string {
  return buildCardWhyInteresting(repo, category, breakdown, new Set());
}

function toWeirdFindItem(
  repo: RepositoryWithGrowth,
  usedWhy: Set<string>
): WeirdFindItem | null {
  if (isWeirdExcluded(repo)) return null;

  const text = haystack(repo);
  const { total, breakdown } = computeWeirdScore(repo);

  const hasWeirdSignal =
    WEIRD_SIGNAL.test(text) ||
    HUMOR_SIGNAL.test(text) ||
    VISUAL_SIGNAL.test(text) ||
    Object.values(CATEGORY_PATTERNS).some((patterns) =>
      patterns.some((p) => p.test(text))
    );

  if (!hasWeirdSignal && total < 28) return null;
  if (total < 22) return null;

  const category = detectWeirdCategory(repo);

  return {
    github_id: repo.github_id,
    full_name: repo.full_name,
    name: repo.name,
    url: repo.url,
    description: repo.description,
    stars: repo.stars,
    forks: repo.forks,
    growth_7d: repo.growth_7d,
    growth_7d_percent: repo.growth_7d_percent,
    growth_30d: repo.growth_30d,
    topics: repo.topics,
    language: repo.language,
    owner_avatar: repo.owner_avatar,
    pushed_at: repo.pushed_at,
    category,
    category_label: WEIRD_CATEGORY_LABELS[category],
    weird_score: total,
    what_is_this: buildCardWhatIsIt(repo),
    why_interesting: buildCardWhyInteresting(repo, category, breakdown, usedWhy),
    score_breakdown: breakdown,
  };
}

function sortItems(items: WeirdFindItem[], filter: WeirdFilterId): WeirdFindItem[] {
  const sorted = [...items];
  switch (filter) {
    case "fastest_growing":
      sorted.sort((a, b) => b.growth_7d - a.growth_7d || b.weird_score - a.weird_score);
      break;
    case "most_starred":
      sorted.sort((a, b) => b.stars - a.stars || b.weird_score - a.weird_score);
      break;
    case "most_discussed":
      sorted.sort(
        (a, b) =>
          b.forks + b.stars * 0.01 - (a.forks + a.stars * 0.01) ||
          b.weird_score - a.weird_score
      );
      break;
    default:
      sorted.sort((a, b) => b.weird_score - a.weird_score);
  }
  return sorted;
}

export function getWeirdFinds(options?: {
  filter?: WeirdFilterId;
  category?: WeirdCategoryId | "all";
  limit?: number;
}): WeirdFindsResponse {
  const filter = options?.filter ?? "most_weird";
  const category = options?.category ?? "all";
  const limit = options?.limit ?? 36;

  const repos = getRepositoriesWithGrowth();
  const reposById = new Map(repos.map((r) => [r.github_id, r]));
  const usedWhy = new Set<string>();
  const candidates: WeirdFindItem[] = [];

  for (const repo of repos) {
    const item = toWeirdFindItem(repo, usedWhy);
    if (!item) continue;
    if (category !== "all" && item.category !== category) continue;
    candidates.push(item);
  }

  const sorted = sortItems(candidates, filter).slice(0, limit);
  const items = finalizeWeirdCardCopy(sorted, reposById);
  const find_of_week = pickFindOfWeek(candidates);

  return {
    items,
    find_of_week,
    total_candidates: candidates.length,
    filter,
    category,
  };
}

function weekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function pickFindOfWeek(candidates: WeirdFindItem[]): WeirdFindOfWeek | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => b.weird_score - a.weird_score);
  const item = sorted[0];
  return {
    item,
    week_key: weekKey(),
  };
}

/** Лучший weird-кандидат для weekly-radar.json (null если слабый сигнал). */
export function selectTopWeirdFindForExport(
  minScore = 28
): WeirdFindItem | null {
  const repos = getRepositoriesWithGrowth();
  const reposById = new Map(repos.map((r) => [r.github_id, r]));
  const usedWhy = new Set<string>();
  const candidates: WeirdFindItem[] = [];

  for (const repo of repos) {
    const item = toWeirdFindItem(repo, usedWhy);
    if (item) candidates.push(item);
  }

  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => b.weird_score - a.weird_score);
  const top = sorted[0];
  if (top.weird_score < minScore) return null;

  return finalizeWeirdCardCopy([top], reposById)[0] ?? top;
}

export function findWeirdItemById(
  githubId: number
): WeirdFindItem | null {
  const repos = getRepositoriesWithGrowth();
  const reposById = new Map(repos.map((r) => [r.github_id, r]));
  const repo = repos.find((r) => r.github_id === githubId);
  if (!repo) return null;
  const item = toWeirdFindItem(repo, new Set());
  if (!item) return null;
  return finalizeWeirdCardCopy([item], reposById)[0] ?? null;
}
