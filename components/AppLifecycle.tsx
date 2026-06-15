"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 15_000;

function getOrCreateSessionId(): string {
  const key = "gitrend-session-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function AppLifecycle() {
  useEffect(() => {
    let intervalId: number | undefined;
    let enabled = false;
    let sessionId = "";

    const onLeave = () => {
      if (!enabled || !sessionId) return;
      const url = `/api/lifecycle/leave?sessionId=${encodeURIComponent(sessionId)}`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        void fetch(url, { method: "GET", keepalive: true });
      }
    };

    void (async () => {
      try {
        const cfgRes = await fetch("/api/lifecycle/config", { cache: "no-store" });
        const cfg = (await cfgRes.json()) as { autoShutdown?: boolean };
        if (!cfg.autoShutdown) return;

        enabled = true;
        sessionId = getOrCreateSessionId();

        await fetch("/api/lifecycle/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        intervalId = window.setInterval(() => {
          void fetch("/api/lifecycle/heartbeat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
            keepalive: true,
          });
        }, HEARTBEAT_MS);

        window.addEventListener("pagehide", onLeave);
      } catch {
        // optional feature
      }
    })();

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("pagehide", onLeave);
    };
  }, []);

  return null;
}
