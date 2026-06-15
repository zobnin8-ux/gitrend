import { NextRequest, NextResponse } from "next/server";
import { findWeirdItemById } from "@/lib/weird";
import {
  generateWeirdAttention,
  generateWeirdLinkedInPost,
  generateWeirdTelegramPost,
  generateWeirdWhatIsThis,
  generateWeirdContentBundle,
  isWeirdAiEnabled,
} from "@/lib/weird-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/weird/content { github_id, type?: "what_is_this"|"attention"|"linkedin"|"telegram"|"all" }
export async function POST(req: NextRequest) {
  if (!isWeirdAiEnabled()) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY is not configured" },
      { status: 400 }
    );
  }

  let body: { github_id?: number; type?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const githubId = body.github_id;
  if (!githubId || typeof githubId !== "number") {
    return NextResponse.json(
      { ok: false, error: "github_id is required" },
      { status: 400 }
    );
  }

  const item = findWeirdItemById(githubId);
  if (!item) {
    return NextResponse.json(
      { ok: false, error: "Repository not found in weird finds" },
      { status: 404 }
    );
  }

  const type = body.type ?? "all";

  try {
    if (type === "what_is_this") {
      const what_is_this = await generateWeirdWhatIsThis(item);
      return NextResponse.json({ ok: true, what_is_this });
    }
    if (type === "attention") {
      const attention = await generateWeirdAttention(item);
      return NextResponse.json({ ok: true, attention });
    }
    if (type === "linkedin") {
      const linkedin_post = await generateWeirdLinkedInPost(item);
      return NextResponse.json({ ok: true, linkedin_post });
    }
    if (type === "telegram") {
      const telegram_post = await generateWeirdTelegramPost(item);
      return NextResponse.json({ ok: true, telegram_post });
    }

    const content = await generateWeirdContentBundle(item);
    return NextResponse.json({ ok: true, ...content });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Content generation failed",
      },
      { status: 500 }
    );
  }
}
