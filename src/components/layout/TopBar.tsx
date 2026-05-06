"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function getFirstName(name?: string | null) {
  if (!name) return "there";
  return name.split(" ")[0];
}

export function TopBar() {
  const { user } = useCurrentUser();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3.5 bg-cream/90 backdrop-blur-sm">
      {/* Greeting */}
      <div className="min-w-0">
        <p className="text-[11px] font-sans font-medium uppercase tracking-widest text-ink/40 leading-none mb-0.5">
          {getGreeting()}
        </p>
        <p className="text-base font-serif font-semibold text-ink leading-tight truncate">
          {getFirstName(user?.name)}
        </p>
      </div>

      {/* Date + actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-xs font-sans text-ink/40 leading-none">
            {format(now, "EEE, dd MMM")}
          </p>
          <p className="text-[11px] font-mono text-ink/30 leading-none mt-0.5">
            {format(now, "HH:mm")}
          </p>
        </div>
        <button
          aria-label="Notifications"
          className="p-2 rounded-xl hover:bg-mist/60 transition-colors text-ink/40 hover:text-ink/70"
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
