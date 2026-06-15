// Общие типы данных приложения.

export interface Repository {
  github_id: number;
  full_name: string;
  owner: string;
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  open_issues: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  owner_avatar: string | null;
  ai_summary: string | null;
  first_seen_at: string;
  last_checked_at: string;
}

// Репозиторий с рассчитанными показателями роста.
export interface RepositoryWithGrowth extends Repository {
  growth_24h: number;
  growth_7d: number;
  growth_30d: number;
  growth_24h_percent: number;
  growth_7d_percent: number;
  growth_30d_percent: number;
  avg_per_day_7d: number;
  avg_per_day_30d: number;
}

export interface Snapshot {
  id: number;
  github_id: number;
  stars: number;
  forks: number;
  open_issues: number;
  checked_at: string;
}

export interface DashboardStats {
  total: number;
  newThisWeek: number;
  newThisMonth: number;
  fastestGrowing: RepositoryWithGrowth | null;
  mostPopular: Repository | null;
  topLanguage: { language: string; count: number } | null;
}

export type GrowthPeriod = "24h" | "7d" | "30d";
export type ChartRange = "7d" | "30d" | "90d" | "all";

export type InsightPeriod = "daily" | "weekly" | "monthly";

// Структурированный AI-отчёт по GitHub-трендам (раздел /insights).
export type MarketTemperature = "холодный" | "умеренный" | "горячий";
export type AttentionLevel = "высокий" | "средний" | "низкий";
export type HypeProbability = "низкая" | "средняя" | "высокая";
export type FutureTrendProbability = "низкая" | "средняя" | "высокая";
export type TrendConcentration = "низкая" | "средняя" | "высокая";
export type MarketSignalType =
  | "emerging"
  | "accelerating"
  | "structural_shift"
  | "standardization"
  | "saturation"
  | "declining";

export interface TrendInsights {
  generated_at: string;
  market_temperature: MarketTemperature;
  executive_summary: string;
  market_signals: {
    signal_type: MarketSignalType;
    title: string;
    explanation: string;
    confidence: "низкая" | "средняя" | "высокая";
    evidence_repositories: string[];
    trend_leader: {
      full_name: string;
      reason: string;
    };
  }[];
  trend_health: {
    trend: string;
    density: number;
    concentration: TrendConcentration;
    health_score: number;
    explanation: string;
  }[];
  hidden_signals: {
    title: string;
    explanation: string;
    evidence_repositories: string[];
  }[];
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
  fastest_growing_projects: {
    full_name: string;
    reason: string;
    why_it_matters: string;
  }[];
  emerging_signals: {
    signal: string;
    explanation: string;
    examples: string[];
  }[];
  possible_hype: {
    topic: string;
    reason: string;
    hype_probability: HypeProbability;
  }[];
  projects_to_watch: {
    full_name: string;
    why_watch: string;
    attention_level: AttentionLevel;
  }[];
  content_recommendations: {
    linkedin_posts: {
      title: string;
      angle: string;
      key_points: string[];
      why_now: string;
    }[];
    instagram_carousels: {
      title: string;
      slides: string[];
      why_now: string;
    }[];
    reels_ideas: {
      hook: string;
      idea: string;
      talking_points: string[];
    }[];
    telegram_posts: {
      title: string;
      text: string;
      why_now: string;
    }[];
    weekly_report: {
      title: string;
      content: string;
    };
  };
  trend_momentum: {
    topic: string;
    status:
      | "ускоряется"
      | "стабильно растёт"
      | "замедляется"
      | "только появляется"
      | "недостаточно данных";
    explanation: string;
    evidence_repositories: string[];
  }[];
  trend_lifecycle: {
    topic: string;
    stage: "emerging" | "growing" | "mature" | "cooling" | "unclear";
    stage_ru:
      | "Зарождается"
      | "Растёт"
      | "Зрелый тренд"
      | "Остывает"
      | "Недостаточно данных";
    explanation: string;
    evidence_repositories: string[];
  }[];
  changed_since_last_report: {
    summary: string;
    new_topics: string[];
    stronger_topics: string[];
    weaker_topics: string[];
    disappeared_topics: string[];
    unexpectedly_accelerated_topics: string[];
  };
  controversial_takes: {
    take: string;
    explanation: string;
    evidence_repositories: string[];
    content_angle: string;
  }[];
  linkedinPost: LinkedInPost;
}

export interface LinkedInPost {
  english: string;
  russian: string;
  sourceCategory: string;
  analyzedRepositories: number;
}

export interface RepositoryFilters {
  q?: string; // глобальный поиск: название + описание + темы
  name?: string;
  description?: string;
  language?: string;
  topic?: string;
  minStars?: number;
  maxStars?: number;
  maxAgeDays?: number; // возраст проекта (created_at не старше N дней)
  activeWithinDays?: number; // активность (pushed_at в пределах N дней)
  sort?: SortField;
  order?: "asc" | "desc";
  favoritesOnly?: boolean;
  createdWithinDays?: number; // для раздела "Новые проекты"
}

export type SortField =
  | "stars"
  | "forks"
  | "growth_24h"
  | "growth_7d"
  | "growth_30d"
  | "created_at"
  | "pushed_at"
  | "full_name";

// Зрелость исторических данных для раздела /insights.
export type DataMaturityLevel =
  | "Очень низкая"
  | "Низкая"
  | "Средняя"
  | "Высокая"
  | "Очень высокая";

export interface DataMaturity {
  level: DataMaturityLevel;
  history_days: number;
  snapshots_count: number;
  repositories_with_history: number;
  last_snapshot_at: string | null;
  explanation: string;
}
