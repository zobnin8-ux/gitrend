# PROJECT_OVERVIEW_FOR_AI

> Документ для внешнего AI-ассистента (например, ChatGPT). Описывает **текущее**
> состояние локального трекера GitHub-трендов: архитектура, данные, API, UI и уже
> реализованная OpenAI-интеграция (включая раздел **AI-инсайты** `/insights`).
> Обновлено после **AI Trend Intelligence Dashboard v2** и **Root Cause Intelligence
> Engine**: market signals, trend health, root cause blocks, экспорт ChatGPT (июнь 2026).

---

## 1. Project Purpose

Локальное веб-приложение для отслеживания популярных и быстрорастущих
GitHub-репозиториев. Показывает: какие репозитории сейчас популярны, какие быстрее
всего набирают звёзды, как меняется популярность со временем и какие технологии на
подъёме. Главная метрика — количество GitHub Stars и динамика их роста.

Дополнительно: раздел **AI-инсайты** — не просто «что популярно на GitHub», а **market
intelligence**: структурные изменения рынка AI/Open Source, причины роста, последствия,
ошибки рынка, идеи контента для **ZobninAI** (LinkedIn, Instagram, Reels, Telegram).

Интерфейс полностью на русском (кроме названий репозиториев, оригинальных описаний,
ссылок и названий языков). Приложение рассчитано только на **локальное** использование:
без авторизации, пользователей, платежей, Supabase/Firebase и внешних БД.

---

## 2. Tech Stack

| Слой | Технология |
|---|---|
| Framework | **Next.js 14.2.35** (App Router) |
| UI | **React 18**, **TypeScript**, **Tailwind CSS 3** |
| Database | **SQLite** (`better-sqlite3`), файл `data/github-trends.db` |
| External APIs | **GitHub REST API** (`fetch`), **OpenAI API** (`fetch`, опционально) |
| Charts | Собственный SVG (`GrowthChart`), без chart-библиотек |
| Local run | `GitHub-Trends-Start.bat` → `launch-app.ps1` (build при изменении кода + `npm start`) |

**Переменные окружения** (`.env.local`):

```env
GITHUB_TOKEN=          # обязателен для «Обновить данные»
OPENAI_API_KEY=        # обязателен для AI-инсайтов и ai_summary при refresh
```

На Windows с Avast HTTPS-scanning для Node/npm нужен корневой CA:

```txt
NODE_EXTRA_CA_CERTS=C:\Users\<user>\node-ca\avast-root-ca.pem
```

(установлено через `setx` в среде пользователя).

---

## 3. Current App Structure

```txt
/app
  layout.tsx, globals.css, icon.png
  page.tsx                    Главная (обзор)
  popular/page.tsx
  trending/24h|7d|30d/page.tsx
  new/page.tsx
  favorites/page.tsx
  search/page.tsx
  insights/page.tsx           AI-инсайты (аналитический отчёт)
  repo/[id]/page.tsx
  api/refresh/route.ts
  api/repositories/route.ts
  api/favorites/route.ts
  api/ai/insights/route.ts    POST — генерация TrendInsights + кэш

/components
  Navbar.tsx                  (+ ссылка «AI-инсайты»)
  RefreshButton.tsx
  StatsCards.tsx
  RepositoryExplorer.tsx
  RepositoryTable.tsx
  Filters.tsx
  GrowthChart.tsx
  FavoriteButton.tsx
  SearchView.tsx
  NewProjectsView.tsx
  InsightsView.tsx            UI отчёта: период, бейджи, экспорт, блоки отчёта
  StatusBadge.tsx             Универсальный бейдж (иконка + label + мягкий цвет)

/lib
  types.ts                    Repository, RepositoryWithGrowth, TrendInsights, InsightPeriod
  sqlite.ts                   Схема + repositories/snapshots/favorites/ai_trend_reports
  github.ts                   refreshData(), 9 источников Search API
  analytics.ts                enrichRepository, getRepositoriesWithGrowth, getInsightRepositories
  filters.ts
  stats.ts
  ai.ts                       generateTrendInsights, normalizeInsights (OpenAI, timeout 180s)
  trend-metrics.ts            computeTopicMetrics — density/concentration до промпта
  insights-visual.ts          Бейджи, легенда, MARKET_SIGNAL_VISUAL, …
  insights-export.ts          Markdown, JSON, ChatGPT export
  format.ts

/data
  github-trends.db
  launch.log                    Лог запуска (launch-app.ps1)
  server.log                    Лог npm start

GitHub-Trends-Start.bat         Запуск (видимое окно CMD)
GitHub-Trends-Stop.bat          Остановка сервера
launch-app.ps1 / stop-app.ps1
README.md
PROJECT_OVERVIEW_FOR_AI.md      Этот файл
```

