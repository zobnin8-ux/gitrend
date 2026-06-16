# GitHub Тренды — трекер популярных и быстрорастущих репозиториев

Локальное русскоязычное веб-приложение для отслеживания самых популярных и
быстрее всего набирающих звёзды GitHub-репозиториев. Хранит историю изменений,
строит графики роста, формирует AI-инсайты по рынку и помогает видеть
технологические тренды.

> Приложение предназначено **только для локального использования**: без
> авторизации, без пользователей, без внешних баз данных. Все данные хранятся
> локально в SQLite.

**Репозиторий:** https://github.com/zobnin8-ux/gitrend

## Возможности

- **Обзор** — сводные карточки: всего репозиториев, новых за неделю/месяц,
  самый быстрорастущий, самый популярный, самый популярный язык.
- **Популярные сейчас** — список по общему количеству звёзд.
- **Быстрорастущие за 24 часа / 7 дней / 30 дней** — рост звёзд за период,
  абсолютный и в процентах.
- **Новые проекты** — фильтр по периоду создания (неделя / месяц / квартал).
- **Избранное** — личный список отмеченных репозиториев.
- **Поиск** — глобальный поиск по названию, описанию и темам.
- **Страница репозитория** — общая информация, текущая статистика, показатели
  роста и линейные графики Stars/Forks за 7 / 30 / 90 дней и всё время.
- **Фильтры** — по названию, описанию, языку, теме, количеству звёзд, возрасту
  и активности.
- **История** — каждое обновление создаёт snapshot (Stars, Forks, Issues, дата).
- **Русские описания репозиториев** — в таблице показывается AI-описание на
  русском (до 4 строк, tooltip с полным текстом и оригиналом с GitHub).
- **AI-инсайты** (`/insights`) — аналитический отчёт по трендам: сигналы рынка,
  root cause, идеи контента, **Most Surprising Insight**, **LinkedIn Post** (EN/RU),
  экспорт Markdown / JSON / ChatGPT.
- **Weird Finds** (`/weird`) — discovery gallery странных репозиториев: короткое human explanation,
  фильтры, drawer с деталями (без storytelling в карточках).
- **Зрелость данных** — индикатор надёжности AI-анализа по объёму истории
  снапшотов.

## Технологический стек

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **SQLite** через `better-sqlite3`
- **GitHub REST API** (через встроенный `fetch`)
- **OpenAI API** — опционально (описания репо и раздел `/insights`)
- Графики — собственный лёгкий SVG-компонент (без внешних библиотек)

## Требования

- **Node.js 20 или 22 LTS** (рекомендуется; см. `.nvmrc`)
- Аккаунт GitHub и **Personal Access Token** (read-only достаточно)

## Установка и запуск

1. Установить зависимости:

```bash
npm install
```

2. Создать файл `.env.local` на основе примера и заполнить токены:

```bash
copy .env.example .env.local   # Windows
# cp .env.example .env.local    # macOS / Linux
```

```env
GITHUB_TOKEN=ghp_ваш_токен
OPENAI_API_KEY=          # для русских описаний и AI-инсайтов
```

Токен GitHub: https://github.com/settings/tokens

3. **Windows (рекомендуется):** один раз собрать launcher и ярлык:

```bash
npm run launcher:setup
```

Дальше — двойной клик по **`GitHub Trends.lnk`** в корне проекта (иконка **GIT**, имя видно сразу):

- без окна терминала;
- автоматическая сборка при изменении кода;
- браузер открывается сам;
- при закрытии последней вкладки сервер останавливается.

> **Один клик** — не двойной. Если сборка идёт 1–2 минуты, подождите; повторный клик
> дождётся готовности сервера (см. `data/launch.log`).

Починка SQLite после смены Node: `npm run rebuild:native` или `repair-native.ps1`.

4. **Разработка:**

```bash
npm run dev
```

Открыть http://localhost:3000

5. Нажать **«Обновить данные»** — загрузка репозиториев из GitHub, снапшоты и
   (при наличии `OPENAI_API_KEY`) русские AI-описания.

> **Рост и графики.** После первого обновления рост 24h/7d/30d = 0 (одна точка
> истории). Обновляйте данные периодически (лучше раз в день).

