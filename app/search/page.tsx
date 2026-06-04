import { SearchView } from "@/components/SearchView";

export const dynamic = "force-dynamic";

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Поиск</h1>
        <p className="mt-1 text-sm text-slate-500">
          Глобальный поиск по названию, описанию и темам репозиториев.
        </p>
      </div>

      <SearchView initialQuery={searchParams.q ?? ""} />
    </div>
  );
}
