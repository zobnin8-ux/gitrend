import { RepositoryExplorer } from "@/components/RepositoryExplorer";

export const dynamic = "force-dynamic";

export default function PopularPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Популярные сейчас</h1>
        <p className="mt-1 text-sm text-slate-500">
          Репозитории, отсортированные по общему количеству звёзд.
        </p>
      </div>

      <RepositoryExplorer
        columns={[
          "repo",
          "description",
          "stars",
          "forks",
          "language",
          "created",
          "pushed",
          "link",
        ]}
        preset={{ sort: "stars", order: "desc" }}
        filterFields={[
          "name",
          "description",
          "language",
          "topic",
          "stars",
          "age",
          "activity",
        ]}
      />
    </div>
  );
}
