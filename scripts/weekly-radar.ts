#!/usr/bin/env node
/**
 * CLI: генерация reports/weekly-radar.json для проекта «Радар будущего».
 *
 * Usage:
 *   npm run radar:weekly
 *   npm run radar:weekly -- --commit
 *   npm run radar:weekly -- --commit --push
 *   npm run radar:weekly -- --refresh
 */

import { refreshData } from "@/lib/github";
import {
  commitWeeklyRadarReport,
  type CommitWeeklyRadarOptions,
} from "@/src/radar/commitReport";
import { generateAndWriteWeeklyRadar } from "@/src/radar/generateWeeklyRadar";

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const doCommit = args.has("--commit");
  const doPush = args.has("--push");
  const doRefresh = args.has("--refresh");

  if (doRefresh) {
    if (!process.env.GITHUB_TOKEN) {
      console.error("GITHUB_TOKEN required for --refresh");
      process.exit(1);
    }
    console.log("Refreshing GitHub data...");
    const result = await refreshData();
    console.log(
      `Refresh done: ${result.updatedRepos} repos, ${result.snapshotsCreated} snapshots.`
    );
  }

  const { report, filePath } = generateAndWriteWeeklyRadar();

  console.log(`Week: ${report.week}`);
  console.log(`Trends: ${report.trends.length}`);
  console.log(`Written: ${filePath}`);

  if (report.trends.length === 0) {
    console.log("No qualifying trends this week (empty array is OK).");
  } else {
    for (const t of report.trends) {
      console.log(`- [${t.signalStrength}] ${t.title} (${t.repos.length} repos)`);
    }
  }

  if (doCommit) {
    const commitOpts: CommitWeeklyRadarOptions = {
      report,
      push: doPush,
    };
    const { committed } = commitWeeklyRadarReport(commitOpts);
    if (committed && doPush) {
      console.log("Pushed to origin.");
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
