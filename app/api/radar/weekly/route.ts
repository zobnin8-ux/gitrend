import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { refreshData } from "@/lib/github";
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

// GET /api/radar/weekly — текущий файл reports/weekly-radar.json
export async function GET() {
  const report = readExistingReport();
  if (!report) {
    return NextResponse.json({
      ok: true,
      exists: false,
      report: null,
    });
  }

  return NextResponse.json({
    ok: true,
    exists: true,
    report: {
      ...report,
      weirdFindOfTheWeek: report.weirdFindOfTheWeek ?? null,
    },
    trendsCount: report.trends.length,
    hasWeirdFind: Boolean(report.weirdFindOfTheWeek),
    filePath: "reports/weekly-radar.json",
  });
}

// POST /api/radar/weekly { refresh?: boolean }
export async function POST(req: NextRequest) {
  let refresh = false;
  try {
    const body = (await req.json()) as { refresh?: boolean };
    refresh = Boolean(body.refresh);
  } catch {
    // тело необязательно
  }

  if (refresh && !process.env.GITHUB_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Не задан GITHUB_TOKEN. Добавьте токен в .env.local для обновления данных GitHub.",
      },
      { status: 400 }
    );
  }

  try {
    if (refresh) {
      await refreshData();
    }

    const { report, filePath } = await generateAndWriteWeeklyRadar();

    return NextResponse.json({
      ok: true,
      report,
      trendsCount: report.trends.length,
      hasWeirdFind: Boolean(report.weirdFindOfTheWeek),
      filePath: filePath.replace(process.cwd(), "").replace(/^[/\\]/, ""),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Не удалось сформировать weekly-radar.json",
      },
      { status: 500 }
    );
  }
}
