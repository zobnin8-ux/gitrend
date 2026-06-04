import type { DataMaturity, TrendInsights } from "./types";
import { MARKET_SIGNAL_VISUAL, MATURITY_VISUAL } from "./insights-visual";

function reportDateSlug(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}_${String(now.getDate()).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, "0")}_${String(d.getDate()).padStart(2, "0")}`;
}

export function getInsightsExportBasename(report: TrendInsights): string {
  return `insights_${reportDateSlug(report.generated_at)}`;
}

function dataMaturityMarkdownSection(maturity: DataMaturity): string[] {
  const badge = MATURITY_VISUAL[maturity.level];
  const levelLabel = badge
    ? `${badge.icon} ${maturity.level}`
    : maturity.level;

  return [
    `## 📊 Зрелость данных`,
    ``,
    `- **Уровень:** ${levelLabel}`,
    `- **История:** ${maturity.history_days} дней`,
    `- **Снапшотов:** ${maturity.snapshots_count}`,
    `- **Репозиториев с историей:** ${maturity.repositories_with_history}`,
    `- **Последнее обновление:** ${maturity.last_snapshot_at ?? "—"}`,
    `- **Описание:** ${maturity.explanation}`,
    ``,
  ];
}

export function trendInsightsToMarkdown(
  report: TrendInsights,
  dataMaturity?: DataMaturity | null
): string {
  const lines: string[] = [
    `# AI-инсайты по GitHub-трендам`,
    ``,
    `**Дата:** ${report.generated_at}`,
    `**Температура рынка:** ${report.market_temperature ?? "—"}`,
    ``,
  ];

  if (dataMaturity) {
    lines.push(...dataMaturityMarkdownSection(dataMaturity));
  }

  lines.push(
    `## Краткий вывод`,
    ``,
    report.executive_summary || "—",
    ``,
  );

  if (report.insight_of_the_week?.title) {
    lines.push(
      `## Лучший инсайт недели`,
      ``,
      `### ${report.insight_of_the_week.title}`,
      report.insight_of_the_week.explanation,
      ``,
      `Репозитории: ${report.insight_of_the_week.evidence_repositories.join(", ")}`,
      ``
    );
  }

  if (report.market_signals?.length) {
    lines.push(`## Ключевые сигналы рынка`, ``);
    for (const s of report.market_signals) {
      const vis = MARKET_SIGNAL_VISUAL[s.signal_type];
      lines.push(
        `### ${vis?.icon ?? ""} ${s.title} (${s.signal_type})`,
        `- Уверенность: ${s.confidence}`,
        `- Лидер: ${s.trend_leader?.full_name ?? "—"} — ${s.trend_leader?.reason ?? ""}`,
        ``,
        s.explanation,
        ``,
        `Репозитории: ${s.evidence_repositories.join(", ")}`,
        ``
      );
    }
  }

  if (report.trend_health?.length) {
    lines.push(`## Здоровье трендов`, ``);
    for (const h of report.trend_health) {
      lines.push(
        `### ${h.trend}`,
        `- Плотность: ${h.density} репозиториев`,
        `- Концентрация: ${h.concentration}`,
        `- Health score: ${h.health_score}/100`,
        ``,
        h.explanation,
        ``
      );
    }
  }

  if (report.main_trends?.length) {
    lines.push(`## Главные тренды`, ``);
    for (const t of report.main_trends) {
      lines.push(
        `### ${t.title}`,
        `- Уверенность: ${t.confidence}`,
        ``,
        t.explanation,
        ``,
        `Репозитории: ${t.evidence_repositories.join(", ")}`,
        ``
      );
    }
  }

  if (report.trend_drivers?.length) {
    lines.push(`## Почему это происходит`, ``);
    for (const d of report.trend_drivers) {
      lines.push(
        `### ${d.trend} (${d.confidence})`,
        ...d.drivers.map((x) => `- ${x}`),
        ``,
        d.explanation,
        ``
      );
    }
  }

  if (report.market_implications?.length) {
    lines.push(`## Что это означает`, ``);
    for (const m of report.market_implications) {
      lines.push(
        `### ${m.trend}`,
        ...m.implications.map((x) => `- ${x}`),
        ``,
        m.explanation,
        ``
      );
    }
  }

  if (report.second_order_effects?.length) {
    lines.push(`## Последствия`, ``);
    for (const e of report.second_order_effects) {
      lines.push(`- **${e.trend}** (${e.confidence}): ${e.effect}`);
    }
    lines.push(``);
  }

  if (report.market_misconceptions?.length) {
    lines.push(`## Ошибки рынка`, ``);
    for (const m of report.market_misconceptions) {
      lines.push(
        `**Заблуждение:** ${m.misconception}`,
        `**Реальность:** ${m.correction}`,
        ``
      );
    }
  }

  if (report.narrative_shifts?.length) {
    lines.push(`## Смена нарратива`, ``);
    for (const n of report.narrative_shifts) {
      lines.push(`- ${n.old_narrative} → ${n.new_narrative}: ${n.explanation}`);
    }
    lines.push(``);
  }

  if (report.hidden_signals?.length) {
    lines.push(`## Что большинство пропускает`, ``);
    for (const h of report.hidden_signals) {
      lines.push(`### ${h.title}`, h.explanation, ``, `Репозитории: ${h.evidence_repositories.join(", ")}`, ``);
    }
  }

  if (report.future_trends?.length) {
    lines.push(`## Возможные будущие тренды`, ``);
    for (const f of report.future_trends) {
      lines.push(`- **${f.trend}** (${f.probability}): ${f.explanation}`);
    }
    lines.push(``);
  }

  if (report.trend_momentum?.length) {
    lines.push(`## Динамика трендов`, ``);
    for (const m of report.trend_momentum) {
      lines.push(`- **${m.topic}** (${m.status}): ${m.explanation}`);
    }
    lines.push(``);
  }

  if (report.trend_lifecycle?.length) {
    lines.push(`## Стадия тренда`, ``);
    for (const l of report.trend_lifecycle) {
      lines.push(`- **${l.topic}** (${l.stage_ru}): ${l.explanation}`);
    }
    lines.push(``);
  }

  if (report.changed_since_last_report) {
    const ch = report.changed_since_last_report;
    lines.push(`## Что изменилось с прошлого отчёта`, ``, ch.summary, ``);
    if (ch.new_topics.length)
      lines.push(`**Появилось впервые:** ${ch.new_topics.join(", ")}`, ``);
    if (ch.stronger_topics.length)
      lines.push(`**Усилилось:** ${ch.stronger_topics.join(", ")}`, ``);
    if (ch.weaker_topics.length)
      lines.push(`**Ослабло:** ${ch.weaker_topics.join(", ")}`, ``);
    if (ch.disappeared_topics.length)
      lines.push(`**Исчезло:** ${ch.disappeared_topics.join(", ")}`, ``);
    if (ch.unexpectedly_accelerated_topics?.length)
      lines.push(
        `**Неожиданно ускорилось:** ${ch.unexpectedly_accelerated_topics.join(", ")}`,
        ``
      );
  }

  if (report.emerging_signals?.length) {
    lines.push(`## Новые сигналы`, ``);
    for (const s of report.emerging_signals) {
      lines.push(`- **${s.signal}**: ${s.explanation}`);
    }
    lines.push(``);
  }

  if (report.possible_hype?.length) {
    lines.push(`## Возможный хайп`, ``);
    for (const h of report.possible_hype) {
      lines.push(
        `- **${h.topic}** (вероятность: ${h.hype_probability ?? "—"}): ${h.reason}`
      );
    }
    lines.push(``);
  }

  if (report.projects_to_watch?.length) {
    lines.push(`## За чем наблюдать`, ``);
    for (const p of report.projects_to_watch) {
      lines.push(
        `- **${p.full_name}** (${p.attention_level ?? "—"}): ${p.why_watch}`
      );
    }
    lines.push(``);
  }

  const cr = report.content_recommendations;
  if (cr?.weekly_report?.content) {
    lines.push(`## Weekly Trend Report`, ``, `### ${cr.weekly_report.title}`, ``, cr.weekly_report.content, ``);
  }
  if (cr?.linkedin_posts?.length) {
    lines.push(`## LinkedIn`, ``);
    for (const p of cr.linkedin_posts) {
      lines.push(
        `### ${p.title}`,
        p.angle,
        p.why_now ? `**Почему сейчас:** ${p.why_now}` : "",
        ``,
        ...p.key_points.map((k) => `- ${k}`),
        ``
      );
    }
  }
  if (cr?.telegram_posts?.length) {
    lines.push(`## Telegram`, ``);
    for (const p of cr.telegram_posts) {
      lines.push(
        `### ${p.title}`,
        p.why_now ? `**Почему сейчас:** ${p.why_now}` : "",
        ``,
        p.text,
        ``
      );
    }
  }
  if (cr?.instagram_carousels?.length) {
    lines.push(`## Instagram`, ``);
    for (const c of cr.instagram_carousels) {
      lines.push(
        `### ${c.title}`,
        c.why_now ? `**Почему сейчас:** ${c.why_now}` : "",
        ...c.slides.map((s, i) => `${i + 1}. ${s}`),
        ``
      );
    }
  }
  if (cr?.reels_ideas?.length) {
    lines.push(`## Reels`, ``);
    for (const r of cr.reels_ideas) {
      lines.push(`### ${r.hook}`, r.idea, ``, ...r.talking_points.map((t) => `- ${t}`), ``);
    }
  }

  return lines.join("\n");
}

const CHATGPT_TASK = `
---

## Задача для ChatGPT:

Проанализируй этот отчёт как AI-аналитик.

1. Найди слабые места анализа.
2. Найди сигналы, которые могли быть пропущены.
3. Предложи более сильные идеи контента.
4. Предложи темы для LinkedIn.
5. Предложи темы для Instagram.
6. Предложи темы для Telegram.
`.trim();

export function trendInsightsToChatGptMarkdown(
  report: TrendInsights,
  dataMaturity?: DataMaturity | null
): string {
  return (
    trendInsightsToMarkdown(report, dataMaturity) + "\n" + CHATGPT_TASK + "\n"
  );
}

export function trendInsightsToExportJson(
  report: TrendInsights,
  dataMaturity?: DataMaturity | null
): string {
  const payload = dataMaturity
    ? { ...report, data_maturity: dataMaturity }
    : report;
  return JSON.stringify(payload, null, 2);
}

export function downloadTextFile(
  content: string,
  filename: string,
  mime: string
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
