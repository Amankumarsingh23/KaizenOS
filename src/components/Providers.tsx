"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { TimerProvider }   from "@/context/TimerContext";

// PWA was removed — this cleans up any lingering service workers from old deployments
function SwKiller() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      // Also clear all caches so stale assets don't persist
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TimerProvider>
        <SwKiller />
        {children}
      </TimerProvider>
    </SessionProvider>
  );
}
