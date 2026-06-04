import { getDb } from "./sqlite";
import type { DataMaturity } from "./types";
import {
  LEVEL_EXPLANATIONS,
  resolveDataMaturityLevel,
} from "./data-maturity-utils";

export { isLowDataMaturity } from "./data-maturity-utils";

export function getDataMaturity(): DataMaturity {
  const db = getDb();

  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS snapshots_count,
         MIN(checked_at) AS min_checked_at,
         MAX(checked_at) AS max_checked_at
       FROM snapshots`
    )
    .get() as {
    snapshots_count: number;
    min_checked_at: string | null;
    max_checked_at: string | null;
  };

  const reposRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM (
         SELECT github_id FROM snapshots GROUP BY github_id HAVING COUNT(*) > 1
       )`
    )
    .get() as { cnt: number };

  const snapshotsCount = row.snapshots_count ?? 0;
  const repositoriesWithHistory = reposRow.cnt ?? 0;
  const lastSnapshotAt = row.max_checked_at ?? null;

  let historyDays = 0;
  if (
    row.min_checked_at &&
    row.max_checked_at &&
    snapshotsCount > 0
  ) {
    const minMs = new Date(row.min_checked_at).getTime();
    const maxMs = new Date(row.max_checked_at).getTime();
    if (!Number.isNaN(minMs) && !Number.isNaN(maxMs)) {
      historyDays = Math.max(
        0,
        Math.floor((maxMs - minMs) / (24 * 60 * 60 * 1000))
      );
    }
  }

  const level = resolveDataMaturityLevel(historyDays, snapshotsCount);

  return {
    level,
    history_days: historyDays,
    snapshots_count: snapshotsCount,
    repositories_with_history: repositoriesWithHistory,
    last_snapshot_at: lastSnapshotAt,
    explanation: LEVEL_EXPLANATIONS[level],
  };
}
