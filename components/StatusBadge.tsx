import type { VisualBadge } from "@/lib/insights-visual";

export function StatusBadge({ visual }: { visual: VisualBadge }) {
  return (
    <span
      className={
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium " +
        visual.className
      }
    >
      <span aria-hidden="true">{visual.icon}</span>
      {visual.label}
    </span>
  );
}
