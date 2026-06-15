import { NextRequest, NextResponse } from "next/server";
import { leaveSession } from "@/lib/app-lifecycle-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function readSessionId(req: NextRequest): string {
  const fromQuery = req.nextUrl.searchParams.get("sessionId")?.trim();
  if (fromQuery) return fromQuery;
  return "";
}

export async function GET(req: NextRequest) {
  const sessionId = readSessionId(req);
  if (sessionId) leaveSession(sessionId);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  let sessionId = readSessionId(req);
  if (!sessionId) {
    try {
      const body = (await req.json()) as { sessionId?: string };
      sessionId = body.sessionId?.trim() ?? "";
    } catch {
      // sendBeacon may send empty body
    }
  }

  if (sessionId) leaveSession(sessionId);
  return NextResponse.json({ ok: true });
}
