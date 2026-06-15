"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  WeirdCategoryId,
  WeirdFilterId,
  WeirdFindDetails,
  WeirdFindItem,
  WeirdFindsResponse,
} from "@/lib/types";
import { WEIRD_CATEGORY_LABELS, WEIRD_CATEGORY_COLORS } from "@/lib/weird-constants";

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

function WeirdRepoCard({
  item,
  onSelect,
}: {
  item: WeirdFindItem;
  onSelect: (item: WeirdFindItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group flex w-full flex-col rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 group-hover:text-violet-700">
            {item.full_name}
          </p>
          <span
            className={
              "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium " +
              CATEGORY_COLORS[item.category]
            }
          >
            {item.category_label}
          </span>
        </div>
        <span className="shrink-0 rounded-lg bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
          {item.weird_score}
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-sm leading-snug text-slate-700">
        {item.short_description}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>⭐ {item.stars.toLocaleString("ru-RU")}</span>
        <span>+{item.growth_7d} / 7d</span>
      </div>
    </button>
  );
}

function WeirdDetailsDrawer({
  githubId,
  onClose,
}: {
  githubId: number;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<WeirdFindDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/weird/details?github_id=${githubId}`)
      .then((res) => res.json())
      .then((json: { ok: boolean; error?: string } & Partial<WeirdFindDetails>) => {
        if (cancelled) return;
        if (!json.ok) {
          setError(json.error ?? "Failed to load");
          return;
        }
        setDetails({
          item: json.item!,
          full_description: json.full_description ?? null,
          ai_summary: json.ai_summary ?? null,
          readme_summary: json.readme_summary ?? null,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Network error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [githubId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const item = details?.item;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-violet-100 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Детали репозитория"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Детали
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading && (
            <p className="text-sm text-slate-500">Загрузка…</p>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {item && (
            <div className="space-y-5">
              <div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-bold text-slate-900 hover:text-violet-700"
                >
                  {item.full_name}
                </a>
                <p className="mt-1 text-sm text-violet-600">Открыть на GitHub →</p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-violet-50 p-3">
                  <dt className="text-xs text-slate-500">Weird score</dt>
                  <dd className="font-bold text-violet-800">{item.weird_score}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Категория</dt>
                  <dd className="font-medium text-slate-800">{item.category_label}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Звёзды</dt>
                  <dd className="font-medium text-slate-800">
                    {item.stars.toLocaleString("ru-RU")}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Рост / 7d</dt>
                  <dd className="font-medium text-slate-800">+{item.growth_7d}</dd>
                </div>
              </dl>

              {details?.full_description && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Описание (GitHub)
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {details.full_description}
                  </p>
                </section>
              )}

              {details?.ai_summary && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    AI-описание
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {details.ai_summary}
                  </p>
                </section>
              )}

              {details?.readme_summary && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    README
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {details.readme_summary}
                  </p>
                </section>
              )}

              {item.topics.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Topics
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {item.topics.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export function WeirdFindsView() {
  const [filter, setFilter] = useState<WeirdFilterId>("most_weird");
  const [category, setCategory] = useState<WeirdCategoryId | "all">("all");
  const [data, setData] = useState<WeirdFindsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
        total_candidates?: number;
      };
      if (!json.ok) {
        setError(json.error ?? "Failed to load");
        return;
      }
      setData({
        items: json.items ?? [],
        total_candidates: json.total_candidates ?? 0,
        filter,
        category,
      });
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
        <p className="text-sm font-medium opacity-90">Discovery gallery</p>
        <p className="mt-1 text-lg font-semibold">
          Wow, somebody actually built this.
        </p>
        <p className="mt-1 text-sm opacity-85">
          Музей странных GitHub-находок — без аналитики и без лишних слов.
        </p>
      </div>

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
            {data.items.length} из {data.total_candidates} кандидатов ·{" "}
            {Object.values(WEIRD_CATEGORY_LABELS).join(", ")}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((item) => (
              <WeirdRepoCard
                key={item.github_id}
                item={item}
                onSelect={(i) => setSelectedId(i.github_id)}
              />
            ))}
          </div>
        </>
      )}

      {selectedId !== null && (
        <WeirdDetailsDrawer
          githubId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
