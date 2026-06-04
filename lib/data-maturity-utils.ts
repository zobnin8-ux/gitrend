import type { DataMaturityLevel } from "./types";

export const LEVEL_EXPLANATIONS: Record<DataMaturityLevel, string> = {
  "Очень низкая":
    "Данные только начинают накапливаться. Большинство выводов предварительные.",
  Низкая:
    "Появляются первые закономерности. Тренды ещё не подтверждены.",
  Средняя:
    "Можно анализировать динамику, но для долгосрочных выводов данных ещё недостаточно.",
  Высокая:
    "Истории достаточно для выявления устойчивых трендов.",
  "Очень высокая":
    "Накоплено достаточно данных для уверенного анализа изменений рынка.",
};

export function resolveDataMaturityLevel(
  historyDays: number,
  snapshotsCount: number
): DataMaturityLevel {
  if (historyDays < 3 || snapshotsCount < 3) {
    return "Очень низкая";
  }
  if (historyDays <= 7) {
    return "Низкая";
  }
  if (historyDays <= 14) {
    return "Средняя";
  }
  if (historyDays <= 30) {
    return "Высокая";
  }
  return "Очень высокая";
}

export function isLowDataMaturity(level: DataMaturityLevel): boolean {
  return level === "Очень низкая" || level === "Низкая";
}
