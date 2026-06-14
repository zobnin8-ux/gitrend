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
updated: 2026-06-09
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
| 4 | `GitHub-Trends-Start.bat` или `npm run dev` |
| 5 | **«Обновить данные»** в UI |

> [!warning] Рост и графики
> После первого обновления рост 24h/7d/30d = 0. Нужны повторные обновления (лучше раз в день).

---

## Переменные окружения

```env
GITHUB_TOKEN=ghp_...
OPENAI_API_KEY=sk-...
```

**Не коммитить:** `.env.local`, `data/*.db`, логи.

---

## Запуск (Windows)

| Файл | Назначение |
|------|------------|
| `GitHub-Trends-Start.bat` | Сборка (если нужно) + сервер + браузер |
| `GitHub-Trends-Stop.bat` | Остановка сервера на порту 3000 |
| `GitHub-Trends-Repair.bat` | Переустановка `better-sqlite3` после смены Node |

- **Node.js:** 20 или 22 LTS (`.nvmrc` → `22`). Node 24 без пересборки ломает SQLite.
- **Не двойной клик** по Start — дождитесь браузера.
- **Логи:** `data/launch.log`, `data/server.log`
- Свёрнутое окно **«GitHub Trends Server»** — сервер работает.

> [!tip] SSL при git push
> `git config --global http.sslBackend schannel`

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
| `/insights` | AI-инсайты |

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
- Кэш 24 ч (`ai_trend_reports`)

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
lib/data-maturity.ts
lib/ai.ts
lib/insights-export.ts
lib/insights-export.ts
src/radar/                         Модуль weekly radar
reports/weekly-radar.json          Публикуемый JSON
.github/workflows/weekly-radar.yml Cron: сб 18:00 UTC (21:00 МСК)
docs/RADAR-FUTURE-INTEGRATION-TZ.md  ТЗ для «Радара будущего»
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

### Расписание GitTrend

- **GitHub Actions:** `.github/workflows/weekly-radar.yml`
- **Когда:** суббота **18:00 UTC** (21:00 МСК) — к воскресенью утром JSON на GitHub
- **Шаги:** refresh GitHub → `npm run radar:weekly` → commit + push JSON

### Локальные команды

```bash
npm run radar:weekly                      # генерация из локальной БД
npm run radar:weekly -- --commit          # + git commit
npm run radar:weekly -- --refresh --commit --push
npm run radar:refresh                     # только обновить данные GitHub
```

### Что внутри отчёта

- **1–3 тренда** (не отдельные репо, не топ по звёздам)
- Если достойных нет → `"trends": []` (норма)
- Поля тренда: `title`, `summary`, `whyTrending`, `category`, `signalStrength`, `repos[]`

**Категории:** `ai-agents`, `developer-tools`, `mcp`, `automation`, `robotics`, `computer-vision`, `voice-ai`, `llm`, `infrastructure`, `security`, `data`, `productivity`

**Пример:**

```json
{
  "week": "2026-W24",
  "generatedAt": "2026-06-09T20:52:29.515Z",
  "trends": [{
    "title": "Рост AI-агентов для разработки",
    "category": "ai-agents",
    "signalStrength": "high",
    "repos": [{ "name": "…", "url": "…", "stars": 0, "starsDelta": 0 }]
  }]
}
```

### Критерии отбора (GitTrend)

- ≥2 репозитория в одной категории
- устойчивый недельный рост + история снапшотов
- активность (`pushed_at` ≤ 14 дней)
- рост не сосредоточен в одном репо (≤72%)
- категория `other` не включается

### Что делает «Радар будущего» (отдельный проект)

1. `GET` Raw URL (лучше **вс 11:30 UTC**, буфер после GitTrend)
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

> [!info] Полное ТЗ
> `docs/RADAR-FUTURE-INTEGRATION-TZ.md` — модули, cron, критерии приёмки, mermaid-схема.

---

## Чеклист

- [ ] `.env.local` с токенами
- [ ] «Обновить данные» без ошибок
- [ ] В таблице — русские описания (после refresh с OpenAI)
- [ ] `/insights` формирует отчёт
- [ ] Зрелость данных растёт со снапшотами
- [ ] Start.bat открывает браузер
- [ ] Raw URL `weekly-radar.json` открывается в браузере
- [ ] GitHub Actions **Weekly Radar Report** — зелёный (после вс)

---

## Связанные заметки

- [[Радар будущего]]
- [[ZobninAI — контент]]
- [[GitHub PAT]]
- [[OpenAI API]]

---

*Файл: `obsidian/Gitrend.md` — скопируйте в vault Obsidian.*
