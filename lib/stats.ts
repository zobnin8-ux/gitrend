import type { DashboardStats } from "./types";
import {
  countRepositories,
  countCreatedSince,
  getTopLanguage,
} from "./sqlite";
import { getRepositoriesWithGrowth } from "./analytics";

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

// Сводная статистика для главной страницы.
export function getDashboardStats(): DashboardStats {
  const total = countRepositories();
  const newThisWeek = countCreatedSince(isoDaysAgo(7));
  const newThisMonth = countCreatedSince(isoDaysAgo(30));
  const topLanguage = getTopLanguage();

  const enriched = getRepositoriesWithGrowth();

  let fastestGrowing = null as DashboardStats["fastestGrowing"];
  let mostPopular = null as DashboardStats["mostPopular"];

  for (const repo of enriched) {
    if (!fastestGrowing || repo.growth_7d > fastestGrowing.growth_7d) {
      fastestGrowing = repo;
    }
    if (!mostPopular || repo.stars > mostPopular.stars) {
      mostPopular = repo;
    }
  }

  // Если рост ещё не накоплен (нет истории), не показываем "0" как лидера.
  if (fastestGrowing && fastestGrowing.growth_7d <= 0) {
    fastestGrowing = null;
  }

  return {
    total,
    newThisWeek,
    newThisMonth,
    fastestGrowing,
    mostPopular,
    topLanguage,
  };
}
