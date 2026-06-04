import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getInsightRepositories } from "@/lib/analytics";
import { generateTrendInsights, parseTrendInsightsJson } from "@/lib/ai";
import {
  getPreviousTrendReport,
  getRecentTrendReport,
  saveTrendReport,
} from "@/lib/sqlite";
import { getDataMaturity } from "@/lib/data-maturity";
import type {
  InsightPeriod,
  RepositoryWithGrowth,
  TrendInsights,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RELEVANCE_KEYWORDS = [
  "ai",
  "a.i",
  "artificial intelligence",
  "llm",
  "gpt",
  "agent",
  "agents",
  "agentic",
  "automation",
  "automate",
  "workflow",
  "rag",
  "mcp",
  "developer tool",
  "developer-tools",
  "devtool",
  "data",
  "voice",
  "speech",
  "browser automation",
  "browser-use",
  "local ai",
  "local-llm",
  "local llm",
  "open-source ai",
  "machine learning",
  "machine-learning",
  "deep learning",
  "neural",
  "chatbot",
  "prompt",
  "vector",
  "embedding",
  "retrieval",
  "transformer",
  "diffusion",
];

const MIN_RELEVANT = 8;

function isRelevant(repo: RepositoryWithGrowth): boolean {
  const haystack = [
    repo.full_name,
    repo.name,
    repo.description ?? "",
    repo.ai_summary ?? "",
    repo.language ?? "",
    repo.topics.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return RELEVANCE_KEYWORDS.some((kw) => haystack.includes(kw));
}

function sortFieldForPeriod(
  period: InsightPeriod
): keyof RepositoryWithGrowth {
  if (period === "daily") return "growth_24h";
  if (period === "monthly") return "growth_30d";
  return "growth_7d";
}

function buildPayloadHash(
  period: InsightPeriod,
  repos: RepositoryWithGrowth[]
): string {
  const signature = repos
    .map(
      (r) =>
        `${r.github_id}:${r.stars}:${r.growth_24h}:${r.growth_7d}:${r.growth_30d}`
    )
    .join("|");
  return crypto
    .createHash("sha256")
    .update(period + "::" + signature)
    .digest("hex");
}

// POST /api/ai/insights  { period?, force? }
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY is not configured" },
      { status: 400 }
    );
  }

  let body: { period?: InsightPeriod; force?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // тело необязательно
  }

  const period: InsightPeriod = body.period ?? "weekly";
  const force = Boolean(body.force);

  try {
    const candidates = getInsightRepositories();

    // Фильтр релевантности; если совпадений мало — берём топ по росту без фильтра.
    const relevant = candidates.filter(isRelevant);
    const base = relevant.length >= MIN_RELEVANT ? relevant : candidates;

    // Сортируем по метрике периода и берём топ-80.
    const field = sortFieldForPeriod(period);
    const selected = [...base]
      .sort((a, b) => Number(b[field]) - Number(a[field]))
      .slice(0, 50);

    const payloadHash = buildPayloadHash(period, selected);
    const previousReport = getPreviousTrendReport(period, payloadHash);
    const dataMaturity = getDataMaturity();

    // Кэш: свежий отчёт за последние 24 часа с тем же хэшем.
    if (!force) {
      const cached = getRecentTrendReport(period, payloadHash, 24);
      if (cached) {
        return NextResponse.json({
          ok: true,
          cached: true,
          report: parseTrendInsightsJson(cached),
          data_maturity: dataMaturity,
        });
      }
    }

    const report = await generateTrendInsights(
      selected,
      period,
      previousReport,
      dataMaturity
    );
    saveTrendReport(period, payloadHash, JSON.stringify(report));

    return NextResponse.json({ ok: true, cached: false, report, data_maturity: dataMaturity });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Ошибка генерации отчёта",
      },
      { status: 500 }
    );
  }
}
