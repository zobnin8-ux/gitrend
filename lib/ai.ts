// Опциональная AI-функция: краткое описание репозитория на русском языке.
// Работает только при наличии OPENAI_API_KEY. Иначе приложение работает без AI.

import type {
  RepositoryWithGrowth,
  TrendInsights,
  InsightPeriod,
  DataMaturity,
  LinkedInPost,
} from "./types";
import { computeTopicMetrics } from "./trend-metrics";
import { buildLinkedInEvidenceBrief } from "./linkedin-post-evidence";
import {
  checkLinkedInPostQuality as validateLinkedInPost,
  buildLinkedInValidationContext,
} from "./linkedin-post-quality";
import {
  LINKEDIN_REASONING_PROSE_RULES,
  REASONING_MAP_INSTRUCTIONS,
  normalizeReasoningMap,
  type LinkedInReasoningMap,
} from "./linkedin-reasoning-safety";
import {
  extractMostSurprisingInsight,
  normalizeMostSurprisingInsight,
} from "./linkedin-surprising-insight";

export { checkLinkedInPostQuality } from "./linkedin-post-quality";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = 180_000;

export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

interface SummaryInput {
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  readme_excerpt?: string | null;
}

interface OpenAiResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

// Генерирует 2–3 предложения на русском: что это за проект и для чего используется.
export async function generateRussianSummary(
  input: SummaryInput
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const userPrompt = [
    `Репозиторий: ${input.full_name}`,
    input.readme_excerpt
      ? `README (приоритетный источник):\n${input.readme_excerpt}`
      : null,
    input.description ? `Описание GitHub: ${input.description}` : null,
    input.language ? `Язык: ${input.language}` : null,
    input.topics.length ? `Темы: ${input.topics.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(OPENAI_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content:
            "Ты помощник, который кратко описывает GitHub-репозитории на русском языке. " +
            "Ответь строго 1–3 короткими предложениями: что это за проект и что он делает. " +
            "Используй README как главный источник, затем описание и темы. " +
            "Не упоминай популярность, звёзды, рост, тренды. " +
            "Не выдумывай функции, которых нет в данных. " +
            "Не используй маркдаун и списки, только обычный текст. Максимум ~300 символов.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  const data = (await res.json()) as OpenAiResponse;

  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI ошибка ${res.status}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  return content || null;
}

// --- Аналитический AI-отчёт по трендам (раздел /insights) ---

const MAX_REPOS_IN_PAYLOAD = 50;

// Компактное представление репозитория для отправки в OpenAI.
interface CompactRepo {
  full_name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  created_at: string;
  pushed_at: string;
  growth_24h: number;
  growth_7d: number;
  growth_30d: number;
  growth_7d_percent: number;
  growth_30d_percent: number;
  ai_summary?: string | null;
}

function toCompact(repo: RepositoryWithGrowth): CompactRepo {
  return {
    full_name: repo.full_name,
    description: repo.description?.slice(0, 180) ?? null,
    stars: repo.stars,
    forks: repo.forks,
    language: repo.language,
    topics: repo.topics.slice(0, 8),
    created_at: repo.created_at,
    pushed_at: repo.pushed_at,
    growth_24h: repo.growth_24h,
    growth_7d: repo.growth_7d,
    growth_30d: repo.growth_30d,
    growth_7d_percent: repo.growth_7d_percent,
    growth_30d_percent: repo.growth_30d_percent,
    ai_summary: repo.ai_summary?.slice(0, 120) ?? null,
  };
}

const INSIGHTS_SYSTEM_PROMPT = `Ты — AI market intelligence analyst для Open Source и AI-рынка.

Твоя задача — не перечислять популярные GitHub-репозитории, а выявлять СТРУКТУРНЫЕ ИЗМЕНЕНИЯ рынка: что реально меняется в мире AI и Open Source прямо сейчас.

Используй данные репозиториев (stars, growth, topics, descriptions) и computed_topic_metrics (плотность/концентрация тем).

Ищи:
- новые сигналы (emerging) — тема раньше почти не встречалась, сейчас появляется в быстрорастущих проектах;
- ускорение (accelerating) — тема растёт быстрее предыдущего периода;
- структурные сдвиги (structural_shift) — смещение фокуса рынка (например: от LLM Frameworks к Agent Infrastructure);
- стандартизацию (standardization) — формируется де-факто стандарт (например MCP);
- насыщение (saturation) — слишком много похожих решений, перегрев категории;
- спад (declining) — категория теряет темп роста;
- скрытые закономерности (hidden_signals) — то, что большинство пропускает;
- вероятные будущие тренды (future_trends) — только вероятностная оценка, не предсказания.

Для trend_health используй computed_topic_metrics: density = число репозиториев, concentration = низкая/средняя/высокая.
health_score 0-30 слабый, 31-70 развивается, 71-100 сильный устойчивый тренд.

trend_lifecycle — строгие правила:
- emerging: тема недавняя, мало репозиториев, высокий рост;
- growing: рост подтверждён несколькими репозиториями;
- mature: стабильный рост длительное время;
- cooling: темпы роста падают;
- unclear: недостаточно данных.

changed_since_last_report — если есть previous_report_summary, ответь: что усилилось, ослабло, исчезло, появилось впервые, неожиданно ускорилось (unexpectedly_accelerated_topics).

ROOT CAUSE INTELLIGENCE — недостаточно определить тренд. Для каждого важного тренда определи:
1. Возможную причину роста (trend_drivers: drivers[], explanation, confidence).
2. Что это означает для рынка (market_implications: implications[], explanation).
3. Последствия и эффекты второго порядка, если тренд сохранится (second_order_effects: effect, confidence).
4. Распространённые ошибки рынка (market_misconceptions: misconception, correction).
5. Смену нарратива (narrative_shifts: old_narrative, new_narrative).
6. Один главный вывод недели (insight_of_the_week) — самый сильный кандидат для публикации.

LINKEDIN POST (linkedinPost) — заглушка; финальный пост генерируется отдельным пайплайном из insight_of_the_week, narrative_shifts, hidden_signals, market_implications, second_order_effects, future_trends. НЕ пересказ main_trends / category name. Интерпретация («почему важно»), не описание роста.
english/russian: можно кратко — будет перезаписано. sourceCategory + analyzedRepositories заполни.

Работай как технологический аналитик.

Для content_recommendations (LinkedIn, Instagram, Telegram) добавляй why_now — «Почему это важно именно сейчас».

Контекст ZobninAI: AI automation, business automation, AI agents, workflow, practical AI tools, GitHub/open-source обзоры для предпринимателей.

Правила:
- Пиши на русском. Названия репозиториев — в оригинале.
- Не выдумывай факты. Подтверждай репозиториями из данных.
- Не пересказывай каждый репозиторий. Ищи закономерности и изменения.
- Не используй общие фразы вроде "AI активно развивается".
- Без инвестиционных рекомендаций.
- Если previous_report_summary отсутствует — summary: "Предыдущего отчёта для сравнения пока нет.", массивы пустые.
- Верни только валидный JSON.`;

function buildDataMaturityPromptHint(maturity: DataMaturity): string {
  const conservative =
    maturity.level === "Очень низкая" || maturity.level === "Низкая";

  return (
    `\n\nЗРЕЛОСТЬ ДАННЫХ (учитывай при формулировках):\n` +
    `- Уровень: ${maturity.level}\n` +
    `- История: ${maturity.history_days} дней\n` +
    `- Снапшотов: ${maturity.snapshots_count}\n` +
    (conservative
      ? `- ВАЖНО: зрелость данных низкая. Будь консервативен: избегай категоричных и чрезмерно уверенных выводов; явно помечай предварительный характер трендов; снижай confidence там, где история короткая.`
      : `- Истории достаточно для более уверенных формулировок, но не выдумывай факты вне данных.`)
  );
}

const INSIGHTS_SCHEMA_HINT = `Верни СТРОГО валидный JSON (тексты на русском, full_name в оригинале):
{
  "generated_at": string (ISO),
  "market_temperature": "холодный"|"умеренный"|"горячий",
  "executive_summary": string,
  "market_signals": [{ "signal_type": "emerging"|"accelerating"|"structural_shift"|"standardization"|"saturation"|"declining", "title": string, "explanation": string, "confidence": "низкая"|"средняя"|"высокая", "evidence_repositories": string[], "trend_leader": { "full_name": string, "reason": string } }],
  "trend_health": [{ "trend": string, "density": number, "concentration": "низкая"|"средняя"|"высокая", "health_score": number, "explanation": string }],
  "hidden_signals": [{ "title": string, "explanation": string, "evidence_repositories": string[] }],
  "future_trends": [{ "trend": string, "probability": "низкая"|"средняя"|"высокая", "explanation": string, "evidence_repositories": string[] }],
  "main_trends": [{ "title": string, "explanation": string, "evidence_repositories": string[], "confidence": "низкая"|"средняя"|"высокая" }],
  "insight_of_the_week": { "title": string, "explanation": string, "evidence_repositories": string[] },
  "trend_drivers": [{ "trend": string, "drivers": string[], "explanation": string, "confidence": "низкая"|"средняя"|"высокая" }],
  "market_implications": [{ "trend": string, "implications": string[], "explanation": string }],
  "second_order_effects": [{ "trend": string, "effect": string, "confidence": "низкая"|"средняя"|"высокая" }],
  "market_misconceptions": [{ "misconception": string, "correction": string, "evidence_repositories": string[] }],
  "narrative_shifts": [{ "old_narrative": string, "new_narrative": string, "explanation": string }],
  "trend_momentum": [{ "topic": string, "status": "ускоряется"|"стабильно растёт"|"замедляется"|"только появляется"|"недостаточно данных", "explanation": string, "evidence_repositories": string[] }],
  "trend_lifecycle": [{ "topic": string, "stage": "emerging"|"growing"|"mature"|"cooling"|"unclear", "stage_ru": "Зарождается"|"Растёт"|"Зрелый тренд"|"Остывает"|"Недостаточно данных", "explanation": string, "evidence_repositories": string[] }],
  "changed_since_last_report": { "summary": string, "new_topics": string[], "stronger_topics": string[], "weaker_topics": string[], "disappeared_topics": string[], "unexpectedly_accelerated_topics": string[] },
  "controversial_takes": [{ "take": string, "explanation": string, "evidence_repositories": string[], "content_angle": string }],
  "fastest_growing_projects": [{ "full_name": string, "reason": string, "why_it_matters": string }],
  "emerging_signals": [{ "signal": string, "explanation": string, "examples": string[] }],
  "possible_hype": [{ "topic": string, "reason": string, "hype_probability": "низкая"|"средняя"|"высокая" }],
  "projects_to_watch": [{ "full_name": string, "why_watch": string, "attention_level": "высокий"|"средний"|"низкий" }],
  "content_recommendations": {
    "linkedin_posts": [{ "title": string, "angle": string, "key_points": string[], "why_now": string }],
    "instagram_carousels": [{ "title": string, "slides": string[], "why_now": string }],
    "reels_ideas": [{ "hook": string, "idea": string, "talking_points": string[] }],
    "telegram_posts": [{ "title": string, "text": string, "why_now": string }],
    "weekly_report": { "title": string, "content": string }
  },
  "linkedinPost": {
    "english": string,
    "russian": string,
    "sourceCategory": string,
    "analyzedRepositories": number
  }
}
Минимумы: market_signals ≥3, trend_health ≥3, main_trends ≥3, trend_drivers ≥3, market_implications ≥3, second_order_effects ≥3, market_misconceptions ≥1, narrative_shifts ≥1, insight_of_the_week обязателен, hidden_signals ≥1, future_trends ≥2, trend_momentum ≥3, trend_lifecycle ≥3, controversial_takes ≥2, fastest_growing_projects ≥5, emerging_signals ≥2, projects_to_watch ≥5, content: ≥2 linkedin/instagram/reels/telegram с why_now, weekly_report обязателен, linkedinPost обязателен с непустым english и russian.`;

const PERIOD_LABEL: Record<InsightPeriod, string> = {
  daily: "за последние 24 часа (основной акцент на growth_24h)",
  weekly: "за последнюю неделю (основной акцент на growth_7d)",
  monthly: "за последний месяц (основной акцент на growth_30d)",
};

interface PreviousReportSummary {
  generated_at: string;
  executive_summary: string;
  main_trends: string[];
  market_signals?: string[];
  trend_momentum?: string[];
  trend_lifecycle?: string[];
}

function buildPreviousReportSummary(
  prev: TrendInsights | null
): PreviousReportSummary | undefined {
  if (!prev) return undefined;
  return {
    generated_at: prev.generated_at,
    executive_summary: prev.executive_summary,
    main_trends: prev.main_trends.map((t) => t.title),
    market_signals: (prev.market_signals ?? []).map((s) => s.title),
    trend_momentum: (prev.trend_momentum ?? []).map(
      (m) => `${m.topic}: ${m.status}`
    ),
    trend_lifecycle: (prev.trend_lifecycle ?? []).map(
      (l) => `${l.topic}: ${l.stage_ru || l.stage}`
    ),
  };
}

// Главная функция: формирует аналитический отчёт по трендам.
export async function generateTrendInsights(
  repositories: RepositoryWithGrowth[],
  period: InsightPeriod = "weekly",
  previousReport?: TrendInsights | null,
  dataMaturity?: DataMaturity | null
): Promise<TrendInsights> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const compact = repositories.slice(0, MAX_REPOS_IN_PAYLOAD).map(toCompact);
  const topicMetrics = computeTopicMetrics(repositories, period);

  // Если данных нет вовсе — не тратим запрос, возвращаем честный отчёт.
  if (compact.length === 0) {
    return emptyInsights();
  }

  const previousSummary = buildPreviousReportSummary(
    previousReport ?? null
  );

  const userPayload = {
    period: PERIOD_LABEL[period],
    repositories_count: compact.length,
    repositories: compact,
    computed_topic_metrics: topicMetrics,
    ...(dataMaturity
      ? {
          data_maturity: {
            level: dataMaturity.level,
            history_days: dataMaturity.history_days,
            snapshots_count: dataMaturity.snapshots_count,
          },
        }
      : {}),
    ...(previousSummary
      ? { previous_report_summary: previousSummary }
      : {}),
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 6500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INSIGHTS_SYSTEM_PROMPT },
          {
            role: "user",
            content:
              INSIGHTS_SCHEMA_HINT +
              (dataMaturity ? buildDataMaturityPromptHint(dataMaturity) : "") +
              `\n\nПериод анализа: ${PERIOD_LABEL[period]}.\n` +
              `Данные репозиториев (JSON):\n` +
              JSON.stringify(userPayload),
          },
        ],
      }),
    });
  } catch (err) {
    throw new Error(openAiErrorMessage(err));
  }

  const data = (await res.json()) as OpenAiResponse;
  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI ошибка ${res.status}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI вернул пустой ответ");
  }

  let parsed: TrendInsights;
  try {
    parsed = JSON.parse(content) as TrendInsights;
  } catch {
    throw new Error("Не удалось разобрать JSON-ответ OpenAI");
  }

  const report = normalizeInsights(parsed, compact.length);
  // Dedicated pipeline: full report → surprising insight → key insight → LinkedIn post
  report.linkedinPost = await regenerateLinkedInPost(report, compact.length, {
    allowFallback: true,
  });
  return report;
}

function openAiErrorMessage(err: unknown): string {
  if (err instanceof Error && err.name === "TimeoutError") {
    return "OpenAI не ответил за 3 минуты. Попробуйте ещё раз или выберите период «День».";
  }
  if (err instanceof Error) return err.message;
  return "Ошибка генерации отчёта";
}

// Нормализация сохранённого/кэшированного отчёта (обратная совместимость со старыми JSON).
export function parseTrendInsightsJson(json: string): TrendInsights {
  try {
    const partial = JSON.parse(json) as Partial<TrendInsights>;
    const count = partial.linkedinPost?.analyzedRepositories ?? 0;
    return normalizeInsights(partial, count);
  } catch {
    return emptyInsights();
  }
}

const EMPTY_CHANGED: TrendInsights["changed_since_last_report"] = {
  summary: "Предыдущего отчёта для сравнения пока нет.",
  new_topics: [],
  stronger_topics: [],
  weaker_topics: [],
  disappeared_topics: [],
  unexpectedly_accelerated_topics: [],
};

const EMPTY_WEEKLY: TrendInsights["content_recommendations"]["weekly_report"] =
  { title: "", content: "" };

const EMPTY_INSIGHT_WEEK: TrendInsights["insight_of_the_week"] = {
  title: "",
  explanation: "",
  evidence_repositories: [],
};

const EMPTY_SURPRISING: TrendInsights["most_surprising_insight"] = {
  headline: "",
  explanation: "",
  why_surprising: "",
  evidence_repositories: [],
  dimensions: [],
  surprise_score: 0,
};

const EMPTY_LINKEDIN_POST: LinkedInPost = {
  english: "",
  russian: "",
  sourceCategory: "",
  analyzedRepositories: 0,
};

function emptyInsights(): TrendInsights {
  return {
    generated_at: new Date().toISOString(),
    market_temperature: "умеренный",
    executive_summary:
      "В текущей выборке недостаточно данных, чтобы уверенно выделить AI-тренд.",
    market_signals: [],
    trend_health: [],
    hidden_signals: [],
    future_trends: [],
    main_trends: [],
    insight_of_the_week: { ...EMPTY_INSIGHT_WEEK },
    trend_drivers: [],
    market_implications: [],
    second_order_effects: [],
    market_misconceptions: [],
    narrative_shifts: [],
    trend_momentum: [],
    trend_lifecycle: [],
    changed_since_last_report: { ...EMPTY_CHANGED },
    controversial_takes: [],
    fastest_growing_projects: [],
    emerging_signals: [],
    possible_hype: [],
    projects_to_watch: [],
    content_recommendations: {
      linkedin_posts: [],
      instagram_carousels: [],
      reels_ideas: [],
      telegram_posts: [],
      weekly_report: { ...EMPTY_WEEKLY },
    },
    linkedinPost: { ...EMPTY_LINKEDIN_POST },
    most_surprising_insight: { ...EMPTY_SURPRISING },
  };
}

const STAGE_RU_MAP: Record<string, TrendInsights["trend_lifecycle"][0]["stage_ru"]> =
  {
    emerging: "Зарождается",
    growing: "Растёт",
    mature: "Зрелый тренд",
    cooling: "Остывает",
    unclear: "Недостаточно данных",
  };

// Подстраховка: гарантируем наличие всех полей и массивов в ответе.
function normalizeInsights(
  r: Partial<TrendInsights>,
  analyzedRepositories = 0
): TrendInsights {
  const cr = (r.content_recommendations ?? {}) as Partial<
    TrendInsights["content_recommendations"]
  >;
  const ch = (r.changed_since_last_report ?? {}) as Partial<
    TrendInsights["changed_since_last_report"]
  >;

  const lifecycle = Array.isArray(r.trend_lifecycle)
    ? r.trend_lifecycle.map((item) => ({
        ...item,
        stage_ru:
          item.stage_ru ||
          STAGE_RU_MAP[item.stage] ||
          ("Недостаточно данных" as const),
      }))
    : [];

  const hype = Array.isArray(r.possible_hype)
    ? r.possible_hype.map((h) => ({
        ...h,
        hype_probability: validHypeProb(h.hype_probability),
      }))
    : [];

  const watch = Array.isArray(r.projects_to_watch)
    ? r.projects_to_watch.map((p) => ({
        ...p,
        attention_level: validAttention(p.attention_level),
      }))
    : [];

  const marketSignals = Array.isArray(r.market_signals)
    ? r.market_signals.map((s) => ({
        ...s,
        signal_type: validSignalType(s.signal_type),
        confidence: validConfidence(s.confidence),
        trend_leader: s.trend_leader ?? { full_name: "", reason: "" },
        evidence_repositories: Array.isArray(s.evidence_repositories)
          ? s.evidence_repositories
          : [],
      }))
    : [];

  const trendHealth = Array.isArray(r.trend_health)
    ? r.trend_health.map((h) => ({
        ...h,
        density: typeof h.density === "number" ? h.density : 0,
        concentration: validConcentration(h.concentration),
        health_score: clampHealthScore(h.health_score),
        explanation: h.explanation ?? "",
      }))
    : [];

  const futureTrends = Array.isArray(r.future_trends)
    ? r.future_trends.map((f) => ({
        ...f,
        probability: validFutureProb(f.probability),
        evidence_repositories: Array.isArray(f.evidence_repositories)
          ? f.evidence_repositories
          : [],
      }))
    : [];

  const weekly = cr.weekly_report as
    | TrendInsights["content_recommendations"]["weekly_report"]
    | undefined;

  const insightWeek = r.insight_of_the_week ?? EMPTY_INSIGHT_WEEK;

  const trendDrivers = Array.isArray(r.trend_drivers)
    ? r.trend_drivers.map((d) => ({
        ...d,
        drivers: Array.isArray(d.drivers) ? d.drivers : [],
        confidence: validConfidence(d.confidence),
      }))
    : [];

  const marketImplications = Array.isArray(r.market_implications)
    ? r.market_implications.map((m) => ({
        ...m,
        implications: Array.isArray(m.implications) ? m.implications : [],
      }))
    : [];

  const secondOrder = Array.isArray(r.second_order_effects)
    ? r.second_order_effects.map((e) => ({
        ...e,
        confidence: validConfidence(e.confidence),
      }))
    : [];

  const mapLinkedIn = Array.isArray(cr.linkedin_posts)
    ? cr.linkedin_posts.map((p) => ({ ...p, why_now: p.why_now ?? "" }))
    : [];
  const mapInstagram = Array.isArray(cr.instagram_carousels)
    ? cr.instagram_carousels.map((c) => ({ ...c, why_now: c.why_now ?? "" }))
    : [];
  const mapTelegram = Array.isArray(cr.telegram_posts)
    ? cr.telegram_posts.map((t) => ({ ...t, why_now: t.why_now ?? "" }))
    : [];

  return {
    generated_at: r.generated_at || new Date().toISOString(),
    market_temperature: validMarketTemp(r.market_temperature),
    executive_summary: r.executive_summary || "",
    market_signals: marketSignals,
    trend_health: trendHealth,
    hidden_signals: Array.isArray(r.hidden_signals) ? r.hidden_signals : [],
    future_trends: futureTrends,
    main_trends: Array.isArray(r.main_trends) ? r.main_trends : [],
    insight_of_the_week: {
      title: insightWeek.title ?? "",
      explanation: insightWeek.explanation ?? "",
      evidence_repositories: Array.isArray(insightWeek.evidence_repositories)
        ? insightWeek.evidence_repositories
        : [],
    },
    trend_drivers: trendDrivers,
    market_implications: marketImplications,
    second_order_effects: secondOrder,
    market_misconceptions: Array.isArray(r.market_misconceptions)
      ? r.market_misconceptions
      : [],
    narrative_shifts: Array.isArray(r.narrative_shifts) ? r.narrative_shifts : [],
    trend_momentum: Array.isArray(r.trend_momentum) ? r.trend_momentum : [],
    trend_lifecycle: lifecycle,
    changed_since_last_report: {
      summary: ch.summary || EMPTY_CHANGED.summary,
      new_topics: Array.isArray(ch.new_topics) ? ch.new_topics : [],
      stronger_topics: Array.isArray(ch.stronger_topics) ? ch.stronger_topics : [],
      weaker_topics: Array.isArray(ch.weaker_topics) ? ch.weaker_topics : [],
      disappeared_topics: Array.isArray(ch.disappeared_topics)
        ? ch.disappeared_topics
        : [],
      unexpectedly_accelerated_topics: Array.isArray(
        ch.unexpectedly_accelerated_topics
      )
        ? ch.unexpectedly_accelerated_topics
        : [],
    },
    controversial_takes: Array.isArray(r.controversial_takes)
      ? r.controversial_takes
      : [],
    fastest_growing_projects: Array.isArray(r.fastest_growing_projects)
      ? r.fastest_growing_projects
      : [],
    emerging_signals: Array.isArray(r.emerging_signals)
      ? r.emerging_signals
      : [],
    possible_hype: hype,
    projects_to_watch: watch,
    content_recommendations: {
      linkedin_posts: mapLinkedIn,
      instagram_carousels: mapInstagram,
      reels_ideas: Array.isArray(cr.reels_ideas) ? cr.reels_ideas : [],
      telegram_posts: mapTelegram,
      weekly_report: weekly?.title
        ? weekly
        : { title: "", content: weekly?.content ?? "" },
    },
    linkedinPost: normalizeLinkedInPost(r.linkedinPost, analyzedRepositories),
    most_surprising_insight: normalizeMostSurprisingInsight(
      r.most_surprising_insight ?? EMPTY_SURPRISING
    ),
  };
}

function normalizeLinkedInPost(
  raw: Partial<LinkedInPost> | undefined,
  analyzedRepositories: number
): LinkedInPost {
  const count =
    typeof raw?.analyzedRepositories === "number" && raw.analyzedRepositories > 0
      ? raw.analyzedRepositories
      : analyzedRepositories;

  return {
    english: raw?.english?.trim() ?? "",
    russian: raw?.russian?.trim() ?? "",
    sourceCategory: raw?.sourceCategory?.trim() ?? "",
    analyzedRepositories: count,
  };
}

const LINKEDIN_POST_TARGET_MIN = 250;
const LINKEDIN_POST_MAX_RETRIES = 4;
const LINKEDIN_POST_TIMEOUT_MS = 90_000;

const KEY_INSIGHT_EXTRACTION_PROMPT = `You expand a PRE-SELECTED Most Surprising Insight into structured evidence for LinkedIn prose.

The surprising insight is the PRIMARY narrative anchor. Do NOT replace it with a category growth summary or "strongest trend" headline.

RULE: Evidence BEFORE interpretation. Prefer observable signals over speculation.

STEP 1 — Answer these from the evidence_brief JSON only:
- Concentration: one repo vs distributed? (trend_health.concentration, clustering.repository_count)
- Convergence: multiple independent teams building similar things? (list owner/repo)
- Acceleration: accelerating vs stable high growth? (trend_momentum, changed_since_last_report)
- Category expansion: new entrants vs existing leaders growing? (changed_since_last_report.new_topics)
- Sustainability: persists across periods or short spike? (trend_lifecycle, signal confidence, possible_hype)

STEP 2 — Align all fields with the provided most_surprising_insight. The observation must support WHY this is surprising.

STEP 3 — Derive interpretation grounded in that evidence — emphasize the non-obvious angle. Use cautious language (may, could, appears).

STEP 4 — Build reasoning_map (internal classification — never expose labels in final post):
${REASONING_MAP_INSTRUCTIONS}

Do NOT use main_trends category titles as the insight. Do NOT put market saturation, lack of innovation, business adoption, or investment trends in observations unless evidence_brief explicitly supports comparable repo-level signals.

Return only valid JSON:
{
  "concentration": "concentrated|distributed|mixed + cite repos/concentration field",
  "convergence": "yes/no + evidence repos",
  "acceleration": "accelerating|stable|slowing + evidence",
  "category_expansion": "new entrants|leaders only|mixed + evidence",
  "sustainability": "persistent|early|unclear + evidence",
  "evidence_summary": "2-4 sentences citing repos, signal types, concentration, momentum — NO speculation",
  "evidence_bullets": ["observable fact 1 with repo names", "observable fact 2"],
  "observation": "What was detected — must match surprising insight angle",
  "interpretation": "Why surprising — cautious (may/could/appears), ONLY what evidence supports",
  "broader_implication": "Cautious implication — hypothesis-level unless data is direct",
  "practical_takeaway": "What to watch — grounded in data or framed as open question",
  "primary_conclusion": "one sentence — surprising insight, evidence-based, no market overclaim",
  "reasoning_map": {
    "observations": ["2-4 data-backed facts"],
    "interpretations": ["1-3 careful readings with hedged language"],
    "hypotheses": ["1-2 open questions or possible explanations — NOT facts"]
  },
  "source_sections": ["most_surprising_insight"],
  "evidence_repositories": ["owner/repo"],
  "source_category": "topic of the insight",
  "hooks_to_avoid": ["automation is saturated", "market is stale", "failing to innovate", "proves that"]
}`;

const LINKEDIN_POST_PROSE_PROMPT = `You transform internal GitTrend analysis into a publish-ready LinkedIn post.

INPUT: most_surprising_insight (PRIMARY narrative anchor) + structured analytical insight + evidence.

THE POST MUST REVOLVE AROUND ONE SURPRISING IDEA — not multiple trends, not a category summary.

Answer "What surprised us this week?" BEFORE "What grew this week?"

The reader should think: "I didn't notice that" — not "yes, that category is growing."

FORBIDDEN as the main angle:
- "[Category] is growing rapidly"
- Restating the biggest trend or most stars without a non-obvious twist
- Multiple unrelated ideas in one post

YOUR JOB — turn the surprising insight into natural prose. The reader must NEVER see the internal framework.

FORBIDDEN in the final post (never write these words as section headers or labels):
- Observation, Evidence, Interpretation, Implication, Practical Takeaway
- Part 1 / Part 2 / etc.

VOICE: founder / builder sharing something genuinely surprising they found in GitHub data. First person OK ("I", "we").

STRUCTURE (no labels — blank lines between paragraphs only):

1) Hook — lead with the surprising angle (what was unexpected)
2) The observation — what GitTrend data shows (weave repo names owner/repo naturally)
3) Reasoning — why this is surprising vs what people assume
4) Broader implication — cautious, evidence-tied
5) Personal conclusion — what you would watch as a builder

