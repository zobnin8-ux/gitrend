import { RepositoryExplorer } from "@/components/RepositoryExplorer";

export const dynamic = "force-dynamic";

export default function FavoritesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Избранные репозитории
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Репозитории, добавленные в избранное. Нажмите на звёздочку, чтобы
          убрать из списка.
        </p>
      </div>

      <RepositoryExplorer
        columns={[
          "repo",
          "description",
          "stars",
          "growth_7d",
          "language",
          "pushed",
          "link",
        ]}
        preset={{ favoritesOnly: true, sort: "stars", order: "desc" }}
        filterFields={["name", "description", "language", "topic"]}
        emptyHint="В избранном пока нет репозиториев. Добавьте их звёздочкой в любом списке."
      />
    </div>
  );
}
