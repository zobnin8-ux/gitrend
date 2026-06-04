"use client";

import Link from "next/link";
import type { RepositoryWithGrowth } from "@/lib/types";
import {
  formatNumber,
  formatGrowth,
  formatPercent,
  formatDate,
  formatRelative,
} from "@/lib/format";
import { FavoriteButton } from "./FavoriteButton";

export interface RepoItem extends RepositoryWithGrowth {
  is_favorite: boolean;
}

export type ColumnId =
  | "repo"
  | "description"
  | "stars"
  | "forks"
  | "language"
  | "created"
  | "pushed"
  | "link"
  | "growth_24h"
  | "growth_7d"
  | "growth_30d"
  | "growth_24h_percent"
  | "growth_7d_percent"
  | "growth_30d_percent"
  | "topics"
  | "favorite";

const HEADERS: Record<ColumnId, string> = {
  repo: "Репозиторий",
  description: "Описание",
  stars: "Stars",
  forks: "Forks",
  language: "Language",
  created: "Created",
  pushed: "Last Push",
  link: "GitHub",
  growth_24h: "Рост за сутки",
  growth_7d: "Рост за 7 дней",
  growth_30d: "Рост за 30 дней",
  growth_24h_percent: "Рост в %",
  growth_7d_percent: "Рост в %",
  growth_30d_percent: "Рост в %",
  topics: "Темы",
  favorite: "",
};

const NUMERIC: Set<ColumnId> = new Set([
  "stars",
  "forks",
  "growth_24h",
  "growth_7d",
  "growth_30d",
  "growth_24h_percent",
  "growth_7d_percent",
  "growth_30d_percent",
]);

interface Props {
  items: RepoItem[];
  columns: ColumnId[];
  onFavoriteToggle?: (githubId: number, isFavorite: boolean) => void;
}

export function RepositoryTable({ items, columns, onFavoriteToggle }: Props) {
  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        Репозитории не найдены. Попробуйте изменить фильтры или нажмите
        «Обновить данные».
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            {columns.map((col) => (
              <th
                key={col}
                className={
                  "px-3 py-2.5 font-medium " +
                  (NUMERIC.has(col) ? "text-right" : "")
                }
              >
                {HEADERS[col]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.github_id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className={
                    "px-3 py-2.5 align-top " +
                    (NUMERIC.has(col) ? "text-right tabular-nums" : "")
                  }
                >
                  <Cell item={item} col={col} onFavoriteToggle={onFavoriteToggle} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({
  item,
  col,
  onFavoriteToggle,
}: {
  item: RepoItem;
  col: ColumnId;
  onFavoriteToggle?: (githubId: number, isFavorite: boolean) => void;
}) {
  switch (col) {
    case "favorite":
      return (
        <FavoriteButton
          githubId={item.github_id}
          initialFavorite={item.is_favorite}
          onToggle={(fav) => onFavoriteToggle?.(item.github_id, fav)}
        />
      );

    case "repo":
      return (
        <div className="flex items-start gap-2">
          <FavoriteButton
            githubId={item.github_id}
            initialFavorite={item.is_favorite}
            onToggle={(fav) => onFavoriteToggle?.(item.github_id, fav)}
          />
          <div className="min-w-0">
            <Link
              href={`/repo/${item.github_id}`}
              className="font-medium text-brand-700 hover:underline"
            >
              {item.full_name}
            </Link>
            {item.ai_summary && (
              <div className="mt-0.5 line-clamp-2 max-w-md text-xs text-slate-500">
                {item.ai_summary}
              </div>
            )}
          </div>
        </div>
      );

    case "description":
      return (
        <div className="max-w-md text-slate-600">
          <span className="line-clamp-2">{item.description || "—"}</span>
        </div>
      );

    case "stars":
      return <span className="font-medium">{formatNumber(item.stars)}</span>;

    case "forks":
      return <span>{formatNumber(item.forks)}</span>;

    case "language":
      return item.language ? (
        <span className="badge bg-slate-100 text-slate-700">{item.language}</span>
      ) : (
        <span className="text-slate-400">—</span>
      );

    case "created":
      return <span className="text-slate-500">{formatDate(item.created_at)}</span>;

    case "pushed":
      return (
        <span className="text-slate-500" title={formatDate(item.pushed_at)}>
          {formatRelative(item.pushed_at)}
        </span>
      );

    case "link":
      return (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 hover:underline"
        >
          Открыть ↗
        </a>
      );

    case "growth_24h":
      return <GrowthValue value={item.growth_24h} />;
    case "growth_7d":
      return <GrowthValue value={item.growth_7d} />;
    case "growth_30d":
      return <GrowthValue value={item.growth_30d} />;

    case "growth_24h_percent":
      return <PercentValue value={item.growth_24h_percent} />;
    case "growth_7d_percent":
      return <PercentValue value={item.growth_7d_percent} />;
    case "growth_30d_percent":
      return <PercentValue value={item.growth_30d_percent} />;

    case "topics":
      return (
        <div className="flex max-w-xs flex-wrap gap-1">
          {item.topics.slice(0, 4).map((t) => (
            <span key={t} className="badge bg-brand-50 text-brand-700">
              {t}
            </span>
          ))}
          {item.topics.length === 0 && <span className="text-slate-400">—</span>}
        </div>
      );

    default:
      return null;
  }
}

function GrowthValue({ value }: { value: number }) {
  const cls =
    value > 0 ? "text-emerald-600" : value < 0 ? "text-red-600" : "text-slate-400";
  return <span className={"font-medium " + cls}>{formatGrowth(value)}</span>;
}

function PercentValue({ value }: { value: number }) {
  const cls =
    value > 0 ? "text-emerald-600" : value < 0 ? "text-red-600" : "text-slate-400";
  return <span className={cls}>{formatPercent(value)}</span>;
}
