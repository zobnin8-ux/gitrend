"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshButton } from "./RefreshButton";

const links: { href: string; label: string }[] = [
  { href: "/", label: "Обзор" },
  { href: "/popular", label: "Популярные сейчас" },
  { href: "/trending/24h", label: "Рост за 24 часа" },
  { href: "/trending/7d", label: "Рост за 7 дней" },
  { href: "/trending/30d", label: "Рост за 30 дней" },
  { href: "/new", label: "Новые проекты" },
  { href: "/favorites", label: "Избранное" },
  { href: "/insights", label: "AI-инсайты" },
  { href: "/search", label: "Поиск" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              GT
            </span>
            <span className="text-lg font-semibold tracking-tight">
              GitHub Тренды
            </span>
          </Link>
          <RefreshButton />
        </div>

        <nav className="flex flex-wrap gap-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
