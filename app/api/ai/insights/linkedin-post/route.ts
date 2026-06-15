import { NextRequest, NextResponse } from "next/server";
import { regenerateLinkedInPost } from "@/lib/ai";
import { patchLatestTrendReport } from "@/lib/sqlite";
import type { InsightPeriod, TrendInsights } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/ai/insights/linkedin-post { report, period?, analyzedRepositories? }
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY is not configured" },
      { status: 400 }
    );
  }

  let body: {
    report?: TrendInsights;
    period?: InsightPeriod;
    analyzedRepositories?: number;
  } = {};

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.report) {
    return NextResponse.json(
      { ok: false, error: "Report is required" },
      { status: 400 }
    );
  }

  const period: InsightPeriod = body.period ?? "weekly";
  const analyzedRepositories =
    body.analyzedRepositories ?? body.report.linkedinPost?.analyzedRepositories ?? 0;

  try {
    const linkedinPost = await regenerateLinkedInPost(
      body.report,
      analyzedRepositories
    );

    const updatedReport: TrendInsights = {
      ...body.report,
      linkedinPost,
    };

    patchLatestTrendReport(period, JSON.stringify(updatedReport));

    return NextResponse.json({
      ok: true,
      linkedinPost,
      report: updatedReport,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to regenerate LinkedIn post",
      },
      { status: 500 }
    );
  }
}
