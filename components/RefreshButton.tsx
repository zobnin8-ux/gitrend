"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RefreshResultSummary {
  reposFound: number;
  newRepos: number;
  updatedRepos: number;
  snapshotsCreated: number;
  aiSummariesGenerated: number;
  errors: string[];
}

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        result?: RefreshResultSummary;
      };

      if (!data.ok) {
        setIsError(true);
        setMessage(data.error ?? "Ошибка обновления");
        return;
      }

      const r = data.result!;
      setMessage(
        `Готово: найдено ${r.reposFound}, новых ${r.newRepos}, обновлено ${r.updatedRepos}, снапшотов ${r.snapshotsCreated}` +
          (r.aiSummariesGenerated
            ? `, AI-описаний ${r.aiSummariesGenerated}`
            : "")
      );
      router.refresh();
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? (
          <>
            <Spinner /> Обновление…
          </>
        ) : (
          "Обновить данные"
        )}
      </button>
      {message && (
        <span
          className={
            "max-w-xs text-right text-xs " +
            (isError ? "text-red-600" : "text-emerald-600")
          }
        >
          {message}
        </span>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
