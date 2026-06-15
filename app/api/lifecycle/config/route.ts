import { NextResponse } from "next/server";
import { lifecycleStatus } from "@/lib/app-lifecycle-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = lifecycleStatus();
  return NextResponse.json({ ok: true, ...status });
}
