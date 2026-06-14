"use client";

import { useEffect, useState } from "react";
import type { DataMaturity, InsightPeriod, TrendInsights } from "@/lib/types";
import type { WeeklyRadarReport } from "@/src/radar/types";
import { isLowDataMaturity } from "@/lib/data-maturity-utils";
import { formatDateTime } from "@/lib/format";
import {
  ATTENTION_VISUAL,
  CONFIDENCE_VISUAL,
  CONCENTRATION_VISUAL,
  CONTENT_TABS,
  FUTURE_PROB_VISUAL,
  healthScoreClass,
  HYPE_PROB_VISUAL,
  INSIGHTS_LEGEND,
  LIFECYCLE_VISUAL,
  MARKET_SIGNAL_VISUAL,
  MARKET_TEMP_VISUAL,
  MOMENTUM_VISUAL,
  type VisualBadge,
} from "@/lib/insights-visual";
import {
  downloadTextFile,
  getInsightsExportBasename,
  trendInsightsToChatGptMarkdown,
  trendInsightsToMarkdown,
  trendInsightsToExportJson,
} from "@/lib/insights-export";
import { StatusBadge } from "@/components/StatusBadge";
import { DataMaturityBlock } from "@/components/DataMaturityBlock";

const PERIODS: { key: InsightPeriod; label: string }[] = [
  { key: "daily", label: "День" },
  { key: "weekly", label: "Неделя" },
  { key: "monthly", label: "Месяц" },
];

const NO_PREVIOUS_REPORT =
  "Предыдущего отчёта для сравнения пока нет.";

const FALLBACK_BADGE: VisualBadge = {
  icon: "❔",
  label: "—",
  className: "bg-slate-50 text-slate-600 border border-slate-200",
};

type ContentTab = "linkedin" | "instagram" | "reels" | "telegram";

interface ApiResponse {
  ok: boolean;
  cached?: boolean;
  report?: TrendInsights;
  data_maturity?: DataMaturity;
  error?: string;
}

interface RadarApiResponse {
  ok: boolean;
  exists?: boolean;
  report?: WeeklyRadarReport | null;
  trendsCount?: number;
  filePath?: string;
  error?: string;
}

interface RadarPublishApiResponse {
  ok: boolean;
  report?: WeeklyRadarReport | null;
  trendsCount?: number;
  committed?: boolean;
  pushed?: boolean;
  message?: string;
  rawUrl?: string;
  error?: string;
}

function visualFor(
  map: Record<string, VisualBadge>,
  key: string
): VisualBadge {
  return map[key] ?? { ...FALLBACK_BADGE, label: key || "—" };
}

const FETCH_TIMEOUT_MS = 190_000;