> **Node.js на Windows.** Если приложение не стартует после обновления Node,
> выполните `npm run rebuild:native`. Launcher подбирает совместимую версию Node
> и пересобирает `better-sqlite3` при необходимости.

## Сборка production-версии

```bash
npm run build
npm run start
```

## Структура проекта

```txt
/app
  /api
    /refresh         POST — обновление данных из GitHub
    /repositories    GET  — список репозиториев с ростом и фильтрами
    /favorites       GET/POST — избранное
    /ai/insights     POST — генерация AI-отчёта
    /ai/insights/linkedin-post  POST — перегенерация LinkedIn-поста
    /radar/weekly      GET/POST — чтение / генерация weekly-radar.json
    /radar/publish     POST — commit + push отчёта на GitHub
    /weird             GET  — список weird finds
    /weird/details   GET  — детали для drawer
  /insights          AI-инсайты по GitHub-трендам
  /weird             Weird GitHub Finds (алиас /weird-finds → redirect)
  /popular, /trending/*, /new, /favorites, /search, /repo/[id]

/components
  RepositoryTable       Таблица репозиториев
  ClampedDescription    Многострочное описание + tooltip
  InsightsView          UI AI-отчёта
  MostSurprisingInsightSection  Блок «самый неожиданный инсайт»
  LinkedInPostSection   LinkedIn-пост (EN/RU, Copy, Regenerate)
  WeirdFindsView        Карточки Weird Finds
  DataMaturityBlock     Блок «Зрелость данных»
  GrowthChart, Filters, StatsCards, …

/lib
  github.ts             GitHub REST API и refresh
  sqlite.ts             SQLite-схема и запросы
  analytics.ts          Расчёт роста
  ai.ts                 OpenAI: описания и TrendInsights
  linkedin-post-quality.ts      Валидация LinkedIn-поста
  linkedin-post-evidence.ts     Evidence brief для поста
  linkedin-surprising-insight.ts  Извлечение most_surprising_insight
  linkedin-reasoning-safety.ts  Reasoning map + защита от overclaim
  weird.ts              Скоринг и отбор Weird Finds
  weird-short-description.ts  Human explanation для карточек (не README summary)
  weird-ai.ts           OpenAI для weekly-radar telegramPost (Radar only)
  data-maturity.ts      Зрелость данных (server)
  repository-display.ts Русское описание для таблицы
  insights-export.ts    Экспорт MD / JSON / ChatGPT

/data
  github-trends.db      Локальная БД (в .gitignore)

launch-app.ps1          Лаунчер Windows (вызывается из Gitrend.vbs)
GitHub Trends.lnk       Ярлык запуска (npm run launcher:shortcut)
launcher/               Gitrend.vbs, gitrend-icon.png, Gitrend.ico
obsidian/Gitrend.md     Заметка для Obsidian
```

## AI-инсайты

Раздел `/insights` формирует структурированный отчёт: сигналы рынка, trend health,
root cause (драйверы, импликации, misconceptions), идеи контента для ZobninAI.

### Most Surprising Insight

Перед LinkedIn Post — блок с **самым неожиданным** наблюдением из отчёта: что
контринтуитивно, почему это важно, на каких репозиториях основано. Якорь для
LinkedIn-поста (не пересказ категории).

### LinkedIn Post

Готовый пост для LinkedIn на `/insights` (English / Русский):

**Пайплайн (без смены UI):**
1. `most_surprising_insight` — якорь «что удивило»
2. Key insight + **reasoning map** (`observations` / `interpretations` / `hypotheses`)
3. Естественная проза (не отчёт с заголовками)
4. Валидация: generic-фразы, section labels, repo evidence, **reasoning safety** (без overclaim)

**Reasoning safety** (`lib/linkedin-reasoning-safety.ts`):
- **observation** — то, что видно в данных GitTrend (рост, концентрация, репозитории)
- **interpretation** — осторожное чтение (`may`, `could`, `appears`)
- **hypothesis** — открытый вопрос или возможность, не факт
- Отклоняются неподтверждённые claims: saturation, lack of innovation, business adoption, «proves that…»

- длина **200–600 слов** (цель 250–450), голос founder/analyst;
- кнопки **Copy** и **Regenerate**; кэш вместе с отчётом.