**Ключевые точки входа:**

- Сбор данных: `lib/github.ts` → `refreshData()`
- Рост: `lib/analytics.ts` → `getRepositoriesWithGrowth()`
- AI (по репо): `lib/ai.ts` → `generateRussianSummary()` в refresh
- AI (агрегат): `lib/ai.ts` → `generateTrendInsights()` ← `/api/ai/insights`
- Кэш отчётов: `lib/sqlite.ts` → `ai_trend_reports`

---

## 4. Data Flow

### 4.1 Сбор и хранение GitHub

```txt
«Обновить данные» → POST /api/refresh → refreshData()
  → 9× GET api.github.com/search/repositories
  → Map dedup по github_id
  → upsertRepository() + insertSnapshot()
  → (опц.) generateRussianSummary() → repositories.ai_summary
  → SQLite
```

### 4.2 Списки и фильтры в UI

```txt
RepositoryExplorer → GET /api/repositories?filters
  → getRepositoriesWithGrowth() → applyFilters() → JSON + is_favorite
```

### 4.3 AI-инсайты (агрегированный анализ)

```txt
/insights → InsightsView → POST /api/ai/insights { period, force? }
  → getInsightRepositories()           // объединение топов + новые + избранное
  → фильтр релевантности (AI/automation/…) или fallback на весь набор
  → сортировка по growth_24h|7d|30d (зависит от period)
  → топ-50, payload_hash (SHA-256)
  → getRecentTrendReport() если кэш < 24h и !force
  → getPreviousTrendReport() — сравнение changed_since_last_report
  → generateTrendInsights(): computeTopicMetrics() + OpenAI gpt-4o-mini, max_tokens 6500
  → normalizeInsights() — обратная совместимость старого кэша
  → saveTrendReport() → ai_trend_reports
```

Снапшоты — «фотографии» stars/forks/issues. Рост = текущие stars минус stars из
снапшота на границе периода (или самый ранний снапшот, если истории мало).

---

## 5. Database Structure

Файл: `data/github-trends.db`. Инициализация: `lib/sqlite.ts` → `initSchema()`.

### `repositories`

Текущее состояние репозитория. Важные поля: `github_id` (PK), `full_name`, `stars`,
`forks`, `topics` (JSON string), `ai_summary` (краткое русское описание от OpenAI
при refresh для **новых** репо), `first_seen_at`, `last_checked_at`.

### `snapshots`

История: `github_id`, `stars`, `forks`, `open_issues`, `checked_at`.
Индекс `(github_id, checked_at)`.

### `favorites`

`github_id` (PK), `created_at`.

### `ai_trend_reports` (кэш AI-отчётов)

| Поле | Тип | Назначение |
|---|---|---|
| `id` | INTEGER PK | |
| `period` | TEXT | `daily` \| `weekly` \| `monthly` |
| `payload_hash` | TEXT | SHA-256 от period + сигнатуры выбранных репо |
| `report_json` | TEXT | Сериализованный `TrendInsights` |
| `created_at` | TEXT | ISO timestamp |

Индекс `(period, payload_hash, created_at)`. Кэш: если за последние **24 часа** есть
запись с тем же `period` и `payload_hash` — ответ без повторного вызова OpenAI
(если не `force: true`).

---

## 6. GitHub Data Collection

Реализация: `lib/github.ts`.

- **Эндпоинт:** `GET https://api.github.com/search/repositories`
- **Параметры:** `q`, `sort=stars`, `order=desc`, `per_page=30` (макс. 100)
- **9 источников** (`getDataSources()`):

