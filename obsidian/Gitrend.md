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
updated: 2026-06-04
status: active
repo: https://github.com/zobnin8-ux/gitrend
local_path: D:\Gitrend
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
src/radar/generateWeeklyRadar.ts   JSON для «Радара будущего»
reports/weekly-radar.json
launch-app.ps1
repair-native.ps1
README.md
PROJECT_OVERVIEW_FOR_AI.md
```

---

## Радар будущего (weekly-radar.json)

GitTrend **не публикует в Telegram**. Раз в неделю — файл `reports/weekly-radar.json` (1–3 GitHub-тренда).

**Raw:** https://raw.githubusercontent.com/zobnin8-ux/gitrend/main/reports/weekly-radar.json

```bash
npm run radar:weekly
npm run radar:weekly -- --commit
```

GitHub Actions: воскресенье 10:00 UTC → refresh → generate → commit.

---

## Чеклист

- [ ] `.env.local` с токенами
- [ ] «Обновить данные» без ошибок
- [ ] В таблице — русские описания (после refresh с OpenAI)
- [ ] `/insights` формирует отчёт
- [ ] Зрелость данных растёт со снапшотами
- [ ] Start.bat открывает браузер

---

## Связанные заметки

- [[ZobninAI — контент]]
- [[GitHub PAT]]
- [[OpenAI API]]

---

*Файл: `obsidian/Gitrend.md` — скопируйте в vault Obsidian.*
