import { RepositoryExplorer } from "@/components/RepositoryExplorer";

export const dynamic = "force-dynamic";

export default function Trending30dPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Быстрорастущие за 30 дней
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Репозитории по росту звёзд за последний месяц.
        </p>
      </div>

      <RepositoryExplorer
        columns={[
          "repo",
          "stars",
          "growth_30d",
          "growth_30d_percent",
          "language",
        ]}
        preset={{ sort: "growth_30d", order: "desc" }}
        filterFields={["name", "language", "stars"]}
        emptyHint="Данных о росте за месяц пока нет. Накопите историю, периодически обновляя данные."
      />
    </div>
  );
}
