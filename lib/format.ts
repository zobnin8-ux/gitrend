// Утилиты форматирования для русскоязычного интерфейса.

const numberFormatter = new Intl.NumberFormat("ru-RU");

export function formatNumber(n: number): string {
  return numberFormatter.format(n);
}

// Компактный формат для больших чисел: 12 345 -> 12,3K
export function formatCompact(n: number): string {
  if (Math.abs(n) < 1000) return String(n);
  if (Math.abs(n) < 1_000_000) {
    return (n / 1000).toFixed(1).replace(".", ",") + "K";
  }
  return (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
}

// Рост со знаком: +123 / -5 / 0
export function formatGrowth(n: number): string {
  if (n > 0) return `+${formatNumber(n)}`;
  return formatNumber(n);
}

export function formatPercent(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2).replace(".", ",")}%`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Относительное время на русском: "3 дня назад", "только что".
export function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";

  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hour = Math.round(min / 60);
  const day = Math.round(hour / 24);
  const month = Math.round(day / 30);
  const year = Math.round(day / 365);

  if (sec < 45) return "только что";
  if (min < 60) return `${min} ${plural(min, "минуту", "минуты", "минут")} назад`;
  if (hour < 24) return `${hour} ${plural(hour, "час", "часа", "часов")} назад`;
  if (day < 30) return `${day} ${plural(day, "день", "дня", "дней")} назад`;
  if (month < 12)
    return `${month} ${plural(month, "месяц", "месяца", "месяцев")} назад`;
  return `${year} ${plural(year, "год", "года", "лет")} назад`;
}

// Русское склонение по числам.
export function plural(
  n: number,
  one: string,
  few: string,
  many: string
): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
