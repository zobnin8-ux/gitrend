// Визуальные конфигурации для раздела /insights (мягкие профессиональные оттенки).

export type VisualBadge = {
  icon: string;
  label: string;
  className: string;
};

export const CONFIDENCE_VISUAL: Record<string, VisualBadge> = {
  высокая: {
    icon: "🟢",
    label: "Высокая уверенность",
    className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
  средняя: {
    icon: "🟡",
    label: "Средняя уверенность",
    className: "bg-amber-50 text-amber-800 border border-amber-200",
  },
  низкая: {
    icon: "🔴",
    label: "Низкая уверенность",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
};

export const MOMENTUM_VISUAL: Record<string, VisualBadge> = {
  ускоряется: {
    icon: "🚀",
    label: "Ускоряется",
    className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
  "стабильно растёт": {
    icon: "📈",
    label: "Стабильно растёт",
    className: "bg-brand-50 text-brand-800 border border-brand-200",
  },
  замедляется: {
    icon: "⚠️",
    label: "Замедляется",
    className: "bg-orange-50 text-orange-800 border border-orange-200",
  },
  "только появляется": {
    icon: "🌱",
    label: "Только появляется",
    className: "bg-violet-50 text-violet-800 border border-violet-200",
  },
  "недостаточно данных": {
    icon: "❔",
    label: "Недостаточно данных",
    className: "bg-slate-50 text-slate-600 border border-slate-200",
  },
};

export const LIFECYCLE_VISUAL: Record<
  string,
  VisualBadge & { cardBorder?: string }
> = {
  Зарождается: {
    icon: "🌱",
    label: "Зарождается",
    className: "bg-violet-50 text-violet-800 border border-violet-200",
    cardBorder: "border-violet-200",
  },
  Растёт: {
    icon: "🚀",
    label: "Растёт",
    className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    cardBorder: "border-emerald-200",
  },
  "Зрелый тренд": {
    icon: "🏆",
    label: "Зрелый тренд",
    className: "bg-brand-50 text-brand-800 border border-brand-200",
    cardBorder: "border-brand-200",
  },
  Остывает: {
    icon: "🧊",
    label: "Остывает",
    className: "bg-orange-50 text-orange-800 border border-orange-200",
    cardBorder: "border-orange-200",
  },
  "Недостаточно данных": {
    icon: "❔",
    label: "Недостаточно данных",
    className: "bg-slate-50 text-slate-600 border border-slate-200",
    cardBorder: "border-slate-200",
  },
};

export const MARKET_TEMP_VISUAL: Record<string, VisualBadge> = {
  холодный: {
    icon: "🧊",
    label: "Рынок спокойный",
    className: "bg-slate-50 text-slate-700 border border-slate-200",
  },
  умеренный: {
    icon: "📊",
    label: "Умеренная активность",
    className: "bg-brand-50 text-brand-800 border border-brand-200",
  },
  горячий: {
    icon: "🔥",
    label: "Высокая активность",
    className: "bg-orange-50 text-orange-800 border border-orange-200",
  },
};

export const ATTENTION_VISUAL: Record<string, VisualBadge> = {
  высокий: {
    icon: "👀",
    label: "Высокое внимание",
    className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
  средний: {
    icon: "👁",
    label: "Среднее внимание",
    className: "bg-brand-50 text-brand-800 border border-brand-200",
  },
  низкий: {
    icon: "📌",
    label: "На заметку",
    className: "bg-slate-50 text-slate-600 border border-slate-200",
  },
};

export const HYPE_PROB_VISUAL: Record<string, VisualBadge> = {
  низкая: {
    icon: "🟢",
    label: "Низкая вероятность хайпа",
    className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
  средняя: {
    icon: "🟡",
    label: "Средняя вероятность",
    className: "bg-amber-50 text-amber-800 border border-amber-200",
  },
  высокая: {
    icon: "🔴",
    label: "Высокая вероятность хайпа",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
};

export const CONTENT_TABS = [
  { key: "linkedin" as const, label: "LinkedIn", icon: "💼" },
  { key: "instagram" as const, label: "Instagram", icon: "📸" },
  { key: "reels" as const, label: "Reels", icon: "🎬" },
  { key: "telegram" as const, label: "Telegram", icon: "✈️" },
];

export const MARKET_SIGNAL_VISUAL: Record<string, VisualBadge> = {
  emerging: {
    icon: "🌱",
    label: "Emerging Signal",
    className: "bg-violet-50 text-violet-800 border border-violet-200",
  },
  accelerating: {
    icon: "🚀",
    label: "Accelerating",
    className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
  structural_shift: {
    icon: "🔄",
    label: "Structural Shift",
    className: "bg-brand-50 text-brand-800 border border-brand-200",
  },
  standardization: {
    icon: "🏗",
    label: "Standardization",
    className: "bg-slate-50 text-slate-800 border border-slate-300",
  },
  saturation: {
    icon: "⚠️",
    label: "Saturation",
    className: "bg-orange-50 text-orange-800 border border-orange-200",
  },
  declining: {
    icon: "🧊",
    label: "Declining",
    className: "bg-slate-50 text-slate-600 border border-slate-200",
  },
};

export const FUTURE_PROB_VISUAL: Record<string, VisualBadge> = {
  высокая: {
    icon: "🔴",
    label: "Высокая вероятность",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
  средняя: {
    icon: "🟡",
    label: "Средняя вероятность",
    className: "bg-amber-50 text-amber-800 border border-amber-200",
  },
  низкая: {
    icon: "🟢",
    label: "Низкая вероятность",
    className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
};

export const CONCENTRATION_VISUAL: Record<string, VisualBadge> = {
  низкая: {
    icon: "📊",
    label: "Рост распределён",
    className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
  средняя: {
    icon: "📈",
    label: "Средняя концентрация",
    className: "bg-amber-50 text-amber-800 border border-amber-200",
  },
  высокая: {
    icon: "🎯",
    label: "Рост у few лидеров",
    className: "bg-orange-50 text-orange-800 border border-orange-200",
  },
};

export function healthScoreClass(score: number): string {
  if (score >= 71) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 31) return "text-brand-700 bg-brand-50 border-brand-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}

export const INSIGHTS_LEGEND = [
  { icon: "🌱", label: "Зарождающийся тренд" },
  { icon: "🚀", label: "Ускоряется" },
  { icon: "🏗", label: "Формируется стандарт" },
  { icon: "🏆", label: "Зрелый тренд" },
  { icon: "⚠️", label: "Возможное насыщение" },
  { icon: "🧊", label: "Остывающий тренд" },
  { icon: "🟢", label: "Высокая уверенность" },
  { icon: "🟡", label: "Средняя уверенность" },
  { icon: "🔴", label: "Низкая уверенность" },
];

export const MATURITY_VISUAL: Record<string, VisualBadge> = {
  "Очень низкая": {
    icon: "🔴",
    label: "Очень низкая",
    className: "bg-red-50 text-red-800 border border-red-200",
  },
  Низкая: {
    icon: "🟠",
    label: "Низкая",
    className: "bg-orange-50 text-orange-800 border border-orange-200",
  },
  Средняя: {
    icon: "🟡",
    label: "Средняя",
    className: "bg-amber-50 text-amber-800 border border-amber-200",
  },
  Высокая: {
    icon: "🟢",
    label: "Высокая",
    className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
  "Очень высокая": {
    icon: "🏆",
    label: "Очень высокая",
    className: "bg-brand-50 text-brand-800 border border-brand-200",
  },
};
