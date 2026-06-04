import { NextRequest, NextResponse } from "next/server";
import { getFavoriteIds, toggleFavorite } from "@/lib/sqlite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/favorites — список id избранных репозиториев.
export async function GET() {
  const ids = Array.from(getFavoriteIds());
  return NextResponse.json({ ok: true, ids });
}

// POST /api/favorites { github_id } — переключить избранное.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { github_id?: number };
    const id = Number(body.github_id);
    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { ok: false, error: "Некорректный github_id" },
        { status: 400 }
      );
    }
    const isFavorite = toggleFavorite(id, new Date().toISOString());
    return NextResponse.json({ ok: true, github_id: id, is_favorite: isFavorite });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Ошибка изменения избранного",
      },
      { status: 500 }
    );
  }
}
