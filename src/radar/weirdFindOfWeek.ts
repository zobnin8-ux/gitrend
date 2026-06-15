import type { WeirdFindItem } from "@/lib/types";
import {
  generateWeirdRadarWeeklyExport,
  isWeirdAiEnabled,
} from "@/lib/weird-ai";
import { selectTopWeirdFindForExport } from "@/lib/weird";
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

function itemToWeeklyRadarWeirdFind(
  item: WeirdFindItem,
  content: {
    shortDescription: string;
    telegramTitle: string;
    telegramPost: string;
  }
): WeeklyRadarWeirdFind {
  return {
    title: displayTitle(item),
    repo: item.full_name,
    url: item.url,
    category: item.category_label,
    shortDescription: content.shortDescription,
    stars: item.stars,
    weeklyGrowth: item.growth_7d,
    weirdScore: item.weird_score,
    telegramTitle: content.telegramTitle,
    telegramPost: content.telegramPost,
  };
}

/** Выбирает ONE winner и оформляет weirdFindOfTheWeek для weekly-radar.json. */
export async function generateWeirdFindOfTheWeek(): Promise<WeeklyRadarWeirdFind | null> {
  const item = selectTopWeirdFindForExport(MIN_WEIRD_SCORE);
  if (!item?.short_description?.trim()) return null;

  if (!isWeirdAiEnabled()) {
    const content = await generateWeirdRadarWeeklyExport(item);
    return itemToWeeklyRadarWeirdFind(item, content);
  }

  try {
    const content = await generateWeirdRadarWeeklyExport(item);
    return itemToWeeklyRadarWeirdFind(item, content);
  } catch {
    return null;
  }
}