| key | query (суть) |
|---|---|
| popular | `stars:>5000` |
| trending | `created:>=7d ago stars:>50` |
| ai | `AI in:name,description,topics stars:>500` |
| llm | `LLM … stars:>200` |
| agents | `agents … stars:>200` |
| automation | `automation … stars:>500` |
| devtools | `developer-tools in:topics stars:>500` |
| opensource | `open-source in:topics stars:>1000` |
| new | `created:>=30d ago stars:>20` |

- **Дедуп:** `Map<github_id, repo>`
- **Результат refresh:** `sourcesProcessed`, `reposFound`, `newRepos`, `updatedRepos`,
  `snapshotsCreated`, `aiSummariesGenerated`, `errors[]`, `finishedAt`

Типичный объём после первого refresh: **~200+** уникальных репозиториев.

---

## 7. Growth Metrics

`lib/analytics.ts` → `enrichRepository()` / `computeGrowth()`.

| Метрика | Формула / логика |
|---|---|
| growth за N дней | `stars_now − stars_snapshot_at_cutoff` |
| % | `(growth / old_stars) × 100` |
| avg/day | `growth / N` |
| Поля | `growth_24h`, `growth_7d`, `growth_30d`, `*_percent`, `avg_per_day_7d/30d` |

**Forks:** только на графике страницы репо, не как отдельные поля роста в таблицах.

**Trending score:** нет; сортировка по абсолютному `growth_*` или `stars`.

**Важно:** при одном снапшоте все growth = 0. Нужны повторные «Обновить данные».

### Выборка для AI (`getInsightRepositories`)

Объединяет (дедуп по `github_id`):

- топ-50 по `growth_24h`, `growth_7d`, `growth_30d`, `stars`
- созданные за последние 30 дней
- избранные

Дальше в `/api/ai/insights` — фильтр релевантности и обрезка до **50** репо.

### Pre-compute (`lib/trend-metrics.ts`)

Перед OpenAI считается `computed_topic_metrics` по ключевым темам (AI Agents, MCP, RAG, …):

- **density** — сколько репозиториев в теме
- **concentration** — низкая / средняя / высокая (доля роста у top-2)
- **top_repositories** — лидеры по growth за период

Передаётся в промпт; модель заполняет `trend_health` и root-cause блоки.

---

## 8. Current UI

| Маршрут | Название | Содержание |
|---|---|---|
| `/` | Обзор | 6 карточек + топ-10 по звёздам |
| `/popular` | Популярные сейчас | Таблица по stars, полные фильтры |
| `/trending/24h\|7d\|30d` | Быстрорастущие | Рост за период + % |
| `/new` | Новые проекты | Период: неделя / месяц / квартал |
| `/favorites` | Избранное | Только отмеченные |
| `/search` | Поиск | `q` по name/description/topics |
| `/repo/[id]` | Репозиторий | Инфо, рост, графики Stars/Forks, ai_summary |
| `/insights` | **AI-инсайты** | Аналитический отчёт + идеи контента ZobninAI |

### Страница `/insights` (AI Trend Intelligence + Root Cause)

**Панель управления**

- Период: **День / Неделя / Месяц**
- **Сформировать отчёт** (кэш 24h), **Обновить принудительно** (1–3 мин, таймер на кнопке)
- Экспорт: **Markdown**, **JSON**, **🧠 Экспорт для ChatGPT** (`chatgpt_report_YYYY_MM_DD.md`)
- Бейдж **температуры рынка** рядом с датой
- При загрузке старый отчёт остаётся на экране (не «замирает» пустым экраном)

**Легенда** вверху страницы (`INSIGHTS_LEGEND`).

**Блоки отчёта** (порядок):

