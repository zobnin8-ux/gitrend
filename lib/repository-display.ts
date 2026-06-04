import type { Repository } from "./types";

type DescFields = Pick<Repository, "ai_summary" | "description">;

/** Русское AI-описание; если его нет — оригинал с GitHub. */
export function getRepositoryDescriptionRu(repo: DescFields): string | null {
  const ru = repo.ai_summary?.trim();
  if (ru) return ru;
  return repo.description?.trim() || null;
}

/** Полный текст для tooltip (русский + оригинал, если отличается). */
export function getRepositoryDescriptionTooltip(repo: DescFields): string | null {
  const ru = repo.ai_summary?.trim();
  const original = repo.description?.trim();
  const display = getRepositoryDescriptionRu(repo);
  if (!display) return null;
  if (ru && original && original !== ru) {
    return `${ru}\n\nОригинал (GitHub): ${original}`;
  }
  return display;
}

export function hasRussianAiSummary(repo: DescFields): boolean {
  return Boolean(repo.ai_summary?.trim());
}