Блок **«Зрелость данных»** показывает, насколько истории снапшотов достаточно
для уверенных выводов. Экспорт: Markdown, JSON, ChatGPT.

## Weird Finds

Раздел `/weird` — **discovery gallery**: «кто вообще сделал такую штуку?», без market intelligence.

**GitTrend** отвечает: *что это?* (human explanation).  
**Радар будущего** отвечает: *почему это забавно?* — только в `weirdFindOfTheWeek.telegramPost`.

### Карточки

Только: название, категория, **short_description** (30–120 символов, как объяснил бы друг в баре), ⭐, +7d, weird score.

Не README-summary: без «репозиторий представляет», «инструмент для», «исходный код».

Клик → **боковой drawer**: GitHub, описание, AI-summary, README, topics, метрики.

### API

- `GET /api/weird?filter=&category=&limit=` — список карточек
- `GET /api/weird/details?github_id=` — детали для drawer

## Источники данных (GitHub)

При обновлении опрашиваются: Trending, AI, LLM, Agents, Automation, Developer
Tools, Open Source и др. (9 запросов, дедупликация по GitHub ID).

## Расчёт показателей

- **Рост за период** = текущие Stars − Stars на начало периода (по снапшотам).
- **Рост в %** = (новые Stars / старые Stars) × 100.
- **Средний рост в день** = рост за период / число дней.

## Замечания

- База данных (`/data/*.db`) и `.env.local` в `.gitignore`.
- GitHub Search API: ~30 запросов/мин с токеном; одно обновление ≈ 9 запросов.
- При `git push` на Windows и ошибке SSL: `git config --global http.sslBackend schannel`

## Еженедельный отчёт «Радар будущего»

GitTrend **не публикует в Telegram** и не знает о канале. Раз в неделю формируется
файл для внешнего проекта «Радар будущего»:

```txt
reports/weekly-radar.json
```

**Raw URL (пример):**  
`https://raw.githubusercontent.com/zobnin8-ux/gitrend/main/reports/weekly-radar.json`

### Содержимое

1–3 **тренда** (не отдельные репозитории): заголовок, summary, whyTrending,
категория, signalStrength, список repos. Если достойных трендов нет — `"trends": []`.

Опционально: **`weirdFindOfTheWeek`** — один «странный GitHub недели» для Радара
(`shortDescription`, `telegramTitle`, `telegramPost`, метрики). Storytelling только в `telegramPost`.

```json
{
  "title": "Desktop Goose",
  "repo": "user/repo",
  "url": "https://github.com/user/repo",
  "category": "Desktop Pets",
  "shortDescription": "Кот, который живёт поверх окон рабочего стола.",
  "stars": 1200,
  "weeklyGrowth": 45,
  "weirdScore": 72,
  "telegramTitle": "Странный GitHub недели: desktop goose",
  "telegramPost": "На этой неделе в GitHub..."
}
```

GitTrend UI **не** показывает weekly-победителя — только галерея `/weird`. Radar публикует `telegramPost` в воскресенье 19:00.

### Локально

```bash
npm run radar:weekly              # сгенерировать JSON из локальной БД
npm run radar:weekly -- --commit  # + git commit
npm run radar:weekly -- --refresh --commit --push  # обновить данные + commit + push
```

### Автоматически (GitHub Actions)

Workflow `.github/workflows/weekly-radar.yml` — **каждую субботу 18:00 UTC (21:00 МСК)**:
обновление данных GitHub → генерация → commit `reports/weekly-radar.json`.
Файл готов к воскресенью для проекта «Радар будущего»:
- **10:40 МСК** — serious trends (`trends[]`)
- **19:00 МСК** — «Странный GitHub недели» (`weirdFindOfTheWeek.telegramPost`)

В secrets репозитория нужен `GITHUB_TOKEN` (для Actions создаётся автоматически;
для Search API достаточно прав public read).

### Модуль

```txt
src/radar/generateWeeklyRadar.ts  — детекция трендов и запись JSON
src/radar/weirdFindOfWeek.ts      — отбор weirdFindOfTheWeek для JSON
src/radar/commitReport.ts         — git commit
```

---

## Документация

- `PROJECT_OVERVIEW_FOR_AI.md` — полный обзор для AI-ассистентов
- `obsidian/Gitrend.md` — краткая заметка для Obsidian