| # | Блок | Поля / суть |
|---|---|---|
| 1 | Краткий вывод | `executive_summary`, `market_temperature` |
| 2 | **Лучший инсайт недели** | `insight_of_the_week` — главный кандидат на публикацию |
| 3 | Ключевые сигналы рынка | `market_signals` (emerging, accelerating, structural_shift, …) |
| 4 | Здоровье трендов | `trend_health` (density, concentration, health_score 0–100) |
| 5 | Главные тренды | `main_trends`, confidence |
| 6 | **Почему это происходит** | `trend_drivers` — причины роста |
| 7 | **Что это означает** | `market_implications` |
| 8 | **Последствия** | `second_order_effects` — эффекты 2-го порядка |
| 9 | **Ошибки рынка** | `market_misconceptions` |
| 10 | **Смена нарратива** | `narrative_shifts` (было → стало) |
| 11 | Динамика / стадия / изменения | `trend_momentum`, `trend_lifecycle`, `changed_since_last_report` |
| 12 | Скрытые / будущие сигналы | `hidden_signals`, `future_trends` |
| 13 | Хайп, наблюдение, контент | `possible_hype`, `projects_to_watch`, `content_recommendations` |

**Контент:** вкладки 💼 LinkedIn, 📸 Instagram, 🎬 Reels, ✈️ Telegram; блок **Weekly Trend Report**;
у LinkedIn/Instagram/Telegram поле **`why_now`** — «Почему важно именно сейчас».

**Кэш:** старые отчёты нормализуются через `normalizeInsights()` (пустые массивы для новых полей).
Полный v2/v3 отчёт — **Обновить принудительно**.

**Запуск:** `D:\Gitrend\GitHub-Trends-Start.bat` → `http://127.0.0.1:3000` (~5 сек если `.next` актуален).
Логи: `data/launch.log`, `data/server.log`. Остановка: `GitHub-Trends-Stop.bat`.

---

## 9. API Routes

Все: `runtime = "nodejs"`, `dynamic = "force-dynamic"`.

### `POST /api/refresh`

Сбор из GitHub. Требует `GITHUB_TOKEN`.

**Ответ:** `{ ok, result: RefreshResult }`.

### `GET /api/repositories`

Query: `q`, `name`, `description`, `language`, `topic`, `minStars`, `maxStars`,
`maxAgeDays`, `activeWithinDays`, `createdWithinDays`, `favoritesOnly`, `sort`, `order`, `limit`.

**Ответ:** `{ ok, total, languages[], items[] }` с `is_favorite`.

### `GET /api/favorites` → `{ ok, ids[] }`

### `POST /api/favorites` → `{ github_id }` toggle → `{ ok, is_favorite }`

### `POST /api/ai/insights` (новый)

**Тело:**

```ts
{
  period?: "daily" | "weekly" | "monthly";  // default: weekly
  force?: boolean;                           // игнорировать кэш
}
```

**Внутри:**

1. Проверка `OPENAI_API_KEY` → иначе `400` + `"OPENAI_API_KEY is not configured"`
2. `getInsightRepositories()`
3. Фильтр по ключевым словам (AI, LLM, agents, automation, RAG, MCP, devtools, …);
   если &lt; 8 совпадений — весь набор кандидатов
4. Сортировка: `daily`→`growth_24h`, `weekly`→`growth_7d`, `monthly`→`growth_30d`
5. slice(0, **50**), `payload_hash`, кэш 24h
6. `generateTrendInsights()` → `gpt-4o-mini`, `max_tokens: 6500`, timeout **180s**
7. `saveTrendReport()`

**Ответ:**

```ts
{ ok: true, cached: boolean, report: TrendInsights }
```

---

## 10. OpenAI Integration (Current State)

### 10.1 Per-repository summary (при refresh)

- **Функция:** `generateRussianSummary()` в `lib/ai.ts`
- **Когда:** в `refreshData()` для репозиториев **без** `ai_summary` (новые или без текста)
- **Модель:** `gpt-4o-mini`, 2–3 предложения на русском
- **Хранение:** `repositories.ai_summary`
- **Показ:** в таблице (под названием) и на `/repo/[id]`

### 10.2 Aggregated trend report (`/insights`)

Два слоя анализа в одном промпте:

1. **Market Intelligence** — сигналы рынка, trend health, structural shifts, hype, hidden/future trends.
2. **Root Cause Intelligence** — не только «что растёт», но **почему**, **что означает**, **последствия**,
   **ошибки рынка**, **смена нарратива**, `insight_of_the_week`.

