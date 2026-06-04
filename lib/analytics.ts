import type {
  Repository,
  RepositoryWithGrowth,
  Snapshot,
} from "./types";
import { getAllRepositories, getAllSnapshots, getFavoriteIds } from "./sqlite";

const DAY_MS = 24 * 60 * 60 * 1000;

interface GrowthResult {
  growth: number;
  percent: number;
  perDay: number;
}

// Группировка снапшотов по github_id (предполагается сортировка по времени ASC).
function groupSnapshots(snapshots: Snapshot[]): Map<number, Snapshot[]> {
  const map = new Map<number, Snapshot[]>();
  for (const s of snapshots) {
    const list = map.get(s.github_id);
    if (list) {
      list.push(s);
    } else {
      map.set(s.github_id, [s]);
    }
  }
  return map;
}

// Базовое значение Stars "N дней назад": последний снапшот не позже точки отсечки.
// Если такого нет — берём самый ранний доступный снапшот (рост с начала наблюдения).
function computeGrowth(
  currentStars: number,
  snapshots: Snapshot[],
  days: number,
  now: number
): GrowthResult {
  if (!snapshots || snapshots.length === 0) {
    return { growth: 0, percent: 0, perDay: 0 };
  }

  const cutoff = now - days * DAY_MS;

  let base: Snapshot | null = null;
  for (const s of snapshots) {
    const t = Date.parse(s.checked_at);
    if (t <= cutoff) {
      base = s; // снапшоты отсортированы по возрастанию — берём последний подходящий
    } else {
      break;
    }
  }

  // Нет снапшота старше точки отсечки — используем самый ранний.
  if (!base) {
    base = snapshots[0];
  }

  const oldStars = base.stars;
  const growth = currentStars - oldStars;
  const percent = oldStars > 0 ? (growth / oldStars) * 100 : 0;
  const perDay = growth / days;

  return {
    growth,
    percent: round2(percent),
    perDay: round2(perDay),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Обогащает один репозиторий показателями роста.
export function enrichRepository(
  repo: Repository,
  snapshots: Snapshot[],
  now: number = Date.now()
): RepositoryWithGrowth {
  const g24 = computeGrowth(repo.stars, snapshots, 1, now);
  const g7 = computeGrowth(repo.stars, snapshots, 7, now);
  const g30 = computeGrowth(repo.stars, snapshots, 30, now);

  return {
    ...repo,
    growth_24h: g24.growth,
    growth_7d: g7.growth,
    growth_30d: g30.growth,
    growth_24h_percent: g24.percent,
    growth_7d_percent: g7.percent,
    growth_30d_percent: g30.percent,
    avg_per_day_7d: g7.perDay,
    avg_per_day_30d: g30.perDay,
  };
}

// Обогащает все репозитории показателями роста (одним проходом по снапшотам).
export function getRepositoriesWithGrowth(): RepositoryWithGrowth[] {
  const repos = getAllRepositories();
  const snapshots = getAllSnapshots();
  const grouped = groupSnapshots(snapshots);
  const now = Date.now();

  return repos.map((repo) =>
    enrichRepository(repo, grouped.get(repo.github_id) ?? [], now)
  );
}

function topBy(
  repos: RepositoryWithGrowth[],
  field: keyof RepositoryWithGrowth,
  n: number
): RepositoryWithGrowth[] {
  return [...repos]
    .sort((a, b) => Number(b[field]) - Number(a[field]))
    .slice(0, n);
}

// Кандидаты для AI-анализа трендов: объединение нескольких топов,
// дедупликация по github_id (раздел /insights).
export function getInsightRepositories(): RepositoryWithGrowth[] {
  const all = getRepositoriesWithGrowth();
  if (all.length === 0) return [];

  const favIds = getFavoriteIds();
  const now = Date.now();
  const cutoff30 = now - 30 * DAY_MS;

  const picked = new Map<number, RepositoryWithGrowth>();
  const add = (list: RepositoryWithGrowth[]) => {
    for (const r of list) picked.set(r.github_id, r);
  };

  add(topBy(all, "growth_24h", 50));
  add(topBy(all, "growth_7d", 50));
  add(topBy(all, "growth_30d", 50));
  add(topBy(all, "stars", 50));
  add(all.filter((r) => Date.parse(r.created_at) >= cutoff30));
  add(all.filter((r) => favIds.has(r.github_id)));

  return Array.from(picked.values());
}