export function InsightsView({
  initialDataMaturity,
}: {
  initialDataMaturity: DataMaturity;
}) {
  const [period, setPeriod] = useState<InsightPeriod>("weekly");
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [noKey, setNoKey] = useState(false);
  const [report, setReport] = useState<TrendInsights | null>(null);
  const [cached, setCached] = useState(false);
  const [tab, setTab] = useState<ContentTab>("linkedin");
  const [dataMaturity, setDataMaturity] =
    useState<DataMaturity>(initialDataMaturity);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarPublishing, setRadarPublishing] = useState(false);
  const [radarReport, setRadarReport] = useState<WeeklyRadarReport | null>(
    null
  );
  const [radarError, setRadarError] = useState<string | null>(null);
  const [radarPublishMessage, setRadarPublishMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    void fetch("/api/radar/weekly")
      .then((res) => res.json())
      .then((data: RadarApiResponse) => {
        if (data.ok && data.report) {
          setRadarReport(data.report);
        }
      })
      .catch(() => {
        // статус файла необязателен при загрузке страницы
      });
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingSeconds(0);
      return;
    }
    const id = window.setInterval(() => {
      setLoadingSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [loading]);

  async function generate(force: boolean) {
    setLoading(true);
    setError(null);
    setNoKey(false);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT_MS
    );

    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, force }),
        signal: controller.signal,
      });
      const data = (await res.json()) as ApiResponse;
      if (!data.ok) {
        if (data.error === "OPENAI_API_KEY is not configured") {
          setNoKey(true);
        } else {
          setError(data.error ?? "Не удалось сформировать отчёт");
        }
        return;
      }
      setReport(data.report ?? null);
      setCached(Boolean(data.cached));
      if (data.data_maturity) {
        setDataMaturity(data.data_maturity);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(
          "Запрос занял слишком много времени (более 3 минут). Попробуйте снова."
        );
      } else {
        setError(err instanceof Error ? err.message : "Сетевая ошибка");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  function exportMarkdown() {
    if (!report) return;
    const base = getInsightsExportBasename(report);
    downloadTextFile(
      trendInsightsToMarkdown(report, dataMaturity),
      `${base}.md`,
      "text/markdown;charset=utf-8"
    );
  }

  function exportChatGpt() {
    if (!report) return;
    const slug = getInsightsExportBasename(report).replace(/^insights_/, "");
    downloadTextFile(
      trendInsightsToChatGptMarkdown(report, dataMaturity),
      `chatgpt_report_${slug}.md`,
      "text/markdown;charset=utf-8"
    );
  }

  function exportJson() {
    if (!report) return;
    const base = getInsightsExportBasename(report);
    downloadTextFile(
      trendInsightsToExportJson(report, dataMaturity),
      `${base}.json`,
      "application/json;charset=utf-8"
    );
  }

  async function generateRadar(refresh: boolean) {
    setRadarLoading(true);
    setRadarError(null);

    try {
      const res = await fetch("/api/radar/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      const data = (await res.json()) as RadarApiResponse;
      if (!data.ok || !data.report) {
        setRadarError(data.error ?? "Не удалось сформировать Radar JSON");
        return;
      }
      setRadarReport(data.report);
    } catch (err) {
      setRadarError(
        err instanceof Error ? err.message : "Сетевая ошибка при Radar JSON"
      );
    } finally {
      setRadarLoading(false);
    }
  }

  function downloadRadarJson() {
    if (!radarReport) return;
    downloadTextFile(
      JSON.stringify(radarReport, null, 2) + "\n",
      "weekly-radar.json",
      "application/json;charset=utf-8"
    );
  }

  async function publishRadar() {
    setRadarPublishing(true);
    setRadarError(null);
    setRadarPublishMessage(null);

    try {
      const res = await fetch("/api/radar/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });
      const data = (await res.json()) as RadarPublishApiResponse;
      if (!data.ok) {
        setRadarError(data.error ?? "Не удалось опубликовать на GitHub");
        return;
      }
      if (data.report) {
        setRadarReport(data.report);
      }
      setRadarPublishMessage(
        data.message ??
          (data.pushed
            ? "Файл отправлен на GitHub."
            : "Изменений для публикации не было.")
      );
    } catch (err) {
      setRadarError(
        err instanceof Error ? err.message : "Сетевая ошибка при публикации"
      );
    } finally {
      setRadarPublishing(false);
    }
  }

  const radarBusy = radarLoading || radarPublishing;

  return (
    <div className="space-y-6">
      <DataMaturityBlock maturity={dataMaturity} />

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Период:</span>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  disabled={loading}
                  className={
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                    (period === p.key
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => generate(false)}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? `Анализ… ${loadingSeconds} с` : "Сформировать отчёт"}
            </button>
            <button
              type="button"
              onClick={() => generate(true)}
              disabled={loading}
              className="btn-ghost"
            >
              {loading ? "Обновление…" : "Обновить принудительно"}
            </button>
            {report && (
              <>
                <button
                  type="button"
                  onClick={exportMarkdown}
                  disabled={loading}
                  className="btn-ghost"
                >
                  Экспорт Markdown
                </button>
                <button
                  type="button"
                  onClick={exportChatGpt}
                  disabled={loading}
                  className="btn-ghost"
                >
                  🧠 Экспорт для ChatGPT
                </button>
                <button
                  type="button"
                  onClick={exportJson}
                  disabled={loading}
                  className="btn-ghost"
                >
                  Экспорт JSON
                </button>
              </>
            )}
          </div>
        </div>
        {report && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>
              Отчёт сформирован: {formatDateTime(report.generated_at)}
              {cached ? " · из кэша" : " · новый"}
            </span>
            <StatusBadge
              visual={visualFor(
                MARKET_TEMP_VISUAL,
                report.market_temperature
              )}
            />
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Радар будущего (JSON)
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Файл <code>reports/weekly-radar.json</code> для внешнего проекта —
              без OpenAI, только GitHub-тренды из локальной базы.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => generateRadar(false)}
              disabled={radarBusy}
              className="btn-primary"
            >
              {radarLoading ? "Генерация…" : "Сформировать Radar JSON"}
            </button>
            <button
              type="button"
              onClick={() => generateRadar(true)}
              disabled={radarBusy}
              className="btn-ghost"
            >
              {radarLoading ? "Обновление…" : "Обновить GitHub + Radar"}
            </button>
            <button
              type="button"
              onClick={() => publishRadar()}
              disabled={radarBusy}
              className="btn-ghost"
              title="Сформировать JSON, commit + push в GitHub для Радара будущего"
            >
              {radarPublishing
                ? "Публикация…"
                : "Опубликовать на GitHub"}
            </button>
            {radarReport && (
              <button
                type="button"
                onClick={downloadRadarJson}
                disabled={radarBusy}
                className="btn-ghost"
              >
                Скачать JSON
              </button>
            )}
          </div>
        </div>
        {radarReport && (
          <div className="mt-3 text-xs text-slate-400">
            <span>
              Неделя {radarReport.week} · трендов: {radarReport.trends.length}{" "}
              · обновлён: {formatDateTime(radarReport.generatedAt)}
            </span>
            {radarReport.trends.length === 0 && (
              <p className="mt-2 text-amber-700">
                Трендов 0 — нужна история снапшотов минимум за 2 дня и рост
                звёзд за неделю. Обновляйте данные несколько дней или нажмите
                «Обновить GitHub + Radar».
              </p>
            )}
          </div>
        )}
        {radarPublishMessage && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {radarPublishMessage}
          </div>
        )}
      </div>

      {radarError && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {radarError}
        </div>
      )}

      {noKey && (
        <div className="card border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <p className="font-semibold">OpenAI ключ не задан</p>
          <p className="mt-1">
            Чтобы пользоваться AI-инсайтами, добавьте{" "}
            <code>OPENAI_API_KEY</code> в файл <code>.env.local</code> и
            перезапустите приложение. Остальные разделы работают без ключа.
          </p>
        </div>
      )}

      {error && (
        <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="card border-brand-200 bg-brand-50/50 p-5 text-sm text-slate-700">
          <p className="font-medium text-brand-800">
            OpenAI формирует отчёт… {loadingSeconds} сек.
          </p>
          <p className="mt-2 text-slate-600">
            «Обновить принудительно» отправляет ~50 репозиториев в OpenAI и
            ждёт новый полный JSON — обычно 1–3 минуты, иногда дольше. Это не
            зависание: кнопки заблокированы до завершения.
          </p>
          {report && (
            <p className="mt-2 text-xs text-slate-500">
              Текущий отчёт ниже остаётся на экране до получения нового.
            </p>
          )}
        </div>
      )}

      {!loading && !report && !noKey && !error && (
        <div className="card p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-800">
            Отчёт ещё не сформирован
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Выберите период и нажмите «Сформировать отчёт». Анализ строится на
            реальных данных из локальной базы (рост звёзд, темы, языки).
          </p>
        </div>
      )}

      {report && (
        <div
          className={
            loading ? "pointer-events-none opacity-50 transition-opacity" : ""
          }
        >
          {isLowDataMaturity(dataMaturity.level) && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ⚠ Аналитика основана на ограниченном объёме исторических данных.
            </div>
          )}
          <Report report={report} tab={tab} setTab={setTab} />
        </div>
      )}
    </div>
  );
}