- **Функция:** `generateTrendInsights(repositories, period, previousReport?)`
- **Модель:** `gpt-4o-mini`, `response_format: json_object`, `temperature: 0.4`
- **Payload:** до **50** репо (compact) + `computed_topic_metrics` + optional `previous_report_summary`
- **Клиент:** fetch timeout **190s**; UI показывает секунды ожидания

Compact repo:

```ts
{
  full_name, description (≤180), stars, forks, language, topics (≤8),
  created_at, pushed_at, growth_24h/7d/30d, growth_*_percent,
  ai_summary (≤120)
}
```

### 10.3 Экспорт (реализовано)

| Кнопка | Файл | Содержимое |
|---|---|---|
| Экспорт Markdown | `insights_YYYY_MM_DD.md` | Полный отчёт |
| Экспорт JSON | `insights_YYYY_MM_DD.json` | `TrendInsights` |
| 🧠 Экспорт для ChatGPT | `chatgpt_report_YYYY_MM_DD.md` | Отчёт + блок «Задача для ChatGPT» |

### 10.4 Что ещё можно добавить (не реализовано)

| Идея | Где |
|---|---|
| «Почему растёт» для одного репо | `/repo/[id]`, `POST /api/ai/explain` |
| Trending score (нормализация роста) | `lib/analytics.ts` |
| Экспорт PDF | `/insights` |
| Per-repo перегенерация `ai_summary` | `/repo/[id]` |

---

## 11. TypeScript: `TrendInsights`

Файл: `lib/types.ts`. Ключевые типы:

```ts
export type MarketTemperature = "холодный" | "умеренный" | "горячий";
export type AttentionLevel = "высокий" | "средний" | "низкий";
export type HypeProbability = "низкая" | "средняя" | "высокая";
export type FutureTrendProbability = "низкая" | "средняя" | "высокая";
export type TrendConcentration = "низкая" | "средняя" | "высокая";
export type MarketSignalType =
  | "emerging" | "accelerating" | "structural_shift"
  | "standardization" | "saturation" | "declining";
export type InsightPeriod = "daily" | "weekly" | "monthly";
```

Структура отчёта (основные блоки):

```ts
export interface TrendInsights {
  generated_at: string;
  market_temperature: MarketTemperature;
  executive_summary: string;

  // Market Intelligence v2
  market_signals: {
    signal_type: MarketSignalType;
    title: string;
    explanation: string;
    confidence: "низкая" | "средняя" | "высокая";
    evidence_repositories: string[];
    trend_leader: { full_name: string; reason: string };
  }[];
  trend_health: {
    trend: string;
    density: number;
    concentration: TrendConcentration;
    health_score: number; // 0–30 слабый, 31–70 развивается, 71–100 сильный
    explanation: string;
  }[];
  hidden_signals: { title: string; explanation: string; evidence_repositories: string[] }[];
  future_trends: {
    trend: string;
    probability: FutureTrendProbability;
    explanation: string;
    evidence_repositories: string[];
  }[];

  main_trends: {
    title: string;
    explanation: string;
    evidence_repositories: string[];
    confidence: "низкая" | "средняя" | "высокая";
  }[];

  // Root Cause Intelligence
  insight_of_the_week: {
    title: string;
    explanation: string;
    evidence_repositories: string[];
  };
  trend_drivers: {
    trend: string;
    drivers: string[];
    explanation: string;
    confidence: "низкая" | "средняя" | "высокая";
  }[];
  market_implications: {
    trend: string;
    implications: string[];
    explanation: string;
  }[];
  second_order_effects: {
    trend: string;
    effect: string;
    confidence: "низкая" | "средняя" | "высокая";
  }[];
  market_misconceptions: {
    misconception: string;
    correction: string;
    evidence_repositories: string[];
  }[];
  narrative_shifts: {
    old_narrative: string;
    new_narrative: string;
    explanation: string;
  }[];

  trend_momentum: { topic: string; status: string; explanation: string; evidence_repositories: string[] }[];
  trend_lifecycle: { topic: string; stage: string; stage_ru: string; explanation: string; evidence_repositories: string[] }[];
  changed_since_last_report: {
    summary: string;
    new_topics: string[];
    stronger_topics: string[];
    weaker_topics: string[];
    disappeared_topics: string[];
    unexpectedly_accelerated_topics: string[];
  };
  controversial_takes: { take: string; explanation: string; evidence_repositories: string[]; content_angle: string }[];
  fastest_growing_projects: { full_name: string; reason: string; why_it_matters: string }[];
  emerging_signals: { signal: string; explanation: string; examples: string[] }[];
  possible_hype: { topic: string; reason: string; hype_probability: HypeProbability }[];
  projects_to_watch: { full_name: string; why_watch: string; attention_level: AttentionLevel }[];

  content_recommendations: {
    linkedin_posts: { title: string; angle: string; key_points: string[]; why_now: string }[];
    instagram_carousels: { title: string; slides: string[]; why_now: string }[];
    reels_ideas: { hook: string; idea: string; talking_points: string[] }[];
    telegram_posts: { title: string; text: string; why_now: string }[];
    weekly_report: { title: string; content: string };
  };
}
```

