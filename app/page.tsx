import Link from "next/link";
import { StatsCards } from "@/components/StatsCards";
import { RepositoryExplorer } from "@/components/RepositoryExplorer";
import { getDashboardStats } from "@/lib/stats";
import { getLastCheckedAt } from "@/lib/sqlite";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const stats = getDashboardStats();
  const lastChecked = getLastCheckedAt();

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Обзор</h1>
            <p className="mt-1 text-sm text-slate-500">
              Общая статистика отслеживаемых GitHub-репозиториев.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            {lastChecked
              ? `Последнее обновление: ${formatDateTime(lastChecked)}`
              : "Данные ещё не загружены — нажмите «Обновить данные»"}
          </div>
        </div>

        {stats.total === 0 ? (
          <EmptyState />
        ) : (
          <StatsCards stats={stats} />
        )}
      </section>

      {stats.total > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Топ по звёздам</h2>
            <Link
              href="/popular"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Все популярные →
            </Link>
          </div>
          <RepositoryExplorer
            columns={["repo", "stars", "growth_7d", "language", "pushed", "link"]}
            preset={{ sort: "stars", order: "desc" }}
            filterFields={["name", "language"]}
            limit={10}
          />
        </section>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-800">
        База данных пуста
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Чтобы начать, добавьте токен GitHub в файл <code>.env.local</code> и
        нажмите кнопку «Обновить данные» в правом верхнем углу. Приложение
        загрузит популярные и быстрорастущие репозитории.
      </p>
    </div>
  );
}
