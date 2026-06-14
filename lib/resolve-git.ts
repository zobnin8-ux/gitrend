import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

let cachedGit: string | undefined;

const WINDOWS_GIT_CANDIDATES = (): string[] => {
  const roots = [
    process.env["ProgramFiles"],
    process.env["ProgramFiles(x86)"],
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Programs")
      : null,
  ].filter(Boolean) as string[];

  const suffixes = [
    path.join("Git", "cmd", "git.exe"),
    path.join("Git", "bin", "git.exe"),
  ];

  const paths: string[] = [];
  for (const root of roots) {
    for (const suffix of suffixes) {
      paths.push(path.join(root, suffix));
    }
  }
  return paths;
};

/**
 * Resolves git executable when Node was started without Git on PATH
 * (common on Windows when launching via .bat / double-click).
 */
export function resolveGitExecutable(): string {
  if (cachedGit && fs.existsSync(cachedGit)) {
    return cachedGit;
  }

  const fromEnv = process.env.GIT_EXECUTABLE?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    cachedGit = fromEnv;
    return cachedGit;
  }

  if (process.platform === "win32") {
    try {
      const out = execFileSync("where.exe", ["git"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      const first = out.split(/\r?\n/).find((line) => line.trim());
      if (first && fs.existsSync(first.trim())) {
        cachedGit = first.trim();
        return cachedGit;
      }
    } catch {
      // where.exe may fail if git is not on PATH
    }

    for (const candidate of WINDOWS_GIT_CANDIDATES()) {
      if (fs.existsSync(candidate)) {
        cachedGit = candidate;
        return cachedGit;
      }
    }
  } else {
    try {
      const out = execFileSync("which", ["git"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (out && fs.existsSync(out)) {
        cachedGit = out;
        return cachedGit;
      }
    } catch {
      // fall through
    }
  }

  throw new Error(
    "Git не найден. Установите Git for Windows или добавьте GIT_EXECUTABLE в .env.local (например C:\\Program Files\\Git\\cmd\\git.exe)."
  );
}

export function gitEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...(process.env.GIT_SSL_NO_VERIFY
      ? { GIT_SSL_NO_VERIFY: process.env.GIT_SSL_NO_VERIFY }
      : {}),
  };
}
