import { WeirdFindsView } from "@/components/WeirdFindsView";

export const dynamic = "force-dynamic";

export default function WeirdFindsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-violet-950">
          Weird GitHub Finds
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Не аналитика — исследование. Странные, смешные и неожиданно популярные проекты.
        </p>
      </div>

      <WeirdFindsView />
    </div>
  );
}
