"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RepositoryFilters } from "@/lib/types";
import { Filters, type FilterField } from "./Filters";
import { RepositoryTable, type ColumnId, type RepoItem } from "./RepositoryTable";

interface ApiResponse {
  ok: boolean;
  total: number;
  languages: string[];
  items: RepoItem[];
  error?: string;
}

interface Props {
  columns: ColumnId[];
  // Фиксированные параметры раздела (сортировка, спец-фильтры), не меняются пользователем.
  preset?: Partial<RepositoryFilters>;
  filterFields?: FilterField[];
  limit?: number;
  emptyHint?: string;
}

export function RepositoryExplorer({
  columns,
  preset = {},
  filterFields,
  limit,
  emptyHint,
}: Props) {
  const [filters, setFilters] = useState<RepositoryFilters>({});
  const [items, setItems] = useState<RepoItem[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const presetKey = JSON.stringify(preset);

  const buildQuery = useCallback((): string => {
    const merged: Record<string, unknown> = { ...preset, ...filters };
    // preset.sort/order имеют приоритет, если пользователь не задал свои.
    if (preset.sort && !filters.sort) merged.sort = preset.sort;
    if (preset.order && !filters.order) merged.order = preset.order;

    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(merged)) {
      if (val === undefined || val === null || val === "") continue;
      params.set(key, String(val));
    }
    if (limit) params.set("limit", String(limit));
    return params.toString();
  }, [filters, presetKey, limit]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const query = buildQuery();
    fetch(`/api/repositories?${query}`)
      .then((res) => res.json() as Promise<ApiResponse>)
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) {
          setError(data.error ?? "Ошибка загрузки");
          return;
        }
        setItems(data.items);
        setTotal(data.total);
        if (data.languages?.length) setLanguages(data.languages);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Сетевая ошибка");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buildQuery]);

  const handleFavoriteToggle = useCallback(
    (githubId: number, isFav: boolean) => {
      setItems((prev) =>
        prev.map((it) =>
          it.github_id === githubId ? { ...it, is_favorite: isFav } : it
        )
      );
    },
    []
  );

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="card p-8 text-center text-sm text-slate-500">
          Загрузка…
        </div>
      );
    }
    if (error) {
      return (
        <div className="card p-8 text-center text-sm text-red-600">{error}</div>
      );
    }
    if (items.length === 0 && emptyHint) {
      return (
        <div className="card p-8 text-center text-sm text-slate-500">
          {emptyHint}
        </div>
      );
    }
    return (
      <RepositoryTable
        items={items}
        columns={columns}
        onFavoriteToggle={handleFavoriteToggle}
      />
    );
  }, [loading, error, items, columns, emptyHint, handleFavoriteToggle]);

  return (
    <div className="space-y-4">
      <Filters
        value={filters}
        onChange={setFilters}
        languages={languages}
        fields={filterFields}
        resultCount={total}
      />
      {content}
    </div>
  );
}
