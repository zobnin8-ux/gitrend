import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { WeeklyRadarReport } from "./types";
import { weeklyRadarReportPath } from "./generateWeeklyRadar";

export interface CommitWeeklyRadarOptions {
  projectRoot?: string;
  report?: WeeklyRadarReport;
  push?: boolean;
}

function runGit(cwd: string, args: string): void {
  execSync(`git ${args}`, { cwd, stdio: "inherit", encoding: "utf8" });
}

function gitOutput(cwd: string, args: string): string {
  return execSync(`git ${args}`, { cwd, encoding: "utf8" }).trim();
}

/**
 * Коммитит reports/weekly-radar.json, если содержимое изменилось.
 */
export function commitWeeklyRadarReport(
  options: CommitWeeklyRadarOptions = {}
): { committed: boolean; filePath: string } {
  const root = options.projectRoot ?? process.cwd();
  const filePath = weeklyRadarReportPath(root);
  const relPath = path.relative(root, filePath).replace(/\\/g, "/");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Report file not found: ${filePath}`);
  }

  if (!fs.existsSync(path.join(root, ".git"))) {
    throw new Error("Not a git repository — cannot commit weekly radar report.");
  }

  runGit(root, `add "${relPath}"`);

  const status = gitOutput(root, `status --porcelain -- "${relPath}"`);
  if (!status) {
    console.log("weekly-radar.json unchanged — skip commit.");
    return { committed: false, filePath };
  }

  const week =
    options.report?.week ??
    JSON.parse(fs.readFileSync(filePath, "utf8")).week ??
    "unknown";

  runGit(
    root,
    `commit -m "chore(radar): weekly report ${week}"`
  );

  if (options.push) {
    runGit(root, "push origin HEAD");
  }

  return { committed: true, filePath };
}
