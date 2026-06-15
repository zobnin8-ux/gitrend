import { NextRequest, NextResponse } from "next/server";
import { heartbeatSession } from "@/lib/app-lifecycle-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let sessionId = "";
  try {
    const body = (await req.json()) as { sessionId?: string };
    sessionId = body.sessionId?.trim() ?? "";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  heartbeatSession(sessionId);
  return NextResponse.json({ ok: true });
}
