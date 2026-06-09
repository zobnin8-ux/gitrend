import type { RepositoryWithGrowth } from "@/lib/types";
import type { RadarCategory } from "./types";

export interface CategoryRule {
  category: RadarCategory;
  patterns: string[];
}

/** Правила категоризации (GitHub-only, без анализа «будущего»). */
export const RADAR_CATEGORY_RULES: CategoryRule[] = [
  {
    category: "ai-agents",
    patterns: ["agent", "agents", "agentic", "autogpt", "crewai", "swarm"],
  },
  { category: "mcp", patterns: ["mcp", "model-context-protocol"] },
  {
    category: "llm",
    patterns: ["llm", "langchain", "llama", "transformer", "gpt", "chatbot"],
  },
  {
    category: "voice-ai",
    patterns: ["voice", "speech", "whisper", "tts", "audio ai", "transcri"],
  },
  {
    category: "computer-vision",
    patterns: ["vision", "opencv", "yolo", "detection", "segmentation", "diffusion"],
  },
  {
    category: "robotics",
    patterns: ["robot", "robotics", "ros2", "ros ", "manipulator", "drone"],
  },
  {
    category: "automation",
    patterns: ["automation", "workflow", "n8n", "zapier", "orchestr"],
  },
  {
    category: "developer-tools",
    patterns: ["devtools", "developer-tools", "devtool", "ide", "linter", "cli tool"],
  },
  {
    category: "infrastructure",
    patterns: ["kubernetes", "k8s", "terraform", "docker", "devops", "cloud-native"],
  },
  { category: "security", patterns: ["security", "cve", "pentest", "vuln", "sast"] },
  {
    category: "data",
    patterns: ["database", "postgres", "analytics", "etl", "data pipeline", "spark"],
  },
  {
    category: "productivity",
    patterns: ["productivity", "note-taking", "obsidian", "task", "calendar"],
  },
];

function repoHaystack(repo: RepositoryWithGrowth): string {
  return [
    repo.full_name,
    repo.name,
    repo.description ?? "",
    repo.ai_summary ?? "",
    repo.language ?? "",
    repo.topics.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

export function detectPrimaryCategory(
  repo: RepositoryWithGrowth
): RadarCategory {
  const hay = repoHaystack(repo);
  for (const rule of RADAR_CATEGORY_RULES) {
    if (rule.patterns.some((p) => hay.includes(p))) {
      return rule.category;
    }
  }
  return "other";
}

export function categoryLabelRu(category: RadarCategory): string {
  const labels: Record<RadarCategory, string> = {
    "ai-agents": "AI-агенты",
    "developer-tools": "инструменты разработки",
    mcp: "Model Context Protocol (MCP)",
    automation: "автоматизация",
    robotics: "робототехника",
    "computer-vision": "компьютерное зрение",
    "voice-ai": "голосовой AI",
    llm: "LLM и языковые модели",
    infrastructure: "инфраструктура",
    security: "безопасность",
    data: "данные и аналитика",
    productivity: "продуктивность",
    other: "разработка ПО",
  };
  return labels[category];
}
