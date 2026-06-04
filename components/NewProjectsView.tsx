"use client";

import { useState } from "react";
import { RepositoryExplorer } from "./RepositoryExplorer";

const PERIODS: { key: number; label: string }[] = [
  { key: 7, label: "За неделю" },
  { key: 30, label: "За месяц" },
  { key: 90, label: "За квартал" },
];

export function NewProjectsView({ initialPeriod = 30 }: { initialPeriod?: number }) {
  const [period, setPeriod] = useState<number>(
    PERIODS.some((p) => p.key === initialPeriod) ? initialPeriod : 30
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Период:</span>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (period === p.key
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <RepositoryExplorer
        key={period}
        columns={["repo", "description", "stars", "language", "created", "link"]}
        preset={{ createdWithinDays: period, sort: "created_at", order: "desc" }}
        filterFields={["name", "description", "language", "topic", "stars"]}
        emptyHint="Нет проектов за выбранный период. Попробуйте увеличить период или обновить данные."
      />
    </div>
  );
}
