// Pre-computed topic density/concentration for Market Intelligence (no new data sources).

import type {
  InsightPeriod,
  RepositoryWithGrowth,
  TrendConcentration,
} from "./types";

export interface ComputedTopicMetric {
  trend: string;
  density: number;
  concentration: TrendConcentration;
  total_growth: number;
  top_repositories: { full_name: string; growth: number }[];
}

const TOPIC_PATTERNS: { label: string; patterns: string[] }[] = [
  { label: "AI Agents", patterns: ["agent", "agents", "agentic", "autogpt"] },
  { label: "MCP", patterns: ["mcp", "model-context-protocol"] },
  { label: "RAG", patterns: ["rag", "retrieval", "embedding", "vector"] },
  { label: "LLM Frameworks", patterns: ["llm", "langchain", "llama", "transformer"] },
  { label: "Voice AI", patterns: ["voice", "speech", "whisper", "tts", "audio ai"] },
  { label: "Automation", patterns: ["automation", "workflow", "n8n", "zapier"] },
  { label: "Local AI", patterns: ["local-llm", "local llm", "ollama", "llama.cpp"] },
  { label: "DevTools", patterns: ["devtools", "developer-tools", "devtool"] },
  { label: "Browser Automation", patterns: ["browser-use", "browser automation", "playwright"] },
];

function repoHaystack(repo: RepositoryWithGrowth): string {
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

function growthForPeriod(
  repo: RepositoryWithGrowth,
  period: InsightPeriod
): number {
  if (period === "daily") return repo.growth_24h;
  if (period === "monthly") return repo.growth_30d;
  return repo.growth_7d;
}

function concentrationFromGrowth(
  growths: number[]
): TrendConcentration {
  const positive = growths.filter((g) => g > 0);
  if (positive.length <= 1) return "высокая";
  const total = positive.reduce((a, b) => a + b, 0);
  if (total <= 0) return "низкая";
  const sorted = [...positive].sort((a, b) => b - a);
  const top2 = (sorted[0] + (sorted[1] ?? 0)) / total;
  if (top2 >= 0.65) return "высокая";
  if (top2 >= 0.4) return "средняя";
  return "низкая";
}

export function computeTopicMetrics(
  repositories: RepositoryWithGrowth[],
  period: InsightPeriod = "weekly"
): ComputedTopicMetric[] {
  const results: ComputedTopicMetric[] = [];

  for (const { label, patterns } of TOPIC_PATTERNS) {
    const matched: RepositoryWithGrowth[] = [];
    for (const repo of repositories) {
      const hay = repoHaystack(repo);
      if (patterns.some((p) => hay.includes(p))) {
        matched.push(repo);
      }
    }
    if (matched.length === 0) continue;

    const withGrowth = matched.map((r) => ({
      full_name: r.full_name,
      growth: growthForPeriod(r, period),
    }));
    const growths = withGrowth.map((w) => w.growth);
    const totalGrowth = growths.reduce((a, b) => a + b, 0);
    const top = [...withGrowth].sort((a, b) => b.growth - a.growth).slice(0, 5);

    results.push({
      trend: label,
      density: matched.length,
      concentration: concentrationFromGrowth(growths),
      total_growth: totalGrowth,
      top_repositories: top,
    });
  }

  return results.sort((a, b) => b.density - a.density);
}
