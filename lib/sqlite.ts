import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { InsightPeriod, Repository, Snapshot, TrendInsights } from "./types";

// Путь к локальной базе данных согласно структуре проекта: /data/github-trends.db
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "github-trends.db");

let _db: Database.Database | null = null;

// Singleton-подключение к базе данных SQLite.
export function getDb(): Database.Database {
  if (_db) return _db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  _db = db;
  return db;
}

// Создание таблиц при первом запуске.
function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS repositories (
      github_id     INTEGER PRIMARY KEY,
      full_name     TEXT NOT NULL,
      owner         TEXT NOT NULL,
      name          TEXT NOT NULL,
      description   TEXT,
      url           TEXT NOT NULL,
      stars         INTEGER NOT NULL DEFAULT 0,
      forks         INTEGER NOT NULL DEFAULT 0,
      open_issues   INTEGER NOT NULL DEFAULT 0,
      language      TEXT,
      topics        TEXT NOT NULL DEFAULT '[]',
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      pushed_at     TEXT NOT NULL,
      owner_avatar  TEXT,
      ai_summary    TEXT,
      first_seen_at TEXT NOT NULL,
      last_checked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      github_id   INTEGER NOT NULL,
      stars       INTEGER NOT NULL,
      forks       INTEGER NOT NULL,
      open_issues INTEGER NOT NULL,
      checked_at  TEXT NOT NULL,
      FOREIGN KEY (github_id) REFERENCES repositories(github_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      github_id  INTEGER PRIMARY KEY,
      created_at TEXT NOT NULL,
      FOREIGN KEY (github_id) REFERENCES repositories(github_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_trend_reports (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      period       TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      report_json  TEXT NOT NULL,
      created_at   TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_repo_time
      ON snapshots (github_id, checked_at);
    CREATE INDEX IF NOT EXISTS idx_repositories_stars
      ON repositories (stars);
    CREATE INDEX IF NOT EXISTS idx_repositories_language
      ON repositories (language);
    CREATE INDEX IF NOT EXISTS idx_trend_reports_lookup
      ON ai_trend_reports (period, payload_hash, created_at);
  `);
}

// --- Преобразование строк БД в объекты приложения ---

interface RepoRow {
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
  topics: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  owner_avatar: string | null;
  ai_summary: string | null;
  first_seen_at: string;
  last_checked_at: string;
}

function rowToRepository(row: RepoRow): Repository {
  return {
    ...row,
    topics: safeParseTopics(row.topics),
  };
}

function safeParseTopics(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// --- Запись данных репозитория (upsert) ---

export interface UpsertRepositoryInput {
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
}

export function upsertRepository(input: UpsertRepositoryInput, now: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO repositories (
      github_id, full_name, owner, name, description, url, stars, forks,
      open_issues, language, topics, created_at, updated_at, pushed_at,
      owner_avatar, first_seen_at, last_checked_at
    ) VALUES (
      @github_id, @full_name, @owner, @name, @description, @url, @stars, @forks,
      @open_issues, @language, @topics, @created_at, @updated_at, @pushed_at,
      @owner_avatar, @now, @now
    )
    ON CONFLICT(github_id) DO UPDATE SET
      full_name = excluded.full_name,
      owner = excluded.owner,
      name = excluded.name,
      description = excluded.description,
      url = excluded.url,
      stars = excluded.stars,
      forks = excluded.forks,
      open_issues = excluded.open_issues,
      language = excluded.language,
      topics = excluded.topics,
      updated_at = excluded.updated_at,
      pushed_at = excluded.pushed_at,
      owner_avatar = excluded.owner_avatar,
      last_checked_at = excluded.last_checked_at
  `);

  stmt.run({
    ...input,
    topics: JSON.stringify(input.topics),
    now,
  });
}

export function insertSnapshot(
  github_id: number,
  stars: number,
  forks: number,
  open_issues: number,
  checked_at: string
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO snapshots (github_id, stars, forks, open_issues, checked_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(github_id, stars, forks, open_issues, checked_at);
}

export function setAiSummary(github_id: number, summary: string): void {
  const db = getDb();
  db.prepare(`UPDATE repositories SET ai_summary = ? WHERE github_id = ?`).run(
    summary,
    github_id
  );
}

// --- Чтение данных ---

export function getAllRepositories(): Repository[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM repositories`).all() as RepoRow[];
  return rows.map(rowToRepository);
}

export function getRepository(github_id: number): Repository | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM repositories WHERE github_id = ?`)
    .get(github_id) as RepoRow | undefined;
  return row ? rowToRepository(row) : null;
}

export function getSnapshots(github_id: number): Snapshot[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM snapshots WHERE github_id = ? ORDER BY checked_at ASC`
    )
    .all(github_id) as Snapshot[];
}

export function getAllSnapshots(): Snapshot[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM snapshots ORDER BY github_id ASC, checked_at ASC`)
    .all() as Snapshot[];
}

export function countRepositories(): number {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) AS c FROM repositories`).get() as {
    c: number;
  };
  return row.c;
}

export function countCreatedSince(isoDate: string): number {
  const db = getDb();
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM repositories WHERE created_at >= ?`)
    .get(isoDate) as { c: number };
  return row.c;
}