Then Source footer (exact format):

Source:
GitTrend Weekly Analysis
Based on GitHub repository growth signals and trend clustering.
Analyzed: N repositories
Primary category: Category Name

RULES:
- ONE idea only — the most surprising insight
- Evidence-first; cite repos naturally in sentences
- Do NOT write like a consulting report
- russian: direct translation of english

${LINKEDIN_REASONING_PROSE_RULES}

Use reasoning_map from the internal structure:
- weave observations as factual anchors
- interpretations with hedging language
- hypotheses as questions or possibilities — never as conclusions

LENGTH: english 250–450 words (min 200, max 600).

Return only valid JSON: { "english": string, "russian": string, "sourceCategory": string, "analyzedRepositories": number }`;

interface LinkedInKeyInsight {
  concentration: string;
  convergence: string;
  acceleration: string;
  category_expansion: string;
  sustainability: string;
  evidence_summary: string;
  evidence_bullets: string[];
  observation: string;
  interpretation: string;
  broader_implication: string;
  practical_takeaway: string;
  primary_conclusion: string;
  reasoning_map: LinkedInReasoningMap;
  source_sections: string[];
  evidence_repositories: string[];
  source_category: string;
  hooks_to_avoid: string[];
}

function buildLinkedInInsightExtractionContext(
  report: TrendInsights,
  analyzedRepositories: number
): string {
  return JSON.stringify(
    {
      evidence_brief: buildLinkedInEvidenceBrief(report, analyzedRepositories),
      insight_of_the_week: report.insight_of_the_week,
      narrative_shifts: report.narrative_shifts ?? [],
      hidden_signals: report.hidden_signals ?? [],
      market_implications: report.market_implications ?? [],
      second_order_effects: report.second_order_effects ?? [],
      future_trends: report.future_trends ?? [],
      market_misconceptions: report.market_misconceptions ?? [],
    },
    null,
    0
  );
}

function buildLinkedInPostContext(
  report: TrendInsights,
  analyzedRepositories: number
): string {
  return JSON.stringify(
    {
      analyzed_repositories: analyzedRepositories,
      generated_at: report.generated_at,
      market_temperature: report.market_temperature,
      executive_summary: report.executive_summary,
      insight_of_the_week: report.insight_of_the_week,
      market_signals: report.market_signals ?? [],
      trend_health: report.trend_health ?? [],
      hidden_signals: report.hidden_signals ?? [],
      future_trends: report.future_trends ?? [],
      main_trends: report.main_trends ?? [],
      trend_drivers: report.trend_drivers ?? [],
      market_implications: report.market_implications ?? [],
      second_order_effects: report.second_order_effects ?? [],
      narrative_shifts: report.narrative_shifts ?? [],
      market_misconceptions: report.market_misconceptions ?? [],
      trend_momentum: report.trend_momentum ?? [],
      trend_lifecycle: report.trend_lifecycle ?? [],
      changed_since_last_report: report.changed_since_last_report,
      controversial_takes: report.controversial_takes ?? [],
      fastest_growing_projects: report.fastest_growing_projects ?? [],
      emerging_signals: report.emerging_signals ?? [],
      projects_to_watch: report.projects_to_watch ?? [],
      possible_hype: report.possible_hype ?? [],
    },
    null,
    0
  );
}

async function callOpenAiJson(
  system: string,
  user: string,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  let res: Response;
  try {
    res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(LINKEDIN_POST_TIMEOUT_MS),
      body: JSON.stringify({
        model: MODEL,
        temperature: options?.temperature ?? 0.5,
        max_tokens: options?.max_tokens ?? 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (err) {
    throw new Error(openAiErrorMessage(err));
  }

  const data = (await res.json()) as OpenAiResponse;
  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI ошибка ${res.status}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI вернул пустой ответ");
  }
  return content;
}

async function extractLinkedInKeyInsight(
  report: TrendInsights,
  analyzedRepositories: number,
  surprisingInsight: TrendInsights["most_surprising_insight"]
): Promise<LinkedInKeyInsight> {
  const content = await callOpenAiJson(
    KEY_INSIGHT_EXTRACTION_PROMPT,
    `Most Surprising Insight (PRIMARY anchor — build all fields around this):\n` +
      JSON.stringify(surprisingInsight, null, 2) +
      `\n\nAnalytical sections from GitTrend report (JSON):\n${buildLinkedInInsightExtractionContext(report, analyzedRepositories)}\n\n` +
      `Expand the surprising insight with evidence from evidence_brief. Do NOT replace it with a category summary.`,
    { temperature: 0.3, max_tokens: 1100 }
  );

  try {
    const parsed = JSON.parse(content) as Partial<LinkedInKeyInsight> & {
      reasoning_map?: Partial<LinkedInReasoningMap>;
    };
    const reasoning_map = normalizeReasoningMap(parsed.reasoning_map, {
      observation: parsed.observation,
      interpretation: parsed.interpretation,
      broader: parsed.broader_implication,
    });
    return {
      concentration: parsed.concentration?.trim() ?? "",
      convergence: parsed.convergence?.trim() ?? "",
      acceleration: parsed.acceleration?.trim() ?? "",
      category_expansion: parsed.category_expansion?.trim() ?? "",
      sustainability: parsed.sustainability?.trim() ?? "",
      evidence_summary: parsed.evidence_summary?.trim() ?? "",
      evidence_bullets: Array.isArray(parsed.evidence_bullets)
        ? parsed.evidence_bullets.filter(Boolean)
        : [],
      observation: parsed.observation?.trim() ?? "",
      interpretation: parsed.interpretation?.trim() ?? "",
      broader_implication: parsed.broader_implication?.trim() ?? "",
      practical_takeaway: parsed.practical_takeaway?.trim() ?? "",
      primary_conclusion: parsed.primary_conclusion?.trim() ?? "",
      reasoning_map,
      source_sections: Array.isArray(parsed.source_sections)
        ? parsed.source_sections.filter(Boolean)
        : [],
      evidence_repositories: Array.isArray(parsed.evidence_repositories)
        ? parsed.evidence_repositories.filter(Boolean)
        : [],
      source_category: parsed.source_category?.trim() ?? "",
      hooks_to_avoid: Array.isArray(parsed.hooks_to_avoid)
        ? parsed.hooks_to_avoid.filter(Boolean)
        : [],
    };
  } catch {
    throw new Error("Не удалось извлечь key insight для LinkedIn post");
  }
}

async function requestLinkedInPostGeneration(
  report: TrendInsights,
  analyzedRepositories: number,
  surprisingInsight: TrendInsights["most_surprising_insight"],
  keyInsight: LinkedInKeyInsight,
  qualityFeedback?: string
): Promise<Partial<LinkedInPost>> {
  const userContent =
    `Most Surprising Insight (revolve the entire post around this ONE idea):\n` +
    JSON.stringify(surprisingInsight, null, 2) +
    `\n\nInternal analytical structure (transform into natural prose — do NOT expose labels):\n` +
    JSON.stringify(
      {
        ...keyInsight,
        reasoning_map: keyInsight.reasoning_map,
      },
      null,
      2
    ) +
    `\n\nEvidence reference (weave into sentences):\n` +
    JSON.stringify(
      {
        evidence_brief: buildLinkedInEvidenceBrief(report, analyzedRepositories),
        evidence_repositories: keyInsight.evidence_repositories,
      },
      null,
      2
    ) +
    `\n\nanalyzedRepositories for footer: ${analyzedRepositories}\n` +
    `sourceCategory suggestion: ${keyInsight.source_category || "General"}\n\n` +
    (qualityFeedback
      ? `PREVIOUS ATTEMPT REJECTED: ${qualityFeedback}\n` +
        `Rewrite leading with what SURPRISED us — not what grew. One surprising idea only. ` +
        `No category summary. Separate facts from interpretations and hypotheses. ` +
        `Soften unsupported claims (may/could/appears) or turn them into questions. ` +
        `Target ${LINKEDIN_POST_TARGET_MIN}–450 words.\n\n`
      : "") +
    `Return JSON: { "english": string, "russian": string, "sourceCategory": string, "analyzedRepositories": number }`;

  const content = await callOpenAiJson(LINKEDIN_POST_PROSE_PROMPT, userContent, {
    temperature: 0.45,
    max_tokens: 2800,
  });

  try {
    return JSON.parse(content) as Partial<LinkedInPost>;
  } catch {
    throw new Error("Не удалось разобрать JSON-ответ OpenAI");
  }
}

export async function regenerateLinkedInPost(
  report: TrendInsights,
  analyzedRepositories: number,
  options?: { allowFallback?: boolean }
): Promise<LinkedInPost> {
  const count =
    analyzedRepositories > 0
      ? analyzedRepositories
      : report.linkedinPost?.analyzedRepositories ?? 0;

  const surprisingInsight = await extractMostSurprisingInsight(report, count);
  report.most_surprising_insight = surprisingInsight;

  const keyInsight = await extractLinkedInKeyInsight(report, count, surprisingInsight);
  const validationContext = buildLinkedInValidationContext(report);

  let lastReason = "";
  let lastNormalized: LinkedInPost | null = null;
  for (let attempt = 0; attempt < LINKEDIN_POST_MAX_RETRIES; attempt++) {
    const parsed = await requestLinkedInPostGeneration(
      report,
      count,
      surprisingInsight,
      keyInsight,
      attempt > 0 ? lastReason : undefined
    );
    const normalized = normalizeLinkedInPost(parsed, count);
    if (!normalized.sourceCategory && keyInsight.source_category) {
      normalized.sourceCategory = keyInsight.source_category;
    }
    lastNormalized = normalized;
    const check = validateLinkedInPost(normalized.english, validationContext);
    if (check.ok) {
      return normalized;
    }
    lastReason = check.reason ?? "quality check failed";
  }

  if (options?.allowFallback && lastNormalized) {
    console.warn(
      `[LinkedIn] using best attempt after ${LINKEDIN_POST_MAX_RETRIES} retries: ${lastReason}`
    );
    return lastNormalized;
  }

  throw new Error(
    `LinkedIn post did not pass quality check after ${LINKEDIN_POST_MAX_RETRIES} attempts: ${lastReason}`
  );
}

function validSignalType(
  v: unknown
): TrendInsights["market_signals"][0]["signal_type"] {
  const ok = [
    "emerging",
    "accelerating",
    "structural_shift",
    "standardization",
    "saturation",
    "declining",
  ] as const;
  return ok.includes(v as (typeof ok)[number]) ? (v as (typeof ok)[number]) : "emerging";
}

function validConfidence(
  v: unknown
): "низкая" | "средняя" | "высокая" {
  if (v === "низкая" || v === "средняя" || v === "высокая") return v;
  return "средняя";
}

function validConcentration(
  v: unknown
): TrendInsights["trend_health"][0]["concentration"] {
  if (v === "низкая" || v === "средняя" || v === "высокая") return v;
  return "средняя";
}

function validFutureProb(
  v: unknown
): TrendInsights["future_trends"][0]["probability"] {
  if (v === "низкая" || v === "средняя" || v === "высокая") return v;
  return "средняя";
}

function clampHealthScore(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function validMarketTemp(
  v: unknown
): TrendInsights["market_temperature"] {
  if (v === "холодный" || v === "умеренный" || v === "горячий") return v;
  return "умеренный";
}

function validAttention(
  v: unknown
): TrendInsights["projects_to_watch"][0]["attention_level"] {
  if (v === "высокий" || v === "средний" || v === "низкий") return v;
  return "средний";
}

function validHypeProb(
  v: unknown
): TrendInsights["possible_hype"][0]["hype_probability"] {
  if (v === "низкая" || v === "средняя" || v === "высокая") return v;
  return "средняя";
}
