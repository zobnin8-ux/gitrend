import { NextRequest, NextResponse } from "next/server";
import { getRepositoriesWithGrowth } from "@/lib/analytics";
import { applyFilters, parseFiltersFromParams } from "@/lib/filters";
import { getFavoriteIds, getDistinctLanguages } from "@/lib/sqlite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/repositories — список репозиториев с показателями роста и фильтрами.
export async function GET(req: NextRequest) {
  try {
    const filters = parseFiltersFromParams(req.nextUrl.searchParams);
    const favoriteIds = getFavoriteIds();
    const all = getRepositoriesWithGrowth();
    const filtered = applyFilters(all, filters, favoriteIds);

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    const items =
      limit && Number.isFinite(limit) ? filtered.slice(0, limit) : filtered;

    return NextResponse.json({
      ok: true,
      total: filtered.length,
      languages: getDistinctLanguages(),
      items: items.map((repo) => ({
        ...repo,
        is_favorite: favoriteIds.has(repo.github_id),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Ошибка чтения данных",
      },
      { status: 500 }
    );
  }
}
