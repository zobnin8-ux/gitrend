import type { WeirdFindItem } from "./types";
import { fetchReadmeExcerpt } from "./github";
import {
  buildWhatIsThis,
  buildWhatIsThisContext,
  formatWhatIsThisContextForPrompt,
  isLowQualityProjectData,
  normalizeWhatIsThisCandidate,
  WHAT_IS_THIS_UNAVAILABLE,
} from "./weird-what-is-this";
import {
  sanitizeCardWhatIsIt,
  sanitizeCardWhyInteresting,
} from "./weird-card-copy";
import type { RepositoryWithGrowth } from "./types";
import { getRepositoriesWithGrowth } from "./analytics";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

interface OpenAiResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export function isWeirdAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function callWeirdAi(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch(OPENAI_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.75,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const data = (await res.json()) as OpenAiResponse;
  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI error ${res.status}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty OpenAI response");
  return content;
}

function repoContext(item: WeirdFindItem): string {
  return [
    `Repository: ${item.full_name}`,
    `What it is: ${item.what_is_this}`,
    item.description ? `Description: ${item.description}` : null,
    `Stars: ${item.stars}, 7d growth: +${item.growth_7d}`,
    `Category: ${item.category_label}`,
    item.topics.length ? `Topics: ${item.topics.join(", ")}` : null,
    `Heuristic note: ${item.why_interesting}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function getRepoForWeirdItem(item: WeirdFindItem): RepositoryWithGrowth | null {
  return getRepositoriesWithGrowth().find((r) => r.github_id === item.github_id) ?? null;
}

/** Russian "Что это?" — what the project does, not why it is trending. */
export async function generateWeirdWhatIsThis(item: WeirdFindItem): Promise<string> {
  const repo = getRepoForWeirdItem(item);
  if (!repo) return item.what_is_this;

  const readme = await fetchReadmeExcerpt(item.full_name);
  if (isLowQualityProjectData(repo) && !readme) {
    return WHAT_IS_THIS_UNAVAILABLE;
  }

  const ctx = buildWhatIsThisContext(repo, readme);
  const text = await callWeirdAi(
    `You write ONE short Russian sentence: what a GitHub repository IS and DOES.

Requirements:
- Exactly ONE sentence, max 140 characters
- Simple, concrete language — no filler
- Answer ONLY what the project does
- Do NOT mention stars, growth, popularity, trends, or why it is interesting
- Do NOT start with "Репозиторий представляет собой" or similar generic openings
- Use README as primary source, then GitHub description, then topics
- Do NOT invent functionality not in the sources
- If too vague, reply exactly: ${WHAT_IS_THIS_UNAVAILABLE}

Plain text only.`,
    formatWhatIsThisContextForPrompt(ctx),
    180
  );

  if (text.trim() === WHAT_IS_THIS_UNAVAILABLE) {
    return WHAT_IS_THIS_UNAVAILABLE;
  }

  const normalized = normalizeWhatIsThisCandidate(text);
  if (normalized) {
    return sanitizeCardWhatIsIt(normalized, repo);
  }

  const fallback = buildWhatIsThis(repo);
  return fallback !== WHAT_IS_THIS_UNAVAILABLE
    ? sanitizeCardWhatIsIt(fallback, repo)
    : WHAT_IS_THIS_UNAVAILABLE;
}

/** "Why this caught our attention" — repo-specific, not generic. */
export async function generateWeirdAttention(item: WeirdFindItem): Promise<string> {
  const repo = getRepoForWeirdItem(item);
  if (!repo) return item.why_interesting;

  const text = await callWeirdAi(
    `You write a Russian "why this repo is interesting" blurb for a weird GitHub find card.

Requirements:
- 1–2 short sentences, max 220 characters total
- MUST mention this specific repo (name or unique idea from description)
- Include at least one of: weekly growth (+N stars), weird concept, humor, visual hook, category
- Do NOT use generic phrases like "странные штуки разлетаются", "визуальная задумка — не утилита", "существует ради шутки"
- Do NOT repeat what the project does (that's a separate field)
- Playful tone, not corporate market analysis
- Plain text, no markdown`,
    repoContext(item),
    280
  );
  return sanitizeCardWhyInteresting(text, item, repo, new Set());
}

export async function generateWeirdLinkedInPost(item: WeirdFindItem): Promise<string> {
  return callWeirdAi(
    `Write a short LinkedIn post (120-200 words) about a weird/fun GitHub repository discovery.
Style: founder/observer sharing something delightful they found on GitHub.
Contrast serious tech trends with this playful find. Be specific about the repo.
NOT market intelligence. NOT "AI agents are growing". Make people smile and want to click.
Plain text, no hashtags spam. Optional line break before a short closing thought.`,
    repoContext(item),
    400
  );
}

export async function generateWeirdTelegramPost(item: WeirdFindItem): Promise<string> {
  return callWeirdAi(
    `Write a Telegram post (2-5 short lines) about a weird GitHub find.
Short, humorous, easy to share. Include repo name. Casual tone. Russian or English OK.
No corporate speak. Max ~400 characters if possible.`,
    repoContext(item),
    200
  );
}

export interface WeirdRadarWeeklyExport {
  whatIsIt: string;
  whyInteresting: string;
  telegramTitle: string;
  telegramPost: string;
}

/** Контент weirdFindOfTheWeek для weekly-radar.json (Радар будущего). */
export async function generateWeirdRadarWeeklyExport(
  item: WeirdFindItem
): Promise<WeirdRadarWeeklyExport> {
  const repo = getRepoForWeirdItem(item);
  let whatIsIt = item.what_is_this?.trim() ?? "";

  if (isWeirdAiEnabled()) {
    whatIsIt = await generateWeirdWhatIsThis(item);
  } else if (repo) {
    whatIsIt = buildWhatIsThis(repo);
  }

  const userPayload = [
    repoContext(item),
    whatIsIt ? `\nWhatIsIt (already generated, reuse facts):\n${whatIsIt}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (!isWeirdAiEnabled()) {
    const whyInteresting = item.why_interesting;
    const title = item.name.replace(/[-_]/g, " ");
    return {
      whatIsIt,
      whyInteresting,
      telegramTitle: `Странный GitHub недели: ${title}`,
      telegramPost: [
        "🧩 Странный GitHub недели",
        "",
        `Название проекта: ${item.full_name}`,
        "",
        "Что это:",
        whatIsIt,
        "",
        "Почему попало в радар:",
        whyInteresting,
        "",
        "GitHub:",
        item.url,
      ].join("\n"),
    };
  }

  const raw = await callWeirdAi(
    `You prepare Russian content for a weekly "Strange GitHub Find" rubric in Telegram.

Return plain JSON only:
{
  "whyInteresting": "1-3 short paragraphs in Russian — why this repo was selected (weirdness, growth, visual appeal, surprise, shareability). May mention stars and weekly growth.",
  "telegramTitle": "short Russian title, e.g. Странный GitHub недели: ...",
  "telegramPost": "ready-to-publish Telegram post in Russian"
}

Rules for whyInteresting:
- Playful but not corporate
- Explain selection, NOT what the project does (whatIsIt covers that)
- 1-3 paragraphs, plain text

Rules for telegramPost:
- Light, curious, playful tone
- No heavy analytics or market intelligence
- Use this structure:

🧩 Странный GitHub недели

Название проекта: owner/repo

Что это:
(1-3 sentences from whatIsIt)

Почему попало в радар:
(1-2 sentences from whyInteresting)

GitHub:
(url)

- Include the repo URL at the end
- Max ~1200 characters`,
    userPayload,
    650
  );

  try {
    const parsed = JSON.parse(raw) as Partial<WeirdRadarWeeklyExport>;
    const whyInteresting =
      parsed.whyInteresting?.trim() || item.why_interesting;
    const telegramTitle =
      parsed.telegramTitle?.trim() ||
      `Странный GitHub недели: ${item.name}`;
    let telegramPost = parsed.telegramPost?.trim() || "";
    if (!telegramPost) {
      telegramPost = [
        "🧩 Странный GitHub недели",
        "",
        `Название проекта: ${item.full_name}`,
        "",
        "Что это:",
        whatIsIt,
        "",
        "Почему попало в радар:",
        whyInteresting,
        "",
        "GitHub:",
        item.url,
      ].join("\n");
    }
    return {
      whatIsIt,
      whyInteresting,
      telegramTitle,
      telegramPost,
    };
  } catch {
    return {
      whatIsIt,
      whyInteresting: item.why_interesting,
      telegramTitle: `Странный GitHub недели: ${item.name}`,
      telegramPost: raw,
    };
  }
}

export interface WeirdGeneratedContent {
  what_is_this: string;
  attention: string;
  linkedin_post: string;
  telegram_post: string;
}

export async function generateWeirdContentBundle(
  item: WeirdFindItem
): Promise<WeirdGeneratedContent> {
  const what_is_this = await generateWeirdWhatIsThis(item);
  const itemWithWhat = { ...item, what_is_this };
  const [attention, linkedin_post, telegram_post] = await Promise.all([
    generateWeirdAttention(itemWithWhat),
    generateWeirdLinkedInPost(itemWithWhat),
    generateWeirdTelegramPost(itemWithWhat),
  ]);
  return { what_is_this, attention, linkedin_post, telegram_post };
}
