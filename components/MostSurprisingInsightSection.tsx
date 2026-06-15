"use client";

import type { TrendInsights } from "@/lib/types";

function RepoChips({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((repo) => (
        <a
          key={repo}
          href={`https://github.com/${repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:text-brand-700"
        >
          {repo}
        </a>
      ))}
    </div>
  );
}

const DIMENSION_LABELS: Record<string, string> = {
  concentration: "Concentration",
  convergence: "Convergence",
  category_behavior: "Category behavior",
  acceleration: "Acceleration",
  attention_mismatch: "Attention mismatch",
  unexpected_winners: "Unexpected winners",
};

export function MostSurprisingInsightSection({
  report,
}: {
  report: TrendInsights;
}) {
  const insight = report.most_surprising_insight;
  if (!insight?.headline?.trim()) return null;

  return (
    <section className="card border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Most Surprising Insight
        </p>
        {insight.surprise_score > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            surprise score {insight.surprise_score}
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold leading-snug text-slate-900">
        {insight.headline}
      </h3>

      {insight.why_surprising && (
        <p className="mt-2 text-sm font-medium text-amber-900/90">
          {insight.why_surprising}
        </p>
      )}

      {insight.explanation && (
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
          {insight.explanation.split(/\n\s*\n/).map((para, i) => (
            <p key={i}>{para.trim()}</p>
          ))}
        </div>
      )}

      {insight.dimensions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {insight.dimensions.map((dim) => (
            <span
              key={dim}
              className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200"
            >
              {DIMENSION_LABELS[dim] ?? dim}
            </span>
          ))}
        </div>
      )}

      <RepoChips items={insight.evidence_repositories} />

      <p className="mt-4 text-xs text-slate-400">
        Якорь для LinkedIn-поста — пост строится вокруг этого неожиданного наблюдения.
      </p>
    </section>
  );
}
