import type { WeirdFindItem } from "./types";
import { fetchReadmeExcerpt } from "./github";
import {
  buildWhatIsThisContext,
  formatWhatIsThisContextForPrompt,
  isLowQualityProjectData,
} from "./weird-what-is-this";
import { buildShortDescription } from "./weird-short-description";
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
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.8,
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

function getRepoForWeirdItem(item: WeirdFindItem): RepositoryWithGrowth | null {
  return getRepositoriesWithGrowth().find((r) => r.github_id === item.github_id) ?? null;
}

function radarContext(item: WeirdFindItem, shortDescription: string, readme?: string | null): string {
  return [
    `Repository: ${item.full_name}`,
    `Short description: ${shortDescription}`,
    item.description ? `GitHub description: ${item.description}` : null,
    readme ? `README excerpt:\n${readme.slice(0, 1200)}` : null,
    `Stars: ${item.stars}, weekly growth: +${item.growth_7d}`,
    `Category: ${item.category_label}, weird score: ${item.weird_score}`,
    item.topics.length ? `Topics: ${item.topics.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface WeirdRadarWeeklyExport {
  shortDescription: string;
  telegramTitle: string;
  telegramPost: string;
}

function displayTitle(item: WeirdFindItem): string {
  return item.name
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildTelegramPostFallback(
  item: WeirdFindItem,
  shortDescription: string
): { telegramTitle: string; telegramPost: string } {
  const title = displayTitle(item);
  const telegramTitle = `Странный GitHub недели: ${title.toLowerCase()}`;

  const telegramPost = [
    "На этой неделе в GitHub обнаружилась крайне странная штука.",
    "",
    `${item.full_name} — ${shortDescription}`,
    "",
    `За неделю проект получил +${item.growth_7d} ⭐ (всего ${item.stars.toLocaleString("ru-RU")}). Категория: ${item.category_label}. Weird score: ${item.weird_score}.`,
    "",
    "Похоже, разработчики снова доказали, что интернет любит странные идеи сильнее, чем полезные утилиты.",
    "",
    `GitHub: ${item.url}`,
  ].join("\n");

  return { telegramTitle, telegramPost };
}

/** Weekly storytelling export for Radar — not used in GitTrend UI. */
export async function generateWeirdRadarWeeklyExport(
  item: WeirdFindItem
): Promise<WeirdRadarWeeklyExport> {
  const repo = getRepoForWeirdItem(item);
  const shortDescription = item.short_description?.trim() || (repo ? buildShortDescription(repo) : "");

  if (!isWeirdAiEnabled()) {
    const telegram = buildTelegramPostFallback(item, shortDescription);
    return { shortDescription, ...telegram };
  }

  const readme = await fetchReadmeExcerpt(item.full_name);
  const ctx =
    repo && !isLowQualityProjectData(repo)
      ? formatWhatIsThisContextForPrompt(buildWhatIsThisContext(repo, readme))
      : radarContext(item, shortDescription, readme);

  const raw = await callWeirdAi(
    `You write Russian Telegram content for a weekly rubric "Странный GitHub недели".

Return plain JSON only:
{
  "telegramTitle": "short title, e.g. Странный GitHub недели: ...",
  "telegramPost": "complete Telegram post in Russian"
}

Rules for telegramPost:
- Length: 400–1000 characters
- Language: Russian
- Style: curious, playful, human — NOT corporate, NOT analytical, NOT consulting
- Structure:
  1) Opening — introduce the discovery (e.g. "На этой неделе в GitHub...")
  2) What is it — explain the repo in simple language
  3) Why it is funny/weird/unexpected — the key section (ridiculous idea, unexpected popularity, humor, internet culture, strange usefulness)
  4) Closing — GitHub link and invite curiosity
- Include the repo URL at the end
- Do NOT use markdown headers or bullet lists
- Write so someone who never opened GitHub still enjoys reading it

The shortDescription field is already fixed — reuse its facts, do not contradict it.`,
    ctx,
    900
  );

  try {
    const parsed = JSON.parse(raw) as Partial<WeirdRadarWeeklyExport>;
    const telegramTitle =
      parsed.telegramTitle?.trim() ||
      `Странный GitHub недели: ${displayTitle(item).toLowerCase()}`;
    let telegramPost = parsed.telegramPost?.trim() || "";
    if (telegramPost.length < 200) {
      telegramPost = buildTelegramPostFallback(item, shortDescription).telegramPost;
    }
    return { shortDescription, telegramTitle, telegramPost };
  } catch {
    return {
      shortDescription,
      ...buildTelegramPostFallback(item, shortDescription),
    };
  }
}
