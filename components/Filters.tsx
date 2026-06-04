"use client";

import type { RepositoryFilters } from "@/lib/types";

export type FilterField =
  | "name"
  | "description"
  | "language"
  | "topic"
  | "stars"
  | "age"
  | "activity";

interface Props {
  value: RepositoryFilters;
  onChange: (next: RepositoryFilters) => void;
  languages: string[];
  fields?: FilterField[];
  resultCount?: number;
}

const ALL_FIELDS: FilterField[] = [
  "name",
  "description",
  "language",
  "topic",
  "stars",
  "age",
  "activity",
];

export function Filters({
  value,
  onChange,
  languages,
  fields = ALL_FIELDS,
  resultCount,
}: Props) {
  const set = (patch: Partial<RepositoryFilters>) =>
    onChange({ ...value, ...patch });

  const numOrUndef = (v: string): number | undefined =>
    v === "" ? undefined : Number(v);

  const show = (f: FilterField) => fields.includes(f);

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Фильтры</h2>
        <div className="flex items-center gap-3">
          {typeof resultCount === "number" && (
            <span className="text-xs text-slate-500">
              Найдено: {resultCount}
            </span>
          )}
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            onClick={() =>
              onChange({ sort: value.sort, order: value.order })
            }
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {show("name") && (
          <div>
            <label className="label">По названию</label>
            <input
              className="input"
              placeholder="например, react"
              value={value.name ?? ""}
              onChange={(e) => set({ name: e.target.value || undefined })}
            />
          </div>
        )}

        {show("description") && (
          <div>
            <label className="label">По описанию</label>
            <input
              className="input"
              placeholder="ключевые слова"
              value={value.description ?? ""}
              onChange={(e) => set({ description: e.target.value || undefined })}
            />
          </div>
        )}

        {show("language") && (
          <div>
            <label className="label">Язык программирования</label>
            <select
              className="input"
              value={value.language ?? ""}
              onChange={(e) => set({ language: e.target.value || undefined })}
            >
              <option value="">Любой</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        )}

        {show("topic") && (
          <div>
            <label className="label">Тема (Topic)</label>
            <input
              className="input"
              placeholder="например, machine-learning"
              value={value.topic ?? ""}
              onChange={(e) => set({ topic: e.target.value || undefined })}
            />
          </div>
        )}

        {show("stars") && (
          <div>
            <label className="label">Звёзды (мин — макс)</label>
            <div className="flex gap-2">
              <input
                className="input"
                type="number"
                min={0}
                placeholder="мин"
                value={value.minStars ?? ""}
                onChange={(e) =>
                  set({ minStars: numOrUndef(e.target.value) })
                }
              />
              <input
                className="input"
                type="number"
                min={0}
                placeholder="макс"
                value={value.maxStars ?? ""}
                onChange={(e) =>
                  set({ maxStars: numOrUndef(e.target.value) })
                }
              />
            </div>
          </div>
        )}

        {show("age") && (
          <div>
            <label className="label">Возраст проекта (не старше)</label>
            <select
              className="input"
              value={value.maxAgeDays ?? ""}
              onChange={(e) => set({ maxAgeDays: numOrUndef(e.target.value) })}
            >
              <option value="">Любой</option>
              <option value="7">7 дней</option>
              <option value="30">30 дней</option>
              <option value="90">90 дней</option>
              <option value="365">1 год</option>
            </select>
          </div>
        )}

        {show("activity") && (
          <div>
            <label className="label">Активность (push не позже)</label>
            <select
              className="input"
              value={value.activeWithinDays ?? ""}
              onChange={(e) =>
                set({ activeWithinDays: numOrUndef(e.target.value) })
              }
            >
              <option value="">Любая</option>
              <option value="1">за сутки</option>
              <option value="7">за неделю</option>
              <option value="30">за месяц</option>
              <option value="90">за квартал</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
