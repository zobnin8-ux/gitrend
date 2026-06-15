import type { WeirdFindItem } from "@/lib/types";
import {
  generateWeirdRadarWeeklyExport,
  isWeirdAiEnabled,
} from "@/lib/weird-ai";
import { selectTopWeirdFindForExport } from "@/lib/weird";
import { buildWhatIsThis, WHAT_IS_THIS_UNAVAILABLE } from "@/lib/weird-what-is-this";
import { getRepositoriesWithGrowth } from "@/lib/analytics";
import type { WeeklyRadarWeirdFind } from "./types";

const MIN_WEIRD_SCORE = 28;

function displayTitle(item: WeirdFindItem): string {
  const name = item.name.trim();
  if (!name) return item.full_name.split("/").pop() ?? item.full_name;
  return name
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildTelegramPostFallback(
  item: WeirdFindItem,
  whatIsIt: string,
  whyInteresting: string
): { telegramTitle: string; telegramPost: string } {
  const title = displayTitle(item);
  const telegramTitle = `Странный GitHub недели: ${title.toLowerCase()}`;

  const telegramPost = [
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

  return { telegramTitle, telegramPost };
}

function itemToWeeklyRadarWeirdFind(
  item: WeirdFindItem,
  content: {
    whatIsIt: string;
    whyInteresting: string;
    telegramTitle: string;
    telegramPost: string;
  }
): WeeklyRadarWeirdFind {
  return {
    title: displayTitle(item),
    repo: item.full_name,
    url: item.url,
    category: item.category_label,
    whatIsIt: content.whatIsIt,
    whyInteresting: content.whyInteresting,
    stars: item.stars,
    weeklyGrowth: item.growth_7d,
    weirdScore: item.weird_score,
    telegramTitle: content.telegramTitle,
    telegramPost: content.telegramPost,
  };
}

async function buildWeirdFindContent(
  item: WeirdFindItem
): Promise<WeeklyRadarWeirdFind | null> {
  if (isWeirdAiEnabled()) {
    try {
      const ai = await generateWeirdRadarWeeklyExport(item);
      if (
        ai.whatIsIt === WHAT_IS_THIS_UNAVAILABLE &&
        !item.description?.trim() &&
        !item.what_is_this?.trim()
      ) {
        return null;
      }
      return itemToWeeklyRadarWeirdFind(item, ai);
    } catch {
      /* fallback below */
    }
  }

  const whatIsIt =
    item.what_is_this?.trim() ||
    (() => {
      const repo = getRepositoriesWithGrowth().find(
        (r) => r.github_id === item.github_id
      );
      return repo ? buildWhatIsThis(repo) : WHAT_IS_THIS_UNAVAILABLE;
    })();

  if (whatIsIt === WHAT_IS_THIS_UNAVAILABLE) {
    return null;
  }

  const whyInteresting = item.why_interesting;
  const telegram = buildTelegramPostFallback(item, whatIsIt, whyInteresting);

  return itemToWeeklyRadarWeirdFind(item, {
    whatIsIt,
    whyInteresting,
    ...telegram,
  });
}

/** Выбирает и оформляет weirdFindOfTheWeek для weekly-radar.json. */
export async function generateWeirdFindOfTheWeek(): Promise<WeeklyRadarWeirdFind | null> {
  const item = selectTopWeirdFindForExport(MIN_WEIRD_SCORE);
  if (!item) return null;
  return buildWeirdFindContent(item);
}
