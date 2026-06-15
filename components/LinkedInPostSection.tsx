"use client";

import { useEffect, useMemo, useState } from "react";
import { checkLinkedInPostQuality } from "@/lib/linkedin-post-quality";
import type { InsightPeriod, LinkedInPost, TrendInsights } from "@/lib/types";

type LinkedInPostTab = "english" | "russian";

interface LinkedInPostApiResponse {
  ok: boolean;
  linkedinPost?: LinkedInPost;
  report?: TrendInsights;
  error?: string;
}

export function LinkedInPostSection({
  report,
  period,
  onUpdate,
  disabled = false,
}: {
  report: TrendInsights;
  period: InsightPeriod;
  onUpdate: (report: TrendInsights) => void;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<LinkedInPostTab>("english");
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const post = report.linkedinPost;
  const hasPost = Boolean(post?.english?.trim());
  const quality = useMemo(
    () => (post?.english ? checkLinkedInPostQuality(post.english) : null),
    [post?.english]
  );

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied to clipboard");
    } catch {
      setError("Не удалось скопировать в буфер обмена");
    }
  }

  async function regenerate() {
    setRegenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/insights/linkedin-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report,
          period,
          analyzedRepositories: post?.analyzedRepositories,
        }),
      });
      const data = (await res.json()) as LinkedInPostApiResponse;
      if (!data.ok || !data.report) {
        setError(data.error ?? "Не удалось сгенерировать LinkedIn post");
        return;
      }
      onUpdate(data.report);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Сетевая ошибка при генерации"
      );
    } finally {
      setRegenerating(false);
    }
  }

  const busy = disabled || regenerating;
  const activeText =
    tab === "english" ? post?.english ?? "" : post?.russian ?? "";

  return (
    <section className="relative">
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 shadow-lg"
        >
          {toast}
        </div>
      )}

      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-xl" aria-hidden="true">
          💼
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">LinkedIn Post</h2>
          <p className="text-sm text-slate-500">
            Синтез выводов отчёта: executive summary, signals, implications,
            narrative shifts — не пересказ категории
          </p>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab("english")}
              disabled={busy}
              className={
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (tab === "english"
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100")
              }
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setTab("russian")}
              disabled={busy}
              className={
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (tab === "russian"
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100")
              }
            >
              Русский
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasPost && (
              <>
                <button
                  type="button"
                  onClick={() => copyText(activeText)}
                  disabled={busy}
                  className="btn-ghost"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => regenerate()}
                  disabled={busy}
                  className="btn-ghost"
                >
                  {regenerating ? "Regenerating…" : "Regenerate"}
                </button>
              </>
            )}
            {!hasPost && (
              <button
                type="button"
                onClick={() => regenerate()}
                disabled={busy}
                className="btn-primary"
              >
                {regenerating ? "Generating…" : "Generate post"}
              </button>
            )}
          </div>
        </div>

        {post?.sourceCategory && hasPost && (
          <p className="mb-3 text-xs text-slate-400">
            Primary category: {post.sourceCategory}
            {post.analyzedRepositories > 0 &&
              ` · Analyzed: ${post.analyzedRepositories} repositories`}
            {quality && ` · ${quality.wordCount} words`}
          </p>
        )}

        {hasPost && quality && !quality.ok && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Пост не прошёл проверку качества ({quality.reason}). Нажмите
            Regenerate для новой версии на основе полного отчёта.
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {hasPost ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
              {activeText}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            LinkedIn post ещё не сгенерирован. Нажмите «Generate post» или
            сформируйте отчёт заново.
          </p>
        )}
      </div>
    </section>
  );
}
