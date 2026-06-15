import { NextRequest, NextResponse } from "next/server";
import { getWeirdFinds } from "@/lib/weird";
import type { WeirdCategoryId, WeirdFilterId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_FILTERS: WeirdFilterId[] = [
  "most_weird",
  "fastest_growing",
  "most_starred",
  "most_discussed",
];

const VALID_CATEGORIES: (WeirdCategoryId | "all")[] = [
  "all",
  "desktop-pets",
  "developer-humor",
  "useless-brilliant",
  "retro-computing",
  "ai-oddities",
  "visual-experiments",
  "internet-culture",
  "unexpected-tools",
];

// GET /api/weird?filter=&category=&limit=
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const filterRaw = params.get("filter") ?? "most_weird";
    const categoryRaw = params.get("category") ?? "all";
    const limitRaw = params.get("limit");

    const filter = VALID_FILTERS.includes(filterRaw as WeirdFilterId)
      ? (filterRaw as WeirdFilterId)
      : "most_weird";

    const category = VALID_CATEGORIES.includes(categoryRaw as WeirdCategoryId | "all")
      ? (categoryRaw as WeirdCategoryId | "all")
      : "all";

    const limit = limitRaw ? Math.min(60, Math.max(1, parseInt(limitRaw, 10) || 36)) : 36;

    const data = getWeirdFinds({ filter, category, limit });

    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to load weird finds",
      },
      { status: 500 }
    );
  }
}
