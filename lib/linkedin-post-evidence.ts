import type { TrendInsights } from "./types";

/** Structured observable signals from GitTrend report — evidence before interpretation. */
export function buildLinkedInEvidenceBrief(
  report: TrendInsights,
  analyzedRepositories: number
): Record<string, unknown> {
  const trendHealth = (report.trend_health ?? []).map((h) => ({
    trend: h.trend,
    concentration: h.concentration,
    density: h.density,
    health_score: h.health_score,
    explanation: h.explanation,
  }));

  const clustering = (report.main_trends ?? []).map((t) => ({
    category: t.title,
    repository_count: t.evidence_repositories?.length ?? 0,
    repositories: (t.evidence_repositories ?? []).slice(0, 8),
    confidence: t.confidence,
  }));

  const signals = (report.market_signals ?? []).map((s) => ({
    signal_type: s.signal_type,
    title: s.title,
    confidence: s.confidence,
    evidence_repositories: s.evidence_repositories ?? [],
    trend_leader: s.trend_leader?.full_name,
    explanation: s.explanation,
  }));

  const momentum = (report.trend_momentum ?? []).map((m) => ({
    topic: m.topic,
    status: m.status,
    explanation: m.explanation,
    evidence_repositories: m.evidence_repositories ?? [],
  }));

  const lifecycle = (report.trend_lifecycle ?? []).map((l) => ({
    topic: l.topic,
    stage: l.stage,
    stage_ru: l.stage_ru,
    explanation: l.explanation,
  }));

  const changed = report.changed_since_last_report;

  return {
    analyzed_repositories: analyzedRepositories,
    market_temperature: report.market_temperature,
    priority_order: [
      "repository growth patterns",
      "trend clustering (main_trends + evidence_repositories)",
      "category concentration (trend_health.concentration)",
      "distribution of growth across repos",
      "signal strength (market_signals.confidence + signal_type)",
      "sustainability (changed_since_last_report + trend_momentum + trend_lifecycle)",
    ],
    analytical_questions: {
      concentration:
        "Is growth concentrated in one repo (trend_health.concentration=высокая) or distributed (низкая)? Which repos?",
      convergence:
        "Do multiple independent repositories in the same cluster solve similar problems? List owner/repo names.",
      acceleration:
        "Is growth accelerating (trend_momentum=ускоряется, unexpectedly_accelerated_topics) or only high/stable?",
      category_expansion:
        "Are new topics appearing (changed_since_last_report.new_topics) or only existing leaders growing (stronger_topics)?",
      sustainability:
        "Does the signal persist (changed_since_last_report, trend_lifecycle stage, signal confidence)? Or short spike (possible_hype)?",
    },
    trend_health_concentration: trendHealth,
    trend_clustering: clustering,
    market_signals: signals,
    trend_momentum: momentum,
    trend_lifecycle: lifecycle,
    changed_since_last_report: changed,
    fastest_growing_projects: (report.fastest_growing_projects ?? []).slice(0, 8),
    insight_of_the_week_evidence:
      report.insight_of_the_week?.evidence_repositories ?? [],
    hidden_signals: (report.hidden_signals ?? []).map((h) => ({
      title: h.title,
      explanation: h.explanation,
      evidence_repositories: h.evidence_repositories ?? [],
    })),
    possible_hype: report.possible_hype ?? [],
    preferred_observation_patterns: [
      "Growth is no longer concentrated in a single repository.",
      "Multiple independent teams are building similar capabilities.",
      "The category is attracting new entrants, not only expanding existing leaders.",
      "The signal remains visible across reporting periods.",
      "The trend appears increasingly distributed.",
      "Activity is shifting from experimentation to tooling/infrastructure.",
      "GitHub activity diverges from public attention — hidden momentum.",
      "Small repositories are outperforming established leaders.",
    ],
    surprise_detection_priority: [
      "Pick unexpected observations over biggest category or most stars.",
      "Answer: What would make a reader think 'I didn't notice that?'",
    ],
    rules: [
      "Every major conclusion must cite observable evidence from this brief.",
      "Prefer evidence over speculation.",
      "Do NOT claim market overheating, new business models, industry disruption unless explicitly supported in report sections.",
    ],
  };
}
