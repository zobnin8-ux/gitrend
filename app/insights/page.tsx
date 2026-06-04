import { InsightsView } from "@/components/InsightsView";
import { getDataMaturity } from "@/lib/data-maturity";

export const dynamic = "force-dynamic";

export default function InsightsPage() {
  const dataMaturity = getDataMaturity();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          AI-инсайты по GitHub-трендам
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Анализ быстрорастущих GitHub-репозиториев и идеи контента для ZobninAI.
        </p>
      </div>

      <InsightsView initialDataMaturity={dataMaturity} />
    </div>
  );
}