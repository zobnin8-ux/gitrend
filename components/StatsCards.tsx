import Link from "next/link";
import type { DashboardStats } from "@/lib/types";
import { formatNumber, formatGrowth } from "@/lib/format";

interface StatCard {
  title: string;
  value: string;
  hint?: string;
  href?: string;
}

export function StatsCards({ stats }: { stats: DashboardStats }) {
  const cards: StatCard[] = [
    {
      title: "Всего репозиториев",
      value: formatNumber(stats.total),
      hint: "отслеживается в базе",
    },
    {
      title: "Новых за неделю",
      value: formatNumber(stats.newThisWeek),
      hint: "создано за последние 7 дней",
      href: "/new?period=7",
    },
    {
      title: "Новых за месяц",
      value: formatNumber(stats.newThisMonth),
      hint: "создано за последние 30 дней",
      href: "/new?period=30",
    },
    {
      title: "Самый быстрорастущий",
      value: stats.fastestGrowing
        ? stats.fastestGrowing.full_name
        : "—",
      hint: stats.fastestGrowing
        ? `${formatGrowth(stats.fastestGrowing.growth_7d)} ★ за 7 дней`
        : "нет данных",
      href: stats.fastestGrowing
        ? `/repo/${stats.fastestGrowing.github_id}`
        : undefined,
    },
    {
      title: "Самый популярный",
      value: stats.mostPopular ? stats.mostPopular.full_name : "—",
      hint: stats.mostPopular
        ? `${formatNumber(stats.mostPopular.stars)} ★`
        : "нет данных",
      href: stats.mostPopular ? `/repo/${stats.mostPopular.github_id}` : undefined,
    },
    {
      title: "Популярный язык",
      value: stats.topLanguage ? stats.topLanguage.language : "—",
      hint: stats.topLanguage
        ? `${formatNumber(stats.topLanguage.count)} репозиториев`
        : "нет данных",
      href: stats.topLanguage
        ? `/popular?language=${encodeURIComponent(stats.topLanguage.language)}`
        : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const content = (
          <div className="card h-full p-4 transition-shadow hover:shadow-md">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {card.title}
            </div>
            <div className="mt-2 truncate text-2xl font-semibold text-slate-900">
              {card.value}
            </div>
            {card.hint && (
              <div className="mt-1 text-sm text-slate-500">{card.hint}</div>
            )}
          </div>
        );

        return card.href ? (
          <Link key={card.title} href={card.href} className="block">
            {content}
          </Link>
        ) : (
          <div key={card.title}>{content}</div>
        );
      })}
    </div>
  );
}
