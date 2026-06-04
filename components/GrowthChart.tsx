"use client";

import { useMemo, useState } from "react";
import type { ChartRange } from "@/lib/types";
import { formatCompact, formatDate, formatNumber } from "@/lib/format";

export interface ChartPoint {
  checked_at: string;
  value: number;
}

interface Props {
  title: string;
  points: ChartPoint[];
  color?: string;
  unit?: string;
}

const RANGES: { key: ChartRange; label: string; days: number | null }[] = [
  { key: "7d", label: "7 дней", days: 7 },
  { key: "30d", label: "30 дней", days: 30 },
  { key: "90d", label: "90 дней", days: 90 },
  { key: "all", label: "Всё время", days: null },
];

const WIDTH = 720;
const HEIGHT = 240;
const PADDING = { top: 16, right: 16, bottom: 28, left: 48 };

export function GrowthChart({
  title,
  points,
  color = "#205aeb",
  unit = "",
}: Props) {
  const [range, setRange] = useState<ChartRange>("30d");

  const filtered = useMemo(() => {
    const sorted = [...points].sort(
      (a, b) => Date.parse(a.checked_at) - Date.parse(b.checked_at)
    );
    const cfg = RANGES.find((r) => r.key === range);
    if (!cfg || cfg.days === null) return sorted;
    const cutoff = Date.now() - cfg.days * 24 * 60 * 60 * 1000;
    const inRange = sorted.filter((p) => Date.parse(p.checked_at) >= cutoff);
    return inRange.length >= 2 ? inRange : sorted;
  }, [points, range]);

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={
                "rounded-md px-2 py-1 text-xs font-medium transition-colors " +
                (range === r.key
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-100")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <Chart points={filtered} color={color} unit={unit} />
    </div>
  );
}

function Chart({
  points,
  color,
  unit,
}: {
  points: ChartPoint[];
  color: string;
  unit: string;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        Недостаточно данных для графика. Обновите данные несколько раз, чтобы
        накопить историю.
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const times = points.map((p) => Date.parse(p.checked_at));

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);

  const spanV = maxV - minV || 1;
  const spanT = maxT - minT || 1;

  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const x = (t: number) => PADDING.left + ((t - minT) / spanT) * innerW;
  const y = (v: number) =>
    PADDING.top + innerH - ((v - minV) / spanV) * innerH;

  // Если точка одна — рисуем горизонтальную опорную линию.
  const path =
    points.length === 1
      ? `M ${PADDING.left} ${y(values[0])} L ${PADDING.left + innerW} ${y(values[0])}`
      : points
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"} ${x(Date.parse(p.checked_at)).toFixed(1)} ${y(
                p.value
              ).toFixed(1)}`
          )
          .join(" ");

  const areaPath =
    points.length > 1
      ? `${path} L ${x(maxT).toFixed(1)} ${(PADDING.top + innerH).toFixed(
          1
        )} L ${x(minT).toFixed(1)} ${(PADDING.top + innerH).toFixed(1)} Z`
      : "";

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = minV + (spanV * i) / ticks;
    return { v, y: y(v) };
  });

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="График изменения значения во времени"
    >
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={t.y}
            y2={t.y}
            stroke="#eef2f7"
            strokeWidth={1}
          />
          <text
            x={PADDING.left - 8}
            y={t.y + 3}
            textAnchor="end"
            className="fill-slate-400"
            fontSize={10}
          >
            {formatCompact(Math.round(t.v))}
          </text>
        </g>
      ))}

      {areaPath && <path d={areaPath} fill={color} fillOpacity={0.08} />}
      <path d={path} fill="none" stroke={color} strokeWidth={2} />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(Date.parse(p.checked_at))}
          cy={y(p.value)}
          r={points.length > 30 ? 1.5 : 3}
          fill={color}
        >
          <title>
            {formatDate(p.checked_at)}: {formatNumber(p.value)} {unit}
          </title>
        </circle>
      ))}

      <text
        x={PADDING.left}
        y={HEIGHT - 8}
        className="fill-slate-400"
        fontSize={10}
      >
        {formatDate(new Date(minT).toISOString())}
      </text>
      <text
        x={WIDTH - PADDING.right}
        y={HEIGHT - 8}
        textAnchor="end"
        className="fill-slate-400"
        fontSize={10}
      >
        {formatDate(new Date(maxT).toISOString())}
      </text>
    </svg>
  );
}
