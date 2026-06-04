import type { DataMaturity } from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/format";
import { MATURITY_VISUAL } from "@/lib/insights-visual";
import { StatusBadge } from "@/components/StatusBadge";

export function DataMaturityBlock({ maturity }: { maturity: DataMaturity }) {
  const badge = MATURITY_VISUAL[maturity.level];

  return (
    <section className="card border-slate-200 p-5">
      <h2 className="text-lg font-semibold text-slate-900">
        📊 Зрелость данных
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">Уровень:</span>
        {badge ? (
          <StatusBadge visual={badge} />
        ) : (
          <span className="text-sm font-medium text-slate-800">
            {maturity.level}
          </span>
        )}
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">История</dt>
          <dd className="font-medium text-slate-800">
            {formatNumber(maturity.history_days)} дней
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Снапшотов</dt>
          <dd className="font-medium text-slate-800">
            {formatNumber(maturity.snapshots_count)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Репозиториев с историей</dt>
          <dd className="font-medium text-slate-800">
            {formatNumber(maturity.repositories_with_history)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Последнее обновление</dt>
          <dd className="font-medium text-slate-800">
            {formatDateTime(maturity.last_snapshot_at)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-slate-600">
        <span className="font-medium text-slate-700">Описание: </span>
        {maturity.explanation}
      </p>
    </section>
  );
}
