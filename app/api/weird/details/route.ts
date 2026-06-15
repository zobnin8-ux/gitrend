import { NextRequest, NextResponse } from "next/server";
import { getWeirdFindDetails } from "@/lib/weird";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/weird/details?github_id=
export async function GET(req: NextRequest) {
  const githubIdRaw = req.nextUrl.searchParams.get("github_id");
  const githubId = githubIdRaw ? parseInt(githubIdRaw, 10) : NaN;

  if (!githubIdRaw || Number.isNaN(githubId)) {
    return NextResponse.json(
      { ok: false, error: "github_id is required" },
      { status: 400 }
    );
  }

  try {
    const details = await getWeirdFindDetails(githubId);
    if (!details) {
      return NextResponse.json(
        { ok: false, error: "Repository not found in weird finds" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, ...details });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to load details",
      },
      { status: 500 }
    );
  }
}
