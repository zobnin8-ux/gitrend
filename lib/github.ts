import {
  upsertRepository,
  insertSnapshot,
  getRepository,
  setAiSummary,
  type UpsertRepositoryInput,
} from "./sqlite";
import { generateRussianSummary, isAiEnabled } from "./ai";

const GITHUB_API = "https://api.github.com";

// Сырой ответ GitHub Search API по репозиторию (только нужные поля).
interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics?: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface SearchResponse {
  total_count: number;
  items: GitHubRepo[];
}

// Направления сбора данных согласно ТЗ ("Источники GitHub").
export interface DataSource {
  key: string;
  label: string;
  query: string;
}

function dateDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function getDataSources(): DataSource[] {
  const recent = dateDaysAgo(30);
  const week = dateDaysAgo(7);
  return [
    {
      key: "popular",
      label: "Общий поиск популярных проектов",
      query: "stars:>5000",
    },
    {
      key: "trending",
      label: "Trending",
      query: `created:>${week} stars:>50`,
    },
    { key: "ai", label: "AI", query: "AI in:name,description,topics stars:>500" },
    {
      key: "llm",
      label: "LLM",
      query: "LLM in:name,description,topics stars:>200",
    },
    {
      key: "agents",
      label: "Agents",
      query: "agents in:name,description,topics stars:>200",
    },
    {
      key: "automation",
      label: "Automation",
      query: "automation in:name,description,topics stars:>500",
    },
    {
      key: "devtools",
      label: "Developer Tools",
      query: "developer-tools in:topics stars:>500",
    },
    {
      key: "opensource",
      label: "Open Source",
      query: "open-source in:topics stars:>1000",
    },
    {
      key: "new",
      label: "New Repositories",
      query: `created:>${recent} stars:>20`,
    },
  ];
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-trends-tracker",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function sanitizeReadmeExcerpt(raw: string, maxChars: number): string {
  const text = raw
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/[#*`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, maxChars).trim();
}

/** First ~2k chars of README for AI context. Returns null if missing or fetch fails. */
export async function fetchReadmeExcerpt(
  fullName: string,
  maxChars = 2000
): Promise<string | null> {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) return null;

  const url = `${GITHUB_API}/repos/${owner}/${repo}/readme`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.raw",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "github-trends-tracker",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;

    const raw = await res.text();
    const excerpt = sanitizeReadmeExcerpt(raw, maxChars);
    return excerpt.length >= 20 ? excerpt : null;
  } catch {
    return null;
  }
}

// Поиск репозиториев по одному источнику.
async function searchRepositories(
  query: string,
  perPage: number
): Promise<GitHubRepo[]> {
  const url = new URL(`${GITHUB_API}/search/repositories`);
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(Math.min(perPage, 100)));

  const res = await fetch(url.toString(), {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GitHub API ошибка ${res.status} для запроса "${query}": ${body.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as SearchResponse;
  return data.items ?? [];
}

export interface RefreshResult {
  sourcesProcessed: number;
  reposFound: number;
  newRepos: number;
  updatedRepos: number;
  snapshotsCreated: number;
  aiSummariesGenerated: number;
  errors: string[];
  finishedAt: string;
}

// Главная процедура обновления данных (по кнопке "Обновить данные").
export async function refreshData(
  options: { perSource?: number } = {}
): Promise<RefreshResult> {
  const perSource = options.perSource ?? 30;
  const sources = getDataSources();
  const now = new Date().toISOString();

  const errors: string[] = [];
  const collected = new Map<number, GitHubRepo>();
  let sourcesProcessed = 0;

  for (const source of sources) {
    try {
      const items = await searchRepositories(source.query, perSource);
      for (const item of items) {
        if (!collected.has(item.id)) {
          collected.set(item.id, item);
        }
      }
      sourcesProcessed += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  let newRepos = 0;
  let updatedRepos = 0;
  let snapshotsCreated = 0;
  let aiSummariesGenerated = 0;

  const aiEnabled = isAiEnabled();

  for (const item of Array.from(collected.values())) {
    const existing = getRepository(item.id);

    const input: UpsertRepositoryInput = {
      github_id: item.id,
      full_name: item.full_name,
      owner: item.owner?.login ?? "",
      name: item.name,
      description: item.description,
      url: item.html_url,
      stars: item.stargazers_count,
      forks: item.forks_count,
      open_issues: item.open_issues_count,
      language: item.language,
      topics: item.topics ?? [],
      created_at: item.created_at,
      updated_at: item.updated_at,
      pushed_at: item.pushed_at,
      owner_avatar: item.owner?.avatar_url ?? null,
    };

    upsertRepository(input, now);
    insertSnapshot(
      item.id,
      item.stargazers_count,
      item.forks_count,
      item.open_issues_count,
      now
    );
    snapshotsCreated += 1;

    if (existing) {
      updatedRepos += 1;
    } else {
      newRepos += 1;
    }

    // Опциональная AI-функция: генерируем описание только для новых репозиториев
    // (или для тех, у кого его ещё нет), чтобы не тратить токены повторно.
    if (aiEnabled && (!existing || !existing.ai_summary)) {
      try {
        let readmeExcerpt: string | null = null;
        try {
          readmeExcerpt = await fetchReadmeExcerpt(item.full_name);
        } catch {
          /* optional */
        }

        const summary = await generateRussianSummary({
          full_name: item.full_name,
          description: item.description,
          language: item.language,
          topics: item.topics ?? [],
          readme_excerpt: readmeExcerpt,
        });
        if (summary) {
          setAiSummary(item.id, summary);
          aiSummariesGenerated += 1;
        }
      } catch (err) {
        errors.push(
          `AI-описание для ${item.full_name}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  return {
    sourcesProcessed,
    reposFound: collected.size,
    newRepos,
    updatedRepos,
    snapshotsCreated,
    aiSummariesGenerated,
    errors,
    finishedAt: now,
  };
}
