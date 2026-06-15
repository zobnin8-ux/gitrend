"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  WeirdCategoryId,
  WeirdFilterId,
  WeirdFindItem,
  WeirdFindOfWeek,
  WeirdFindsResponse,
} from "@/lib/types";
import {
  WEIRD_CATEGORY_LABELS,
  WEIRD_CATEGORY_COLORS,
} from "@/lib/weird-constants";

const FILTER_OPTIONS: { id: WeirdFilterId; label: string }[] = [
  { id: "most_weird", label: "Most Weird" },
  { id: "fastest_growing", label: "Fastest Growing" },
  { id: "most_starred", label: "Most Starred" },
  { id: "most_discussed", label: "Most Discussed" },
];

const CATEGORY_CHIPS: { id: WeirdCategoryId | "all"; label: string; emoji: string }[] = [
  { id: "all", label: "Все", emoji: "🌀" },
  { id: "desktop-pets", label: "Pets", emoji: "🐱" },
  { id: "developer-humor", label: "Humor", emoji: "😂" },
  { id: "useless-brilliant", label: "Useless", emoji: "🎯" },
  { id: "retro-computing", label: "Retro", emoji: "💾" },
  { id: "ai-oddities", label: "AI Oddities", emoji: "🤖" },
  { id: "visual-experiments", label: "Visual", emoji: "🎨" },
  { id: "internet-culture", label: "Memes", emoji: "🌐" },
  { id: "unexpected-tools", label: "Why?", emoji: "❓" },
];

const CATEGORY_COLORS = WEIRD_CATEGORY_COLORS;

function WeirdRepoCard({ item }: { item: WeirdFindItem }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-violet-100 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md">
      <div className="mb-3 flex items-start gap-3">
        {item.owner_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.owner_avatar}
            alt=""
            className="h-10 w-10 rounded-xl border border-slate-100 bg-slate-50"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700">
            ?
          </div>
        )}
        <div className="min-w-0 flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 hover:text-violet-700"
          >
            {item.full_name}
          </a>
          <span
            className={
              "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium " +
              CATEGORY_COLORS[item.category]
            }
          >
            {item.category_label}
          </span>
        </div>
        <span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
          {item.weird_score}
        </span>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Что это?
        </p>
        <p
          className="line-clamp-2 text-sm leading-snug text-slate-700"
          title={item.what_is_this}
        >
          {item.what_is_this}
        </p>
      </div>

      <div className="mb-4 flex-1">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
          Почему интересно?
        </p>
        <p
          className="line-clamp-3 text-sm leading-snug text-slate-700"
          title={item.why_interesting}
        >
          {item.why_interesting}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>⭐ {item.stars.toLocaleString("ru-RU")}</span>
        <span>+{item.growth_7d} / 7d</span>
        {item.language && <span>{item.language}</span>}
      </div>
    </article>
  );
}

