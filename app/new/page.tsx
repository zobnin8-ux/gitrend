import { NewProjectsView } from "@/components/NewProjectsView";

export const dynamic = "force-dynamic";

export default function NewProjectsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const initialPeriod = searchParams.period ? Number(searchParams.period) : 30;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Новые проекты</h1>
        <p className="mt-1 text-sm text-slate-500">
          Репозитории, созданные недавно. Выберите период.
        </p>
      </div>

      <NewProjectsView initialPeriod={initialPeriod} />
    </div>
  );
}
