"use client";

import { SessionProvider } from "next-auth/react";
import { TimerProvider }   from "@/context/TimerContext";
import { OfflineBanner }     from "@/components/pwa/OfflineBanner";
import { InstallPrompt }     from "@/components/pwa/InstallPrompt";
import { NotificationSetup } from "@/components/pwa/NotificationSetup";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TimerProvider>
        {/* PWA overlays — live outside AppShell so they're always visible */}
        <OfflineBanner />
        <InstallPrompt />
        <NotificationSetup />
        {children}
      </TimerProvider>
    </SessionProvider>
  );
}
