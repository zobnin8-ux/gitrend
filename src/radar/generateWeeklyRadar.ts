import fs from "node:fs";
import path from "node:path";
import { getRepositoriesWithGrowth } from "@/lib/analytics";
import { getAllSnapshots } from "@/lib/sqlite";
import type { RepositoryWithGrowth, Snapshot } from "@/lib/types";
import {
  categoryLabelRu,
  detectPrimaryCategory,
} from "./categories";
import type {
  GenerateWeeklyRadarOptions,
  RadarCategory,
  RadarSignalStrength,
  WeeklyRadarReport,
  WeeklyRadarTrend,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_REPOS_IN_TREND = 2;
const MAX_TRENDS = 3;
const MIN_STARS = 150;
const MIN_WEEKLY_GROWTH = 80;
const MIN_WEEKLY_GROWTH_PERCENT = 3;
const MAX_TOP_REPO_SHARE = 0.72;
const ACTIVE_PUSH_DAYS = 14;
const MIN_HISTORY_SPAN_DAYS = 2;

interface CategoryCluster {
  category: RadarCategory;
  repos: RepositoryWithGrowth[];
  totalGrowth: number;
  score: number;
}

function isoWeekString(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function groupSnapshotsByRepo(
  snapshots: Snapshot[]
): Map<number, Snapshot[]> {
  const map = new Map<number, Snapshot[]>();
  for (const s of snapshots) {
    const list = map.get(s.github_id);
    if (list) list.push(s);
    else map.set(s.github_id, [s]);
  }
  return map;
}

function hasSustainedWeeklyGrowth(
  repo: RepositoryWithGrowth,
  snapshots: Snapshot[]
): boolean {
  if (repo.growth_7d < MIN_WEEKLY_GROWTH) return false;
  if (repo.growth_7d_percent < MIN_WEEKLY_GROWTH_PERCENT) return false;
  if (repo.stars < MIN_STARS) return false;

  const pushedAt = Date.parse(repo.pushed_at);
  if (Number.isNaN(pushedAt)) return false;
  if (Date.now() - pushedAt > ACTIVE_PUSH_DAYS * DAY_MS) return false;

  if (snapshots.length < 2) return false;
  const sorted = [...snapshots].sort(
    (a, b) => Date.parse(a.checked_at) - Date.parse(b.checked_at)
  );
  const span =
    Date.parse(sorted[sorted.length - 1].checked_at) -
    Date.parse(sorted[0].checked_at);
  if (span < MIN_HISTORY_SPAN_DAYS * DAY_MS) return false;

  const name = repo.full_name.toLowerCase();
  if (name.endsWith("-fork") || name.includes("/fork-")) return false;

  return true;
}

function isEligibleRepo(
  repo: RepositoryWithGrowth,
  snapshotMap: Map<number, Snapshot[]>
): boolean {
  const snaps = snapshotMap.get(repo.github_id) ?? [];
  return hasSustainedWeeklyGrowth(repo, snaps);
}

function clusterScore(
  category: RadarCategory,
  repos: RepositoryWithGrowth[]
): number {
  const growths = repos.map((r) => r.growth_7d);
  const total = growths.reduce((a, b) => a + b, 0);
  const top = Math.max(...growths);
  const share = total > 0 ? top / total : 1;
  const diversityBonus = share <= MAX_TOP_REPO_SHARE ? 1.25 : 0.6;
  const densityBonus = repos.length >= 3 ? 1.2 : 1;
  const categoryBoost =
    category === "other" ? 0.85 : 1;
  return total * repos.length * diversityBonus * densityBonus * categoryBoost;
}

function signalStrength(
  repos: RepositoryWithGrowth[],
  totalGrowth: number
): RadarSignalStrength {
  const growths = repos.map((r) => r.growth_7d);
  const topShare =
    totalGrowth > 0 ? Math.max(...growths) / totalGrowth : 1;

  if (
    repos.length >= 3 &&
    totalGrowth >= 400 &&
    topShare <= MAX_TOP_REPO_SHARE
  ) {
    return "high";
  }
  if (repos.length >= 2 && totalGrowth >= MIN_WEEKLY_GROWTH * 2) {
    return "medium";
  }
  return "low";
}

function buildTrendCopy(
  category: RadarCategory,
  repos: RepositoryWithGrowth[]
): Pick<WeeklyRadarTrend, "title" | "summary" | "whyTrending"> {
  const label = categoryLabelRu(category);
  const names = repos.slice(0, 4).map((r) => r.name);
  const totalGrowth = repos.reduce((s, r) => s + r.growth_7d, 0);
  const count = repos.length;

  const title =
    category === "ai-agents"
      ? "Рост AI-агентов для разработки"
      : category === "mcp"
        ? "Рост экосистемы MCP"
        : category === "llm"
          ? "Ускорение проектов вокруг LLM"
          : `Синхронный рост проектов: ${label}`;

  const summary =
    count >= 3
      ? `Сразу ${count} независимых репозиториев в категории «${label}» показали заметный недельный рост (суммарно +${totalGrowth} stars).`
      : `Несколько проектов в категории «${label}» (${names.join(", ")}) одновременно набирают популярность (+${totalGrowth} stars за неделю).`;

  const whyTrending =
    count >= 3
      ? `Рост распределён между несколькими проектами (${names.join(", ")}), что указывает на интерес сообщества к направлению «${label}», а не к одному вирусному репозиторию.`
      : `Одновременный недельный рост у ${count} проектов в одной категории — признак формирования направления «${label}» среди разработчиков.`;

  return { title, summary, whyTrending };
}

function buildClusters(
  repos: RepositoryWithGrowth[]
): CategoryCluster[] {
  const byCategory = new Map<RadarCategory, RepositoryWithGrowth[]>();

  for (const repo of repos) {
    const cat = detectPrimaryCategory(repo);
    const list = byCategory.get(cat) ?? [];
    list.push(repo);
    byCategory.set(cat, list);
  }

  const clusters: CategoryCluster[] = [];

  for (const [category, list] of byCategory) {
    if (category === "other") continue;
    if (list.length < MIN_REPOS_IN_TREND) continue;

    const sorted = [...list].sort((a, b) => b.growth_7d - a.growth_7d);
    const topShare =
      sorted.reduce((s, r) => s + r.growth_7d, 0) > 0
        ? sorted[0].growth_7d / sorted.reduce((s, r) => s + r.growth_7d, 0)
        : 1;
    if (topShare > MAX_TOP_REPO_SHARE) continue;

    const totalGrowth = sorted.reduce((s, r) => s + r.growth_7d, 0);
    if (totalGrowth < MIN_WEEKLY_GROWTH * MIN_REPOS_IN_TREND) continue;

    clusters.push({
      category,
      repos: sorted.slice(0, 5),
      totalGrowth,
      score: clusterScore(category, sorted),
    });
  }

  return clusters.sort((a, b) => b.score - a.score);
}

function clusterToTrend(cluster: CategoryCluster): WeeklyRadarTrend {
  const copy = buildTrendCopy(cluster.category, cluster.repos);
  return {
    ...copy,
    category: cluster.category,
    signalStrength: signalStrength(cluster.repos, cluster.totalGrowth),
    repos: cluster.repos.map((r) => ({
      name: r.name,
      url: r.url,
      stars: r.stars,
      starsDelta: r.growth_7d,
    })),
  };
}

/**
 * Собирает данные недели, выделяет 1–3 GitHub-тренда, возвращает отчёт.
 * Не генерирует контент для Telegram и не оценивает «уровни радара будущего».
 */
export function generateWeeklyRadar(
  options: GenerateWeeklyRadarOptions = {}
): WeeklyRadarReport {
  const now = options.now ?? new Date();
  const maxTrends = Math.min(3, Math.max(1, options.maxTrends ?? MAX_TRENDS));

  const snapshotMap = groupSnapshotsByRepo(getAllSnapshots());
  const eligible = getRepositoriesWithGrowth().filter((r) =>
    isEligibleRepo(r, snapshotMap)
  );

  const clusters = buildClusters(eligible);
  const trends = clusters.slice(0, maxTrends).map(clusterToTrend);

  return {
    week: isoWeekString(now),
    generatedAt: now.toISOString(),
    trends,
  };
}

export function weeklyRadarReportPath(projectRoot?: string): string {
  const root = projectRoot ?? process.cwd();
  return path.join(root, "reports", "weekly-radar.json");
}

export function writeWeeklyRadarReport(
  report: WeeklyRadarReport,
  projectRoot?: string
): string {
  const filePath = weeklyRadarReportPath(projectRoot);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2) + "\n", "utf8");
  return filePath;
}

export function generateAndWriteWeeklyRadar(
  options: GenerateWeeklyRadarOptions = {}
): { report: WeeklyRadarReport; filePath: string } {
  const report = generateWeeklyRadar(options);
  const filePath = writeWeeklyRadarReport(report);
  return { report, filePath };
}
