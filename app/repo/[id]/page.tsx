import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getRepository, getSnapshots, isFavorite } from "@/lib/sqlite";
import { enrichRepository } from "@/lib/analytics";
import { GrowthChart, type ChartPoint } from "@/components/GrowthChart";
import { FavoriteButton } from "@/components/FavoriteButton";
import {
  formatNumber,
  formatGrowth,
  formatPercent,
  formatDate,
  formatRelative,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default function RepositoryPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const repo = getRepository(id);
  if (!repo) notFound();

  const snapshots = getSnapshots(id);
  const enriched = enrichRepository(repo, snapshots);
  const favorite = isFavorite(id);

  const starPoints: ChartPoint[] = snapshots.map((s) => ({
    checked_at: s.checked_at,
    value: s.stars,
  }));
  const forkPoints: ChartPoint[] = snapshots.map((s) => ({
    checked_at: s.checked_at,
    value: s.forks,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/popular"
        className="inline-block text-sm text-brand-600 hover:underline"
      >
        ← К списку репозиториев
      </Link>

      {/* Общая информация */}
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {repo.owner_avatar && (
              <Image
                src={repo.owner_avatar}
                alt={repo.owner}
                width={56}
                height={56}
                className="rounded-lg"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {repo.full_name}
              </h1>
              {repo.description && (
                <p className="mt-1 max-w-2xl text-slate-600">
                  {repo.description}
                </p>
              )}
              {repo.ai_summary && (
                <p className="mt-2 max-w-2xl rounded-lg bg-brand-50 p-3 text-sm text-slate-700">
                  <span className="font-medium text-brand-700">AI-описание:</span>{" "}
                  {repo.ai_summary}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {repo.language && (
                  <span className="badge bg-slate-100 text-slate-700">
                    {repo.language}
                  </span>
                )}
                {repo.topics.map((t) => (
                  <span key={t} className="badge bg-brand-50 text-brand-700">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <FavoriteButton
              githubId={repo.github_id}
              initialFavorite={favorite}
              withLabel
            />
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Открыть на GitHub ↗
            </a>
          </div>
        </div>
      </section>

      {/* Текущая статистика */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Текущая статистика</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Stars" value={formatNumber(repo.stars)} />
          <Stat label="Forks" value={formatNumber(repo.forks)} />
          <Stat label="Open Issues" value={formatNumber(repo.open_issues)} />
          <Stat label="Создан" value={formatDate(repo.created_at)} />
          <Stat
            label="Последний Push"
            value={formatRelative(repo.pushed_at)}
            hint={formatDate(repo.pushed_at)}
          />
          <Stat label="Обновлён" value={formatDate(repo.updated_at)} />
        </div>
      </section>

      {/* Показатели роста */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Рост звёзд</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GrowthStat
            label="За 24 часа"
            growth={enriched.growth_24h}
            percent={enriched.growth_24h_percent}
          />
          <GrowthStat
            label="За 7 дней"
            growth={enriched.growth_7d}
            percent={enriched.growth_7d_percent}
            perDay={enriched.avg_per_day_7d}
          />
          <GrowthStat
            label="За 30 дней"
            growth={enriched.growth_30d}
            percent={enriched.growth_30d_percent}
            perDay={enriched.avg_per_day_30d}
          />
        </div>
      </section>

      {/* Графики */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Графики</h2>
        <GrowthChart
          title="Рост Stars во времени"
          points={starPoints}
          color="#205aeb"
          unit="★"
        />
        <GrowthChart
          title="Рост Forks во времени"
          points={forkPoints}
          color="#0ea5e9"
          unit="forks"
        />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

function GrowthStat({
  label,
  growth,
  percent,
  perDay,
}: {
  label: string;
  growth: number;
  percent: number;
  perDay?: number;
}) {
  const cls =
    growth > 0 ? "text-emerald-600" : growth < 0 ? "text-red-600" : "text-slate-400";
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={"mt-1 text-2xl font-semibold " + cls}>
        {formatGrowth(growth)} ★
      </div>
      <div className="mt-1 text-sm text-slate-500">
        {formatPercent(percent)}
        {typeof perDay === "number" && (
          <> · {perDay.toFixed(1).replace(".", ",")} ★/день</>
        )}
      </div>
    </div>
  );
}
