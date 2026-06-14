import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { WeeklyRadarReport } from "./types";
import { weeklyRadarReportPath } from "./generateWeeklyRadar";

export interface CommitWeeklyRadarOptions {
  projectRoot?: string;
  report?: WeeklyRadarReport;
  push?: boolean;
}

export interface CommitWeeklyRadarResult {
  committed: boolean;
  pushed: boolean;
  filePath: string;
  message: string;
}

function runGit(cwd: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    const detail = e.stderr?.trim() || e.message || "git command failed";
    throw new Error(detail);
  }
}

/**
 * Коммитит reports/weekly-radar.json, если содержимое изменилось.
 */
export function commitWeeklyRadarReport(
  options: CommitWeeklyRadarOptions = {}
): CommitWeeklyRadarResult {
  const root = options.projectRoot ?? process.cwd();
  const filePath = weeklyRadarReportPath(root);
  const relPath = path.relative(root, filePath).replace(/\\/g, "/");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Report file not found: ${filePath}`);
  }

  if (!fs.existsSync(path.join(root, ".git"))) {
    throw new Error("Not a git repository — cannot commit weekly radar report.");
  }

  runGit(root, ["add", relPath]);

  const status = runGit(root, ["status", "--porcelain", "--", relPath]);
  if (!status) {
    return {
      committed: false,
      pushed: false,
      filePath,
      message: "Файл не изменился — новый commit не нужен.",
    };
  }

  const week =
    options.report?.week ??
    JSON.parse(fs.readFileSync(filePath, "utf8")).week ??
    "unknown";

  runGit(root, ["commit", "-m", `chore(radar): weekly report ${week}`]);

  let pushed = false;
  if (options.push) {
    runGit(root, ["push", "origin", "HEAD"]);
    pushed = true;
  }

  return {
    committed: true,
    pushed,
    filePath,
    message: pushed
      ? `Опубликовано на GitHub (неделя ${week}).`
      : `Commit создан (неделя ${week}).`,
  };
}
