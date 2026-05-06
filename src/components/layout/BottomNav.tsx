"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Timer, BarChart2, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",          label: "Today",     Icon: Target   },
  { href: "/timer",     label: "Log",       Icon: Timer    },
  { href: "/analytics", label: "Analytics", Icon: BarChart2 },
  { href: "/topics",    label: "Topics",    Icon: BookOpen  },
  { href: "/settings",  label: "Settings",  Icon: Settings  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-sm"
      style={{ boxShadow: "0 -1px 0 rgba(45,42,38,0.06), 0 -4px 16px rgba(45,42,38,0.04)" }}
    >
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto pb-[max(env(safe-area-inset-bottom),8px)]">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 font-sans",
                isActive
                  ? "bg-sage text-white shadow-[0_2px_8px_rgba(107,143,113,0.30)]"
                  : "text-ink/35 hover:text-ink/60 hover:bg-mist/50"
              )}
            >
              <Icon size={isActive ? 15 : 20} strokeWidth={isActive ? 2.5 : 1.8} />
              {isActive && (
                <span className="text-xs font-medium leading-none">{label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
