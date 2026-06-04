import { NextResponse } from "next/server";
import { refreshData } from "@/lib/github";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/refresh — запускает обновление данных из GitHub API.
export async function POST() {
  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Не задан GITHUB_TOKEN. Создайте файл .env.local на основе .env.example и добавьте токен GitHub.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await refreshData();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Неизвестная ошибка обновления",
      },
      { status: 500 }
    );
  }
}
