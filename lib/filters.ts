import type {
  RepositoryWithGrowth,
  RepositoryFilters,
  SortField,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Применяет набор фильтров к списку репозиториев.
export function applyFilters(
  repos: RepositoryWithGrowth[],
  filters: RepositoryFilters,
  favoriteIds?: Set<number>
): RepositoryWithGrowth[] {
  const now = Date.now();

  let result = repos.filter((repo) => {
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const haystack = [
        repo.full_name,
        repo.name,
        repo.description ?? "",
        repo.ai_summary ?? "",
        repo.topics.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.name) {
      const q = filters.name.toLowerCase();
      if (
        !repo.full_name.toLowerCase().includes(q) &&
        !repo.name.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    if (filters.description) {
      const q = filters.description.toLowerCase();
      const desc = (repo.description ?? "").toLowerCase();
      const aiDesc = (repo.ai_summary ?? "").toLowerCase();
      if (!desc.includes(q) && !aiDesc.includes(q)) return false;
    }

    if (filters.language) {
      if ((repo.language ?? "").toLowerCase() !== filters.language.toLowerCase()) {
        return false;
      }
    }

    if (filters.topic) {
      const q = filters.topic.toLowerCase();
      if (!repo.topics.some((t) => t.toLowerCase().includes(q))) return false;
    }

    if (typeof filters.minStars === "number" && repo.stars < filters.minStars) {
      return false;
    }
    if (typeof filters.maxStars === "number" && repo.stars > filters.maxStars) {
      return false;
    }

    if (typeof filters.maxAgeDays === "number") {
      const ageDays = (now - Date.parse(repo.created_at)) / DAY_MS;
      if (ageDays > filters.maxAgeDays) return false;
    }

    if (typeof filters.createdWithinDays === "number") {
      const ageDays = (now - Date.parse(repo.created_at)) / DAY_MS;
      if (ageDays > filters.createdWithinDays) return false;
    }

    if (typeof filters.activeWithinDays === "number") {
      const inactiveDays = (now - Date.parse(repo.pushed_at)) / DAY_MS;
      if (inactiveDays > filters.activeWithinDays) return false;
    }

    if (filters.favoritesOnly && favoriteIds) {
      if (!favoriteIds.has(repo.github_id)) return false;
    }

    return true;
  });

  result = sortRepositories(result, filters.sort ?? "stars", filters.order ?? "desc");
  return result;
}

export function sortRepositories(
  repos: RepositoryWithGrowth[],
  field: SortField,
  order: "asc" | "desc"
): RepositoryWithGrowth[] {
  const dir = order === "asc" ? 1 : -1;
  const sorted = [...repos];

  sorted.sort((a, b) => {
    let av: number | string;
    let bv: number | string;

    switch (field) {
      case "full_name":
        av = a.full_name.toLowerCase();
        bv = b.full_name.toLowerCase();
        break;
      case "created_at":
        av = Date.parse(a.created_at);
        bv = Date.parse(b.created_at);
        break;
      case "pushed_at":
        av = Date.parse(a.pushed_at);
        bv = Date.parse(b.pushed_at);
        break;
      case "forks":
        av = a.forks;
        bv = b.forks;
        break;
      case "growth_24h":
        av = a.growth_24h;
        bv = b.growth_24h;
        break;
      case "growth_7d":
        av = a.growth_7d;
        bv = b.growth_7d;
        break;
      case "growth_30d":
        av = a.growth_30d;
        bv = b.growth_30d;
        break;
      case "stars":
      default:
        av = a.stars;
        bv = b.stars;
        break;
    }

    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  return sorted;
}

// Разбор фильтров из URLSearchParams (для API и страниц).
export function parseFiltersFromParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): RepositoryFilters {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    const v = params[key];
    if (Array.isArray(v)) return v[0];
    return v ?? undefined;
  };

  const num = (key: string): number | undefined => {
    const v = get(key);
    if (v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const filters: RepositoryFilters = {
    q: get("q") || undefined,
    name: get("name") || undefined,
    description: get("description") || undefined,
    language: get("language") || undefined,
    topic: get("topic") || undefined,
    minStars: num("minStars"),
    maxStars: num("maxStars"),
    maxAgeDays: num("maxAgeDays"),
    activeWithinDays: num("activeWithinDays"),
    createdWithinDays: num("createdWithinDays"),
    favoritesOnly: get("favoritesOnly") === "true",
    sort: (get("sort") as SortField) || undefined,
    order: (get("order") as "asc" | "desc") || undefined,
  };

  return filters;
}
