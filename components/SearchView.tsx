"use client";

import { useEffect, useState } from "react";
import { RepositoryExplorer } from "./RepositoryExplorer";

export function SearchView({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="label">Глобальный поиск</label>
        <input
          autoFocus
          className="input"
          placeholder="Поиск по названию, описанию и темам…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="mt-2 text-xs text-slate-400">
          Поиск идёт по уже загруженным репозиториям в локальной базе.
        </p>
      </div>

      {debounced.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          Введите запрос, чтобы найти репозитории.
        </div>
      ) : (
        <RepositoryExplorer
          key={debounced}
          columns={[
            "repo",
            "description",
            "stars",
            "language",
            "topics",
            "link",
          ]}
          preset={{ q: debounced, sort: "stars", order: "desc" }}
          filterFields={["language", "stars"]}
          emptyHint="Ничего не найдено. Попробуйте другой запрос."
        />
      )}
    </div>
  );
}
