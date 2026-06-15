export type RadarCategory =
  | "ai-agents"
  | "developer-tools"
  | "mcp"
  | "automation"
  | "robotics"
  | "computer-vision"
  | "voice-ai"
  | "llm"
  | "infrastructure"
  | "security"
  | "data"
  | "productivity"
  | "other";

export type RadarSignalStrength = "high" | "medium" | "low";

export interface WeeklyRadarRepo {
  name: string;
  url: string;
  stars: number;
  starsDelta: number;
}

export interface WeeklyRadarTrend {
  title: string;
  summary: string;
  whyTrending: string;
  category: RadarCategory;
  signalStrength: RadarSignalStrength;
  repos: WeeklyRadarRepo[];
}

/** Странный GitHub недели — отдельный entertainment-блок для «Радара будущего». */
export interface WeeklyRadarWeirdFind {
  title: string;
  repo: string;
  url: string;
  category: string;
  whatIsIt: string;
  whyInteresting: string;
  stars: number;
  weeklyGrowth: number;
  weirdScore: number;
  telegramTitle: string;
  telegramPost: string;
}

export interface WeeklyRadarReport {
  week: string;
  generatedAt: string;
  trends: WeeklyRadarTrend[];
  weirdFindOfTheWeek: WeeklyRadarWeirdFind | null;
}

export interface GenerateWeeklyRadarOptions {
  /** ISO timestamp override (tests). */
  now?: Date;
  /** Max trends (1–3). */
  maxTrends?: number;
}