function Report({
  report,
  tab,
  setTab,
}: {
  report: TrendInsights;
  tab: ContentTab;
  setTab: (t: ContentTab) => void;
}) {
  return (
    <div className="space-y-8">
      <InsightsLegend />

      <Section title="Краткий вывод">
        <div className="card border-brand-100 bg-gradient-to-br from-white to-brand-50/30 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge
              visual={visualFor(
                MARKET_TEMP_VISUAL,
                report.market_temperature
              )}
            />
          </div>
          <p className="text-slate-700">
            {report.executive_summary || "—"}
          </p>
        </div>
      </Section>

      {report.insight_of_the_week?.title && (
        <section>
          <div className="card border-2 border-emerald-200 bg-emerald-50/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Лучший инсайт недели
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {report.insight_of_the_week.title}
            </h3>
            <p className="mt-2 text-slate-700">
              {report.insight_of_the_week.explanation}
            </p>
            <RepoChips items={report.insight_of_the_week.evidence_repositories} />
          </div>
        </section>
      )}

      <Section title="Ключевые сигналы рынка" count={report.market_signals?.length ?? 0}>
        <MarketSignalsSection items={report.market_signals ?? []} />
      </Section>

      <Section title="Здоровье трендов" count={report.trend_health?.length ?? 0}>
        <TrendHealthSection items={report.trend_health ?? []} />
      </Section>

      <Section title="Главные тренды" count={report.main_trends.length}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {report.main_trends.map((t, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-800">{t.title}</h3>
                <StatusBadge
                  visual={visualFor(CONFIDENCE_VISUAL, t.confidence)}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">{t.explanation}</p>
              <RepoChips items={t.evidence_repositories} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Почему это происходит" count={report.trend_drivers?.length ?? 0}>
        <TrendDriversSection items={report.trend_drivers ?? []} />
      </Section>

      <Section title="Что это означает" count={report.market_implications?.length ?? 0}>
        <MarketImplicationsSection items={report.market_implications ?? []} />
      </Section>

      <Section title="Последствия" count={report.second_order_effects?.length ?? 0}>
        <SecondOrderSection items={report.second_order_effects ?? []} />
      </Section>

      <Section title="Ошибки рынка" count={report.market_misconceptions?.length ?? 0}>
        <MisconceptionsSection items={report.market_misconceptions ?? []} />
      </Section>

      <Section title="Смена нарратива" count={report.narrative_shifts?.length ?? 0}>
        <NarrativeShiftsSection items={report.narrative_shifts ?? []} />
      </Section>

      <Section title="Динамика трендов" count={report.trend_momentum?.length ?? 0}>
        <MomentumSection items={report.trend_momentum ?? []} />
      </Section>

      <Section title="Стадия тренда" count={report.trend_lifecycle?.length ?? 0}>
        <LifecycleSection items={report.trend_lifecycle ?? []} />
      </Section>

      <Section title="Что изменилось с прошлого отчёта">
        <ChangedSection data={report.changed_since_last_report} />
      </Section>

      <Section title="Что большинство пропускает" count={report.hidden_signals?.length ?? 0}>
        <HiddenSignalsSection items={report.hidden_signals ?? []} />
      </Section>

      <Section title="Возможные будущие тренды" count={report.future_trends?.length ?? 0}>
        <FutureTrendsSection items={report.future_trends ?? []} />
      </Section>

      <Section
        title="Нестандартные выводы"
        count={report.controversial_takes?.length ?? 0}
      >
        <ControversialSection items={report.controversial_takes ?? []} />
      </Section>

      <Section
        title="Самые быстрорастущие проекты"
        count={report.fastest_growing_projects.length}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {report.fastest_growing_projects.map((p, i) => (
            <div key={i} className="card p-5">
              <RepoLink name={p.full_name} />
              <p className="mt-2 text-sm text-slate-600">{p.reason}</p>
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-medium text-slate-600">Почему важно:</span>{" "}
                {p.why_it_matters}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <section>
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-xl" aria-hidden="true">
            🧭
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Новые сигналы
              <span className="ml-2 text-sm font-normal text-slate-400">
                {report.emerging_signals.length}
              </span>
            </h2>
            <p className="text-sm text-violet-600">
              Потенциальные будущие тренды
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {report.emerging_signals.map((s, i) => (
            <div
              key={i}
              className="card border-2 border-violet-200 bg-violet-50/30 p-5"
            >
              <h3 className="font-semibold text-slate-800">{s.signal}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.explanation}</p>
              <RepoChips items={s.examples} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              🔥
            </span>
            <div>
              <h2 className="text-lg font-semibold text-orange-900">
                Возможный хайп
                <span className="ml-2 text-sm font-normal text-orange-700/80">
                  {report.possible_hype.length}
                </span>
              </h2>
              <p className="text-sm text-orange-800/90">
                Требует подтверждения временем
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {report.possible_hype.map((h, i) => (
            <div
              key={i}
              className="card border border-orange-200 bg-orange-50/50 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-800">{h.topic}</h3>
                <StatusBadge
                  visual={visualFor(HYPE_PROB_VISUAL, h.hype_probability)}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">{h.reason}</p>
            </div>
          ))}
        </div>
      </section>

      <Section title="За чем наблюдать" count={report.projects_to_watch.length}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {report.projects_to_watch.map((p, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <RepoLink name={p.full_name} />
                <StatusBadge
                  visual={visualFor(ATTENTION_VISUAL, p.attention_level)}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">{p.why_watch}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Идеи контента для ZobninAI">
        {report.content_recommendations.weekly_report?.content && (
          <div className="card mb-4 border-brand-200 bg-brand-50/30 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700">
              Weekly Trend Report
            </h3>
            <h4 className="mt-2 font-semibold text-slate-800">
              {report.content_recommendations.weekly_report.title}
            </h4>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {report.content_recommendations.weekly_report.content}
            </p>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-1">
          {CONTENT_TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (tab === key
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-100")
              }
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {tab === "linkedin" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {report.content_recommendations.linkedin_posts.map((p, i) => (
              <div key={i} className="card p-5">
                <h3 className="font-semibold text-slate-800">{p.title}</h3>
                <p className="mt-1 text-sm italic text-slate-500">{p.angle}</p>
                {p.why_now && (
                  <p className="mt-2 rounded-lg bg-brand-50/80 px-3 py-2 text-sm text-brand-900">
                    <span className="font-medium">Почему сейчас:</span> {p.why_now}
                  </p>
                )}
                <BulletList items={p.key_points} />
              </div>
            ))}
            <EmptyHint
              items={report.content_recommendations.linkedin_posts}
            />
          </div>
        )}

        {tab === "instagram" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {report.content_recommendations.instagram_carousels.map((c, i) => (
              <div key={i} className="card p-5">
                <h3 className="font-semibold text-slate-800">{c.title}</h3>
                {c.why_now && (
                  <p className="mt-2 rounded-lg bg-brand-50/80 px-3 py-2 text-sm text-brand-900">
                    <span className="font-medium">Почему сейчас:</span> {c.why_now}
                  </p>
                )}
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  {c.slides.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
            <EmptyHint
              items={report.content_recommendations.instagram_carousels}
            />
          </div>
        )}

        {tab === "reels" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {report.content_recommendations.reels_ideas.map((r, i) => (
              <div key={i} className="card p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                  Хук
                </p>
                <h3 className="font-semibold text-slate-800">{r.hook}</h3>
                <p className="mt-2 text-sm text-slate-600">{r.idea}</p>
                <BulletList items={r.talking_points} />
              </div>
            ))}
            <EmptyHint items={report.content_recommendations.reels_ideas} />
          </div>
        )}

        {tab === "telegram" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {report.content_recommendations.telegram_posts.map((p, i) => (
              <div key={i} className="card p-5">
                <h3 className="font-semibold text-slate-800">{p.title}</h3>
                {p.why_now && (
                  <p className="mb-2 rounded-lg bg-brand-50/80 px-3 py-2 text-sm text-brand-900">
                    <span className="font-medium">Почему сейчас:</span> {p.why_now}
                  </p>
                )}
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {p.text}
                </p>
              </div>
            ))}
            <EmptyHint items={report.content_recommendations.telegram_posts} />
          </div>
        )}
      </Section>
    </div>
  );
}

function InsightsLegend() {
  return (
    <div className="card p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        Легенда
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
        {INSIGHTS_LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function MarketSignalsSection({
  items,
}: {
  items: TrendInsights["market_signals"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Нет ключевых сигналов рынка для текущей выборки." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((s, i) => (
        <div key={i} className="card border-l-4 border-brand-300 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-slate-800">{s.title}</h3>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge
                visual={visualFor(MARKET_SIGNAL_VISUAL, s.signal_type)}
              />
              <StatusBadge
                visual={visualFor(CONFIDENCE_VISUAL, s.confidence)}
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600">{s.explanation}</p>
          {s.trend_leader?.full_name && (
            <p className="mt-2 text-sm text-slate-500">
              <span className="font-medium text-slate-700">Лидер:</span>{" "}
              <RepoLink name={s.trend_leader.full_name} /> — {s.trend_leader.reason}
            </p>
          )}
          <RepoChips items={s.evidence_repositories} />
        </div>
      ))}
    </div>
  );
}

function TrendHealthSection({
  items,
}: {
  items: TrendInsights["trend_health"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Нет данных о здоровье трендов." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((h, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-800">{h.trend}</h3>
            <span
              className={
                "rounded-full border px-2 py-0.5 text-xs font-semibold " +
                healthScoreClass(h.health_score)
              }
            >
              {h.health_score}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {h.density} репозиториев
          </p>
          <div className="mt-2">
            <StatusBadge
              visual={visualFor(CONCENTRATION_VISUAL, h.concentration)}
            />
          </div>
          <p className="mt-2 text-sm text-slate-600">{h.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function HiddenSignalsSection({
  items,
}: {
  items: TrendInsights["hidden_signals"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Скрытых сигналов для текущей выборки пока нет." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((h, i) => (
        <div key={i} className="card border border-violet-200 bg-violet-50/20 p-5">
          <h3 className="font-semibold text-slate-800">{h.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{h.explanation}</p>
          <RepoChips items={h.evidence_repositories} />
        </div>
      ))}
    </div>
  );
}

function FutureTrendsSection({
  items,
}: {
  items: TrendInsights["future_trends"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Нет оценок будущих трендов." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((f, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-slate-800">{f.trend}</h3>
            <StatusBadge visual={visualFor(FUTURE_PROB_VISUAL, f.probability)} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{f.explanation}</p>
          <RepoChips items={f.evidence_repositories} />
        </div>
      ))}
    </div>
  );
}

function TrendDriversSection({
  items,
}: {
  items: TrendInsights["trend_drivers"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Нет данных о причинах роста для текущей выборки." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((d, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-slate-800">{d.trend}</h3>
            <StatusBadge visual={visualFor(CONFIDENCE_VISUAL, d.confidence)} />
          </div>
          <BulletList items={d.drivers} />
          <p className="mt-2 text-sm text-slate-600">{d.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function MarketImplicationsSection({
  items,
}: {
  items: TrendInsights["market_implications"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Нет интерпретаций для рынка." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((m, i) => (
        <div key={i} className="card border-l-4 border-brand-300 p-5">
          <h3 className="font-semibold text-slate-800">{m.trend}</h3>
          <BulletList items={m.implications} />
          <p className="mt-2 text-sm text-slate-600">{m.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function SecondOrderSection({
  items,
}: {
  items: TrendInsights["second_order_effects"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Нет оценок последствий." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((e, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-slate-800">{e.trend}</h3>
            <StatusBadge visual={visualFor(CONFIDENCE_VISUAL, e.confidence)} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{e.effect}</p>
        </div>
      ))}
    </div>
  );
}

function MisconceptionsSection({
  items,
}: {
  items: TrendInsights["market_misconceptions"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Нет данных об ошибках рынка." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((m, i) => (
        <div key={i} className="card border border-amber-200 bg-amber-50/30 p-5">
          <p className="text-xs font-medium uppercase text-amber-800">Заблуждение</p>
          <p className="mt-1 text-sm text-slate-800">{m.misconception}</p>
          <p className="mt-3 text-xs font-medium uppercase text-emerald-800">Реальность</p>
          <p className="mt-1 text-sm text-slate-700">{m.correction}</p>
          <RepoChips items={m.evidence_repositories} />
        </div>
      ))}
    </div>
  );
}

function NarrativeShiftsSection({
  items,
}: {
  items: TrendInsights["narrative_shifts"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Нет данных о смене нарратива." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((n, i) => (
        <div key={i} className="card p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
              {n.old_narrative}
            </span>
            <span aria-hidden="true">→</span>
            <span className="rounded-lg bg-brand-50 px-2 py-1 font-medium text-brand-800">
              {n.new_narrative}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{n.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        {title}
        {typeof count === "number" && (
          <span className="ml-2 text-sm font-normal text-slate-400">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function RepoChips({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1">
      {items.map((name) => (
        <a
          key={name}
          href={`https://github.com/${name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="badge bg-brand-50 text-brand-700 hover:underline"
        >
          {name}
        </a>
      ))}
    </div>
  );
}

function RepoLink({ name }: { name: string }) {
  return (
    <a
      href={`https://github.com/${name}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-brand-700 hover:underline"
    >
      {name}
    </a>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function EmptyHint({ items }: { items: unknown[] }) {
  if (items && items.length > 0) return null;
  return (
    <div className="card p-5 text-sm text-slate-400">
      Нет идей в этой категории для текущей выборки.
    </div>
  );
}

function MomentumSection({
  items,
}: {
  items: TrendInsights["trend_momentum"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Нет данных о динамике трендов для текущей выборки." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((m, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-slate-800">{m.topic}</h3>
            <StatusBadge visual={visualFor(MOMENTUM_VISUAL, m.status)} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{m.explanation}</p>
          <RepoChips items={m.evidence_repositories} />
        </div>
      ))}
    </div>
  );
}

function LifecycleSection({
  items,
}: {
  items: TrendInsights["trend_lifecycle"];
}) {
  if (items.length === 0) {
    return <FallbackCard text="Нет данных о стадиях трендов для текущей выборки." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((l, i) => {
        const visual = visualFor(LIFECYCLE_VISUAL, l.stage_ru);
        const border = LIFECYCLE_VISUAL[l.stage_ru]?.cardBorder ?? "border-slate-200";
        return (
          <div
            key={i}
            className={`card border-2 ${border} bg-white p-5`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-800">{l.topic}</h3>
              <StatusBadge visual={visual} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{l.explanation}</p>
            <RepoChips items={l.evidence_repositories} />
          </div>
        );
      })}
    </div>
  );
}

function ChangedSection({
  data,
}: {
  data: TrendInsights["changed_since_last_report"];
}) {
  const noPrevious =
    !data?.summary ||
    data.summary.includes("Предыдущего отчёта") ||
    data.summary === NO_PREVIOUS_REPORT;

  if (noPrevious) {
    return (
      <div className="card p-5 text-sm text-slate-500">{NO_PREVIOUS_REPORT}</div>
    );
  }

  return (
    <div className="card space-y-4 p-5">
      <p className="text-slate-700">{data.summary}</p>
      <TopicLists
        label="Появилось впервые"
        items={data.new_topics}
        color="text-emerald-700"
      />
      <TopicLists
        label="Усилилось"
        items={data.stronger_topics}
        color="text-brand-700"
      />
      <TopicLists
        label="Ослабло"
        items={data.weaker_topics}
        color="text-amber-700"
      />
      <TopicLists
        label="Исчезло"
        items={data.disappeared_topics}
        color="text-slate-500"
      />
      <TopicLists
        label="Неожиданно ускорилось"
        items={data.unexpectedly_accelerated_topics ?? []}
        color="text-violet-700"
      />
    </div>
  );
}

function TopicLists({
  label,
  items,
  color,
}: {
  label: string;
  items: string[];
  color: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className={"text-xs font-medium uppercase tracking-wide " + color}>
        {label}
      </div>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-600">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

function ControversialSection({
  items,
}: {
  items: TrendInsights["controversial_takes"];
}) {
  if (items.length === 0) {
    return (
      <FallbackCard text="Нестандартных выводов для текущей выборки пока нет." />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((c, i) => (
        <div key={i} className="card p-5">
          <h3 className="font-semibold text-slate-800">{c.take}</h3>
          <p className="mt-2 text-sm text-slate-600">{c.explanation}</p>
          <p className="mt-2 text-sm text-brand-700">
            <span className="font-medium">Угол для контента:</span> {c.content_angle}
          </p>
          <RepoChips items={c.evidence_repositories} />
        </div>
      ))}
    </div>
  );
}

function FallbackCard({ text }: { text: string }) {
  return <div className="card p-5 text-sm text-slate-400">{text}</div>;
}