function FeaturedFind({
  find,
  onContentUpdate,
}: {
  find: WeirdFindOfWeek;
  onContentUpdate: (patch: Partial<WeirdFindOfWeek>) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"attention" | "linkedin" | "telegram">("attention");

  const item = find.item;
  const whatIsThis = find.what_is_this ?? item.what_is_this;
  const attention = find.attention ?? item.why_interesting;
  const linkedin = find.linkedin_post ?? "";
  const telegram = find.telegram_post ?? "";

  async function generateContent(
    type: "all" | "what_is_this" | "attention" | "linkedin" | "telegram"
  ) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/weird/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_id: item.github_id, type }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        what_is_this?: string;
        attention?: string;
        linkedin_post?: string;
        telegram_post?: string;
        error?: string;
      };
      if (!data.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      onContentUpdate({
        what_is_this: data.what_is_this ?? find.what_is_this,
        attention: data.attention ?? find.attention,
        linkedin_post: data.linkedin_post ?? find.linkedin_post,
        telegram_post: data.telegram_post ?? find.telegram_post,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  const activeText =
    tab === "attention" ? attention : tab === "linkedin" ? linkedin : telegram;

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          🏆
        </span>
        <div>
          <h2 className="text-lg font-bold text-violet-900">Weird Find of the Week</h2>
          <p className="text-xs text-violet-600">{find.week_key}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl font-bold text-slate-900 hover:text-violet-700"
          >
            {item.full_name}
          </a>
          <span
            className={
              "ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium " +
              CATEGORY_COLORS[item.category]
            }
          >
            {item.category_label}
          </span>

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-violet-100 bg-white/80 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Что это?
              </p>
              <p
                className="line-clamp-2 text-sm leading-snug text-slate-800"
                title={whatIsThis}
              >
                {whatIsThis}
              </p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white/80 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-600">
                Почему интересно?
              </p>
              <p
                className="line-clamp-3 text-sm leading-snug text-slate-800"
                title={attention}
              >
                {attention}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
            <span>⭐ {item.stars.toLocaleString("ru-RU")}</span>
            <span>+{item.growth_7d} stars / 7d</span>
            <span className="font-medium text-violet-700">weird score {item.weird_score}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={generating}
          onClick={() => generateContent("all")}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {generating ? "Generating…" : "✨ AI: описание + посты"}
        </button>
        <button
          type="button"
          disabled={generating}
          onClick={() => generateContent("what_is_this")}
          className="btn-ghost text-sm"
        >
          Обновить «Что это?»
        </button>
        <button
          type="button"
          disabled={generating}
          onClick={() => generateContent("attention")}
          className="btn-ghost text-sm"
        >
          Обновить «Почему интересно?»
        </button>
      </div>

      {(linkedin || telegram) && (
        <div className="mt-4">
          <div className="mb-2 flex gap-1">
            {(["attention", "linkedin", "telegram"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={
                  "rounded-lg px-3 py-1 text-xs font-medium " +
                  (tab === t
                    ? "bg-violet-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200")
                }
              >
                {t === "attention" ? "Summary" : t === "linkedin" ? "LinkedIn" : "Telegram"}
              </button>
            ))}
            {activeText && (
              <button
                type="button"
                onClick={() => copyText(activeText)}
                className="btn-ghost ml-auto text-xs"
              >
                Copy
              </button>
            )}
          </div>
          {activeText && (
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm text-slate-800">
              {activeText}
            </pre>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </section>
  );
}

export function WeirdFindsView() {
  const [filter, setFilter] = useState<WeirdFilterId>("most_weird");
  const [category, setCategory] = useState<WeirdCategoryId | "all">("all");
  const [data, setData] = useState<WeirdFindsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featured, setFeatured] = useState<WeirdFindOfWeek | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        filter,
        category,
        limit: "36",
      });
      const res = await fetch(`/api/weird?${params}`);
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        items?: WeirdFindItem[];
        find_of_week?: WeirdFindOfWeek | null;
        total_candidates?: number;
      };
      if (!json.ok) {
        setError(json.error ?? "Failed to load");
        return;
      }
      setData({
        items: json.items ?? [],
        find_of_week: json.find_of_week ?? null,
        total_candidates: json.total_candidates ?? 0,
        filter,
        category,
      });
      setFeatured(json.find_of_week ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [filter, category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4 text-white shadow-md">
        <p className="text-sm font-medium opacity-90">Discovery mode</p>
        <p className="mt-1 text-lg font-semibold">
          Holy crap, somebody actually built this.
        </p>
        <p className="mt-1 text-sm opacity-85">
          Странные, смешные и неожиданно популярные репозитории — отдельно от AI-аналитики.
        </p>
      </div>

      {featured && (
        <FeaturedFind
          find={featured}
          onContentUpdate={(patch) =>
            setFeatured((prev) => (prev ? { ...prev, ...patch } : prev))
          }
        />
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={
                "rounded-full px-3 py-1.5 text-sm font-medium transition " +
                (filter === opt.id
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setCategory(chip.id)}
              className={
                "rounded-full px-3 py-1.5 text-sm transition " +
                (category === chip.id
                  ? "bg-amber-400 font-medium text-amber-950"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-amber-50")
              }
            >
              {chip.emoji} {chip.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card p-8 text-center text-sm text-slate-500">
          Ищем странные уголки GitHub…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">
            Пока ничего достаточно weird не нашлось. Обновите данные GitHub — или смягчите
            фильтр.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Кандидатов в базе: {data.total_candidates}
          </p>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <p className="text-xs text-slate-400">
            {data.items.length} из {data.total_candidates} кандидатов · категории:{" "}
            {Object.values(WEIRD_CATEGORY_LABELS).join(", ")}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((item) => (
              <WeirdRepoCard key={item.github_id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
