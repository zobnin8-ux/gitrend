import { NextRequest, NextResponse } from "next/server";
import { registerSession } from "@/lib/app-lifecycle-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let sessionId = "";
  try {
    const body = (await req.json()) as { sessionId?: string };
    sessionId = body.sessionId?.trim() ?? "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });
  }

  registerSession(sessionId);
  return NextResponse.json({ ok: true });
}
