import { RepositoryExplorer } from "@/components/RepositoryExplorer";

export const dynamic = "force-dynamic";

export default function Trending7dPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Быстрорастущие за 7 дней
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Репозитории по росту звёзд за последнюю неделю.
        </p>
      </div>

      <RepositoryExplorer
        columns={[
          "repo",
          "stars",
          "growth_7d",
          "growth_7d_percent",
          "language",
        ]}
        preset={{ sort: "growth_7d", order: "desc" }}
        filterFields={["name", "language", "stars"]}
        emptyHint="Данных о росте за неделю пока нет. Накопите историю, периодически обновляя данные."
      />
    </div>
  );
}
