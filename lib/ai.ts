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
    input.description ? `Описание: ${input.description}` : null,
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
            "Ответь строго 2–3 предложениями: (1) что это за проект, (2) для чего используется. " +
            "Не используй маркдаун и списки, только обычный текст.",
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

LINKEDIN POST (linkedinPost) — отдельный готовый пост для LinkedIn на основе САМОГО СИЛЬНОГО сигнала (insight_of_the_week, затем top market_signals / main_trends). Не пересказывай все тренды — один фокус.
- english: 150–300 слов, plain text, готов к публикации. Структура: (1) Hook, (2) Signal — что обнаружил GitTrend, (3) Why it matters, (4) Personal takeaway — голос founder/builder, без хайпа и маркетинга, (5) Source footer в конце:
Source:
GitTrend Weekly Analysis
Based on GitHub repository growth signals and trend clustering.
Analyzed: [N] repositories
Primary category: [category]
- russian: прямой перевод english (та же структура, тот же смысл). НЕ генерируй два независимых поста.
- sourceCategory: категория главного сигнала (например AI Agents, MCP, Developer Tools).
- analyzedRepositories: число из repositories_count во входных данных.

Работай как технологический аналитик. Не ограничивайся пересказом данных. Отвечай: почему растёт, что изменилось, что означает, какие последствия, что люди понимают неправильно.

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

  return normalizeInsights(parsed, compact.length);
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

const LINKEDIN_POST_SYSTEM_PROMPT = `You write one high-quality LinkedIn post based on GitHub market intelligence.

Rules:
- Focus on the SINGLE strongest signal in the report (insight_of_the_week first, then top market_signals).
- Do NOT summarize all trends.
- english: 150-300 words, plain text, ready to publish. Structure: (1) Hook, (2) Signal, (3) Why it matters, (4) Personal takeaway (founder/builder voice, no hype, no marketing fluff), (5) Source footer at the end exactly in this format:

Source:
GitTrend Weekly Analysis
Based on GitHub repository growth signals and trend clustering.
Analyzed: N repositories
Primary category: Category Name

- russian: direct translation of english (same structure, same meaning). NOT an independent post.
- sourceCategory: primary category of the main signal (e.g. AI Agents, MCP, Developer Tools).
- Use real data from the report. No generic AI hype or empty motivation.

Return only valid JSON.`;

function buildLinkedInPostContext(
  report: TrendInsights,
  analyzedRepositories: number
): string {
  return JSON.stringify({
    analyzed_repositories: analyzedRepositories,
    generated_at: report.generated_at,
    executive_summary: report.executive_summary,
    insight_of_the_week: report.insight_of_the_week,
    market_signals: (report.market_signals ?? []).slice(0, 5),
    main_trends: (report.main_trends ?? []).slice(0, 3),
    trend_drivers: (report.trend_drivers ?? []).slice(0, 3),
    market_implications: (report.market_implications ?? []).slice(0, 3),
    fastest_growing_projects: (report.fastest_growing_projects ?? []).slice(0, 5),
  });
}

export async function regenerateLinkedInPost(
  report: TrendInsights,
  analyzedRepositories: number
): Promise<LinkedInPost> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const count =
    analyzedRepositories > 0
      ? analyzedRepositories
      : report.linkedinPost?.analyzedRepositories ?? 0;

  let res: Response;
  try {
    res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: LINKEDIN_POST_SYSTEM_PROMPT },
          {
            role: "user",
            content:
              `Report context (JSON):\n${buildLinkedInPostContext(report, count)}\n\n` +
              `Return JSON: { "english": string, "russian": string, "sourceCategory": string, "analyzedRepositories": number }`,
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

  let parsed: Partial<LinkedInPost>;
  try {
    parsed = JSON.parse(content) as Partial<LinkedInPost>;
  } catch {
    throw new Error("Не удалось разобрать JSON-ответ OpenAI");
  }

  return normalizeLinkedInPost(parsed, count);
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
