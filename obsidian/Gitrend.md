---
tags:
  - project
  - gitrend
  - github
  - nextjs
  - ai
aliases:
  - GitHub Trends
  - Gitrend
  - GitHub Тренды
created: 2026-06-03
updated: 2026-06-14
status: active
repo: https://github.com/zobnin8-ux/gitrend
local_path: D:\Gitrend
related:
  - "[[Радар будущего]]"
---

# Gitrend — GitHub Trends Tracker

> Локальное русскоязычное приложение: популярные и быстрорастущие репозитории GitHub, история в SQLite, AI-инсайты для ZobninAI.

**Репозиторий:** [github.com/zobnin8-ux/gitrend](https://github.com/zobnin8-ux/gitrend)  
**Локально:** `D:\Gitrend`  
**Интерфейс:** http://localhost:3000

---

## Быстрый старт

| Шаг | Действие |
|-----|----------|
| 1 | `npm install` |
| 2 | Скопировать `.env.example` → `.env.local` |
| 3 | `GITHUB_TOKEN` (обязательно), `OPENAI_API_KEY` (описания + `/insights`) |
| 4 | **`Gitrend.lnk`** (или `npm run dev`) |
| 5 | **«Обновить данные»** в UI |

> [!warning] Рост и графики
> После первого обновления рост 24h/7d/30d = 0. Нужны повторные обновления (лучше раз в день).

---

## Переменные окружения

```env
GITHUB_TOKEN=ghp_...
OPENAI_API_KEY=sk-...

# Необязательно — для кнопки «Опубликовать на GitHub» в UI
# GIT_EXECUTABLE=C:\Program Files\Git\cmd\git.exe
# GIT_SSL_NO_VERIFY=true
```

**Не коммитить:** `.env.local`, `data/*.db`, логи.

---

## Запуск (Windows)

| | |
|---|---|
| **`Gitrend.lnk`** | Двойной клик — без терминала, браузер, auto-stop при закрытии вкладки |
| Первый раз | `npm run launcher:setup` — собрать exe + создать ярлык |
| Разработка | `npm run dev` |
| Починка SQLite | `npm run rebuild:native` |

- **Node.js:** 20 или 22 LTS (`.nvmrc` → `22`)
- **Логи:** `data/launch.log`, `data/server.log`
- Launcher: `launcher/Gitrend.exe`, `launcher/Gitrend.vbs`, `launch-app.ps1 -Silent`

> [!tip] SSL при git push
> `git config --global http.sslBackend schannel` или `GIT_SSL_NO_VERIFY=true` в `.env.local`

---

## Разделы приложения

| URL | Назначение |
|-----|------------|
| `/` | Обзор |
| `/popular` | Топ по звёздам |
| `/trending/24h`, `/7d`, `/30d` | Быстрорастущие |
| `/new` | Новые проекты |
| `/favorites` | Избранное |
| `/search` | Поиск |
| `/repo/[id]` | Карточка + графики |
| `/insights` | AI-инсайты + Radar JSON |

---

## Таблица репозиториев — описания

- Колонка **«Описание»** — **русский текст** (`ai_summary` от OpenAI).
- Если AI-описания нет — fallback на оригинал с GitHub.
- До **4 строк** (`line-clamp`), fade + tooltip с полным текстом.
- В tooltip при наличии обоих: русский + «Оригинал (GitHub): …»
- Компонент: `ClampedDescription`, логика: `lib/repository-display.ts`

> [!note] Русские описания
> Нужны `OPENAI_API_KEY` и **«Обновить данные»**. Старые репо без `ai_summary` покажут английский текст.

---

## AI-инсайты (`/insights`)

Market intelligence: сигналы рынка, root cause, контент для ZobninAI.

### Блоки

- Краткий вывод, температура рынка
- **📊 Зрелость данных**
- market_signals, trend_health, hidden_signals, future_trends
- trend_drivers, market_implications, second_order_effects
- market_misconceptions, narrative_shifts, insight_of_the_week
- Контент: LinkedIn, Instagram, Reels, Telegram
- Экспорт: Markdown, JSON, ChatGPT
- **Радар будущего (JSON)** — отдельная карточка (без OpenAI)

### Кнопки AI-отчёта

| Кнопка | Действие |
|--------|----------|
| Сформировать отчёт | OpenAI-анализ, кэш 24 ч |
| Обновить принудительно | Игнор кэша, новый полный отчёт |

### Кнопки Radar JSON

| Кнопка | Действие |
|--------|----------|
| Сформировать Radar JSON | `reports/weekly-radar.json` из локальной БД |
| Обновить GitHub + Radar | refresh GitHub + генерация JSON |
| Опубликовать на GitHub | regenerate + `git commit` + `git push` |
| Скачать JSON | скачать файл локально |

> [!warning] Опубликовать на GitHub
> Нужен установленный Git. Если ошибка `ENOENT` — задайте `GIT_EXECUTABLE` в `.env.local` или перезапустите через **`Gitrend.lnk`**.

### Зрелость данных

| Уровень | Условие |
|---------|---------|
| 🔴 Очень низкая | `< 3` дней **или** `< 3` снапшотов |
| 🟠 Низкая | 3–7 дней |
| 🟡 Средняя | 7–14 дней |
| 🟢 Высокая | 14–30 дней |
| 🏆 Очень высокая | > 30 дней |

При низкой зрелости — предупреждающий баннер; OpenAI получает уровень в промпт.

### API

- `POST /api/ai/insights` — `{ period?, force? }`
- `GET/POST /api/radar/weekly` — чтение / генерация JSON
- `POST /api/radar/publish` — `{ regenerate? }` → commit + push
- Кэш AI-отчётов 24 ч (`ai_trend_reports`)

---

## Стек

Next.js 14 · TypeScript · Tailwind · SQLite (`better-sqlite3`) · GitHub API · OpenAI

---

## Ключевые файлы

```txt
components/ClampedDescription.tsx
components/DataMaturityBlock.tsx
components/InsightsView.tsx
components/RepositoryTable.tsx
lib/repository-display.ts
lib/resolve-git.ts                 Поиск git.exe на Windows
lib/data-maturity.ts
lib/ai.ts
lib/insights-export.ts
app/api/radar/weekly/route.ts      API генерации JSON
app/api/radar/publish/route.ts     API commit + push
src/radar/                         Модуль weekly radar
reports/weekly-radar.json          Публикуемый JSON
.github/workflows/weekly-radar.yml Cron: сб 18:00 UTC (21:00 МСК)
docs/RADAR-FUTURE-INTEGRATION-TZ.md  Полное ТЗ для «Радара будущего»
docs/RADAR-SCHEDULE-UPDATE.md        Событие: смена расписания
launch-app.ps1
repair-native.ps1
README.md
PROJECT_OVERVIEW_FOR_AI.md
```

---

## Радар будущего — интеграция

> GitTrend **не знает о Telegram** и **не публикует** в канал. Только еженедельный JSON с GitHub-трендами.

### Разделение ответственности

| Система | Вопрос |
|---------|--------|
| **GitTrend** | Что быстро растёт среди разработчиков на GitHub? |
| **[[Радар будущего]]** | Почему это важно для будущего? Публиковать? Какой уровень? Пост в Telegram |

### Файл и Raw URL

```text
reports/weekly-radar.json
```

**Raw (точка интеграции для Радара):**  
https://raw.githubusercontent.com/zobnin8-ux/gitrend/main/reports/weekly-radar.json

### Расписание

| Система | Когда | Cron |
|---------|-------|------|
| **GitTrend** (Actions) | Суббота **18:00 UTC** = **21:00 МСК** | `0 18 * * 6` |
| **Радар будущего** | Воскресенье **07:00 UTC** = **10:00 МСК** | `0 7 * * 0` |

**Timeline:** Сб 21:00 МСК GitTrend push JSON → Вс 10:00 МСК Радар fetch → enrich → Telegram

### GitHub Actions (GitTrend)

- Workflow: `.github/workflows/weekly-radar.yml`
- Шаги: restore SQLite cache → `radar:refresh` → `radar:weekly` → commit + push
- Кэш `data/github-trends.db` между запусками — история снапшотов копится
- Ручной запуск: Actions → **Weekly Radar Report** → Run workflow

### Локальные команды

```bash
npm run radar:weekly                      # генерация из локальной БД
npm run radar:weekly -- --commit          # + git commit
npm run radar:weekly -- --refresh --commit --push
npm run radar:refresh                     # только обновить данные GitHub
npm run radar:weekly:publish              # refresh + commit + push
```

### Что внутри отчёта

- **1–3 тренда** (не отдельные репо, не топ по звёздам)
- Если достойных нет → `"trends": []` (норма)
- Поля тренда: `title`, `summary`, `whyTrending`, `category`, `signalStrength`, `repos[]`

**Категории:** `ai-agents`, `developer-tools`, `mcp`, `automation`, `robotics`, `computer-vision`, `voice-ai`, `llm`, `infrastructure`, `security`, `data`, `productivity`

### Критерии отбора (GitTrend)

- ≥2 репозитория в одной категории
- устойчивый недельный рост + история снапшотов ≥2 дней
- активность (`pushed_at` ≤ 14 дней)
- рост не сосредоточен в одном репо (≤72%)
- категория `other` не включается

### Что делает «Радар будущего» (отдельный проект)

1. `GET` Raw URL (**вс 07:00 UTC / 10:00 МСК**)
2. Валидация JSON
3. OpenAI: уровень радара, «почему важно для будущего»
4. Пост в Telegram через Bot API
5. State: не публиковать одну `week` дважды

**Env Радара (не GitTrend):**

```env
TELEGRAM_BOT_TOKEN=…
TELEGRAM_CHANNEL_ID=@…
GITTREND_RADAR_URL=https://raw.githubusercontent.com/zobnin8-ux/gitrend/main/reports/weekly-radar.json
OPENAI_API_KEY=…
```

> [!info] Документация для Радара
> - `docs/RADAR-FUTURE-INTEGRATION-TZ.md` — полное ТЗ, модули, критерии приёмки
> - `docs/RADAR-SCHEDULE-UPDATE.md` — краткое ТЗ по смене расписания (событие)

---

## Чеклист

- [ ] `.env.local` с токенами
- [ ] «Обновить данные» без ошибок
- [ ] В таблице — русские описания (после refresh с OpenAI)
- [ ] `/insights` формирует AI-отчёт
- [ ] `/insights` → Radar JSON генерируется
- [ ] «Опубликовать на GitHub» пушит без ошибки
- [ ] Зрелость данных растёт со снапшотами
- [ ] **Gitrend.lnk** открывает браузер
- [ ] Raw URL `weekly-radar.json` открывается в браузере
- [ ] GitHub Actions **Weekly Radar Report** — зелёный (после субботы 21:00 МСК)

---

## Связанные заметки

- [[Радар будущего]]
- [[ZobninAI — контент]]
- [[GitHub PAT]]
- [[OpenAI API]]

---

*Файл: `obsidian/Gitrend.md` — скопируйте в vault Obsidian.*
