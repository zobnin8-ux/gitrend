"use client";

import { useState } from "react";

interface Props {
  githubId: number;
  initialFavorite: boolean;
  onToggle?: (isFavorite: boolean) => void;
  withLabel?: boolean;
}

export function FavoriteButton({
  githubId,
  initialFavorite,
  onToggle,
  withLabel = false,
}: Props) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_id: githubId }),
      });
      const data = (await res.json()) as { ok: boolean; is_favorite?: boolean };
      if (data.ok && typeof data.is_favorite === "boolean") {
        setIsFavorite(data.is_favorite);
        onToggle?.(data.is_favorite);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
      className={
        "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm transition-colors " +
        (isFavorite
          ? "text-amber-500 hover:text-amber-600"
          : "text-slate-300 hover:text-amber-400")
      }
    >
      <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
      {withLabel && (
        <span className="text-xs text-slate-600">
          {isFavorite ? "В избранном" : "В избранное"}
        </span>
      )}
    </button>
  );
}
