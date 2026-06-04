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
  root cause, идеи контента, экспорт Markdown / JSON / ChatGPT.
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

3. **Windows (рекомендуется):** двойной клик по `GitHub-Trends-Start.bat`

   - автоматическая сборка при изменении кода;
   - запуск сервера и открытие браузера;
   - остановка: `GitHub-Trends-Stop.bat`;
   - починка SQLite после смены Node: `GitHub-Trends-Repair.bat`.

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
> запустите `GitHub-Trends-Repair.bat`. Лаунчер выбирает совместимую версию Node
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
  /insights          AI-инсайты по GitHub-трендам
  /popular, /trending/*, /new, /favorites, /search, /repo/[id]

/components
  RepositoryTable       Таблица репозиториев
  ClampedDescription    Многострочное описание + tooltip
  InsightsView          UI AI-отчёта
  DataMaturityBlock     Блок «Зрелость данных»
  GrowthChart, Filters, StatsCards, …

/lib
  github.ts             GitHub REST API и refresh
  sqlite.ts             SQLite-схема и запросы
  analytics.ts          Расчёт роста
  ai.ts                 OpenAI: описания и TrendInsights
  data-maturity.ts      Зрелость данных (server)
  repository-display.ts Русское описание для таблицы
  insights-export.ts    Экспорт MD / JSON / ChatGPT

/data
  github-trends.db      Локальная БД (в .gitignore)

GitHub-Trends-Start.bat / Stop.bat / Repair.bat
launch-app.ps1          Лаунчер Windows
obsidian/Gitrend.md     Заметка для Obsidian
```

## AI-инсайты

Раздел `/insights` формирует структурированный отчёт: сигналы рынка, trend health,
root cause (драйверы, импликации, misconceptions), идеи контента для ZobninAI.
Блок **«Зрелость данных»** показывает, насколько истории снапшотов достаточно
для уверенных выводов. Экспорт: Markdown, JSON, ChatGPT.

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

## Документация

- `PROJECT_OVERVIEW_FOR_AI.md` — полный обзор для AI-ассистентов
- `obsidian/Gitrend.md` — краткая заметка для Obsidian