**UI-маппинги:** `lib/insights-visual.ts` (`CONFIDENCE_VISUAL`, `MARKET_SIGNAL_VISUAL`, `INSIGHTS_LEGEND`, …).
**Нормализация:** `lib/ai.ts` → `normalizeInsights()`, `parseTrendInsightsJson()`.

---

## 12. Existing Limitations

- **История роста:** нужны ≥2 обновления с интервалом; иначе growth = 0 и слабый AI-анализ.
- **Нет cron/автообновления** (пользователь отказался от ежедневного планировщика).
- **Нет trending score** — только абсолютный рост; крупные репо доминируют.
- **Search API** — не официальный GitHub Trending; топ-30 на источник, без пагинации.
- **Фильтрация списков** — на клиенте через полный набор из API (ок для ~200 репо).
- **AI per-repo** только при refresh и только если нет `ai_summary`.
- **Кэш отчёта** 24h по hash — смена данных без force может отдать старый отчёт.
- **Токены в чате:** ключи не должны коммититься; `.env.local` в `.gitignore`.
- **TLS/Avast** на dev-машине — `NODE_EXTRA_CA_CERTS` обязателен для Node.
- **Force refresh** занимает 1–3 мин (большой JSON от OpenAI).
- **Запуск Windows:** использовать `GitHub-Trends-Start.bat`; при ошибках — `data/launch.log`.

---

## 13. Suggested Next Steps (for external AI assistant)

Приоритеты, если продолжать развитие **без переписывания**:

1. **Per-repo root cause** — «Почему растёт» на `/repo/[id]`.
2. **Trending score** — нормализация роста.
3. **Badge «мало снапшотов»** на `/insights`.
4. **Лимиты OpenAI** — токены/стоимость в API-ответе.

```txt
lib/ai.ts              — промпты Market + Root Cause
lib/trend-metrics.ts   — density/concentration
lib/types.ts           — TrendInsights
components/InsightsView.tsx
lib/insights-export.ts — ChatGPT export
launch-app.ps1
```

---

## 14. Quick Reference for ChatGPT

**Вопрос пользователя** → **где смотреть в коде**

| Задача | Файл / маршрут |
|---|---|
| Обновить данные GitHub | `POST /api/refresh`, `lib/github.ts` |
| Список с ростом | `GET /api/repositories`, `lib/analytics.ts` |
| AI-отчёт и контент-идеи | `POST /api/ai/insights`, `lib/ai.ts`, `/insights` |
| Бейджи и цвета `/insights` | `lib/insights-visual.ts`, `StatusBadge.tsx` |
| Root cause блоки | `trend_drivers`, `market_implications`, `second_order_effects` |
| Pre-compute метрик | `lib/trend-metrics.ts` |
| Экспорт ChatGPT | `trendInsightsToChatGptMarkdown()` |
| Запуск / логи | `GitHub-Trends-Start.bat`, `data/launch.log` |
| Схема БД | `lib/sqlite.ts` |
| Типы отчёта | `lib/types.ts` → `TrendInsights` |
| Кэш отчёта | таблица `ai_trend_reports` |
| Запуск локально | `launch-app.ps1` или `npm run build && npm start` |

**Не использовать:** Supabase, Firebase, внешние БД, SaaS-auth — вне scope проекта.
