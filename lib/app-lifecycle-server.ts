import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HEARTBEAT_TTL_MS = 45_000;
const SHUTDOWN_GRACE_MS = 4_000;

const sessions = new Map<string, number>();
let shutdownTimer: ReturnType<typeof setTimeout> | null = null;

export function isAutoShutdownEnabled(): boolean {
  return process.env.GITREND_AUTO_SHUTDOWN === "1";
}

function cancelShutdownTimer(): void {
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }
}

function pruneStaleSessions(): void {
  const now = Date.now();
  for (const [id, lastSeen] of sessions.entries()) {
    if (now - lastSeen > HEARTBEAT_TTL_MS) {
      sessions.delete(id);
    }
  }
}

export function registerSession(sessionId: string): void {
  if (!sessionId) return;
  sessions.set(sessionId, Date.now());
  cancelShutdownTimer();
}

export function heartbeatSession(sessionId: string): void {
  if (!sessionId || !sessions.has(sessionId)) return;
  sessions.set(sessionId, Date.now());
  cancelShutdownTimer();
}

export function leaveSession(sessionId: string): void {
  if (!sessionId) return;
  sessions.delete(sessionId);
  maybeScheduleShutdown();
}

function maybeScheduleShutdown(): void {
  if (!isAutoShutdownEnabled()) return;

  pruneStaleSessions();
  if (sessions.size > 0) {
    cancelShutdownTimer();
    return;
  }

  if (shutdownTimer) return;

  shutdownTimer = setTimeout(() => {
    shutdownTimer = null;
    pruneStaleSessions();
    if (sessions.size === 0) {
      void performShutdown();
    }
  }, SHUTDOWN_GRACE_MS);
}

async function performShutdown(): Promise<void> {
  const root = process.cwd();
  const stopScript = path.join(root, "stop-app.ps1");

  if (fs.existsSync(stopScript)) {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        stopScript,
      ],
      { windowsHide: true },
      () => {
        setTimeout(() => process.exit(0), 800);
      }
    );
    return;
  }

  setTimeout(() => process.exit(0), 500);
}

export function lifecycleStatus(): {
  autoShutdown: boolean;
  activeSessions: number;
} {
  pruneStaleSessions();
  return {
    autoShutdown: isAutoShutdownEnabled(),
    activeSessions: sessions.size,
  };
}
