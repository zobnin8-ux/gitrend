import { RepositoryExplorer } from "@/components/RepositoryExplorer";

export const dynamic = "force-dynamic";

export default function Trending24hPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Быстрорастущие за 24 часа
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Репозитории по росту звёзд за последние сутки.
        </p>
      </div>

      <RepositoryExplorer
        columns={[
          "repo",
          "stars",
          "growth_24h",
          "growth_24h_percent",
          "language",
        ]}
        preset={{ sort: "growth_24h", order: "desc" }}
        filterFields={["name", "language", "stars"]}
        emptyHint="Данных о росте пока нет. Нажмите «Обновить данные» несколько раз с интервалом, чтобы накопить историю за сутки."
      />
    </div>
  );
}
