import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "GitHub Тренды — отслеживание популярных репозиториев",
  description:
    "Локальный дашборд популярных и быстрорастущих GitHub-репозиториев",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Navbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-7xl px-4 py-8 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          Локальный дашборд GitHub-трендов · данные GitHub REST API · SQLite
        </footer>
      </body>
    </html>
  );
}
