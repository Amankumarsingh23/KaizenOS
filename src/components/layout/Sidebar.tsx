"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Timer, BarChart2, BookOpen, Settings, Zap, FolderOpen, Flame, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const navItems = [
  { href: "/",          label: "Today",     Icon: Target,     desc: "Dashboard"      },
  { href: "/timer",     label: "Log",       Icon: Timer,      desc: "Study timer"    },
  { href: "/analytics", label: "Analytics", Icon: BarChart2,    desc: "Progress"       },
  { href: "/weekly",    label: "Weekly",    Icon: CalendarDays, desc: "Week review"    },
  { href: "/topics",    label: "Topics",    Icon: BookOpen,     desc: "GD & Interview" },
  { href: "/projects",  label: "Projects",  Icon: FolderOpen, desc: "Milestones"     },
  { href: "/streaks",   label: "Streaks",   Icon: Flame,      desc: "Consistency"    },
  { href: "/settings",  label: "Settings",  Icon: Settings,   desc: "Preferences"    },
];

function Avatar({ name, image }: { name?: string | null; image?: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name ?? ""} className="w-8 h-8 rounded-full object-cover" />;
  }
  const initial = (name ?? "?")[0].toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-sage flex items-center justify-center text-white text-sm font-semibold font-serif">
      {initial}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-parchment border-r border-mist/60 py-6 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-7 h-7 rounded-lg bg-sage flex items-center justify-center">
          <Zap size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-serif text-lg font-semibold text-ink">KaizenOS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, Icon, desc }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                isActive
                  ? "bg-sage text-white shadow-[0_2px_8px_rgba(107,143,113,0.25)]"
                  : "text-ink/50 hover:text-ink hover:bg-mist/60"
              )}
            >
              <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none">{label}</p>
                {!isActive && (
                  <p className="text-[10px] mt-0.5 opacity-60 leading-none">{desc}</p>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-mist/60 pt-4 px-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <Avatar name={user?.name} image={user?.image} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate leading-none">
              {user?.name ?? "KaizenOS"}
            </p>
            <p className="text-[11px] text-ink/40 truncate leading-none mt-0.5 font-sans">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