export function getTopLanguage(): { language: string; count: number } | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT language, COUNT(*) AS count
       FROM repositories
       WHERE language IS NOT NULL AND language <> ''
       GROUP BY language
       ORDER BY count DESC
       LIMIT 1`
    )
    .get() as { language: string; count: number } | undefined;
  return row ?? null;
}

export function getDistinctLanguages(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT language FROM repositories
       WHERE language IS NOT NULL AND language <> ''
       ORDER BY language ASC`
    )
    .all() as { language: string }[];
  return rows.map((r) => r.language);
}

// --- Избранное ---

export function getFavoriteIds(): Set<number> {
  const db = getDb();
  const rows = db.prepare(`SELECT github_id FROM favorites`).all() as {
    github_id: number;
  }[];
  return new Set(rows.map((r) => r.github_id));
}

export function isFavorite(github_id: number): boolean {
  const db = getDb();
  const row = db
    .prepare(`SELECT 1 AS x FROM favorites WHERE github_id = ?`)
    .get(github_id);
  return Boolean(row);
}

export function addFavorite(github_id: number, now: string): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO favorites (github_id, created_at) VALUES (?, ?)`
  ).run(github_id, now);
}

export function removeFavorite(github_id: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM favorites WHERE github_id = ?`).run(github_id);
}

export function toggleFavorite(github_id: number, now: string): boolean {
  if (isFavorite(github_id)) {
    removeFavorite(github_id);
    return false;
  }
  addFavorite(github_id, now);
  return true;
}

export function getLastCheckedAt(): string | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT MAX(last_checked_at) AS t FROM repositories`)
    .get() as { t: string | null };
  return row.t ?? null;
}

// --- Кэш AI-отчётов по трендам ---

// Возвращает report_json, если есть свежий (за последние withinHours часов)
// отчёт с тем же периодом и хэшем входных данных.
export function getRecentTrendReport(
  period: string,
  payloadHash: string,
  withinHours = 24
): string | null {
  const db = getDb();
  const cutoff = new Date(
    Date.now() - withinHours * 60 * 60 * 1000
  ).toISOString();
  const row = db
    .prepare(
      `SELECT report_json FROM ai_trend_reports
       WHERE period = ? AND payload_hash = ? AND created_at >= ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(period, payloadHash, cutoff) as { report_json: string } | undefined;
  return row ? row.report_json : null;
}

export function saveTrendReport(
  period: string,
  payloadHash: string,
  reportJson: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO ai_trend_reports (period, payload_hash, report_json, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(period, payloadHash, reportJson, new Date().toISOString());
}

// Последний отчёт за тот же period с другим payload_hash (для сравнения «что изменилось»).
export function getPreviousTrendReport(
  period: InsightPeriod,
  currentPayloadHash: string
): TrendInsights | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT report_json FROM ai_trend_reports
       WHERE period = ? AND payload_hash != ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(period, currentPayloadHash) as { report_json: string } | undefined;

  if (!row) return null;

  try {
    return JSON.parse(row.report_json) as TrendInsights;
  } catch {
    return null;
  }
}
