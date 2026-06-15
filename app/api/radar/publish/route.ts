import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { refreshData } from "@/lib/github";
import { commitWeeklyRadarReport } from "@/src/radar/commitReport";
import {
  generateAndWriteWeeklyRadar,
  weeklyRadarReportPath,
} from "@/src/radar/generateWeeklyRadar";
import type { WeeklyRadarReport } from "@/src/radar/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function readExistingReport(): WeeklyRadarReport | null {
  const filePath = weeklyRadarReportPath();
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as WeeklyRadarReport;
  } catch {
    return null;
  }
}

// POST /api/radar/publish { regenerate?: boolean, refresh?: boolean }
export async function POST(req: NextRequest) {
  let regenerate = false;
  let refresh = false;

  try {
    const body = (await req.json()) as {
      regenerate?: boolean;
      refresh?: boolean;
    };
    regenerate = Boolean(body.regenerate);
    refresh = Boolean(body.refresh);
  } catch {
    // тело необязательно
  }

  if ((regenerate && refresh) || refresh) {
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Не задан GITHUB_TOKEN. Добавьте токен в .env.local для обновления данных GitHub.",
        },
        { status: 400 }
      );
    }
  }

  try {
    if (refresh) {
      await refreshData();
    }

    let report: WeeklyRadarReport | null = null;

    if (regenerate) {
      const generated = await generateAndWriteWeeklyRadar();
      report = generated.report;
    } else {
      report = readExistingReport();
      if (!report) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Файл reports/weekly-radar.json не найден. Сначала сформируйте Radar JSON.",
          },
          { status: 400 }
        );
      }
    }

    const result = commitWeeklyRadarReport({
      report: report ?? undefined,
      push: true,
    });

    return NextResponse.json({
      ok: true,
      report,
      trendsCount: report?.trends.length ?? 0,
      committed: result.committed,
      pushed: result.pushed,
      message: result.message,
      rawUrl:
        "https://raw.githubusercontent.com/zobnin8-ux/gitrend/main/reports/weekly-radar.json",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Не удалось опубликовать weekly-radar.json на GitHub",
      },
      { status: 500 }
    );
  }
}
