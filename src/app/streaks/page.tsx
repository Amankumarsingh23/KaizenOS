"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Flame, Trophy, CheckCircle2, Clock, Code2, Users, Briefcase,
  FolderOpen, Globe, Languages, Mic, BookOpen, X, ChevronRight,
} from "lucide-react";
import { AppShell }  from "@/components/layout/AppShell";
import { Badge }     from "@/components/ui/Badge";
import { Skeleton }  from "@/components/ui/Skeleton";
import type { Category } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayCell {
  date: string;
  count: number;  // -1 = padding (before range)
  dow: number;
  sessions: { id: string; category: string; durationMinutes: number; selfRating: number; notes: string; startTime: string }[];
}

interface StreakData {
  category: Category;
  currentStreak: number;
  bestStreak: number;
  lastActivityDate: string | null;
  status: "active" | "pending" | "broken";
}

interface MilestoneData {
  category: Category;
  currentStreak: number;
  bestStreak: number;
  nextMilestone: number | null;
  daysAway: number;
  achieved: number[];
  status: "active" | "pending" | "broken";
}

interface CategoryStat {
  category: Category;
  totalSessions: number;
  totalMinutes: number;
  avgDuration: number;
  miniHeatmap: { date: string; count: number; dow: number }[];
}

interface ApiData {
  streaks:           StreakData[];
  heatmapDays:       DayCell[];
  consistency:       { score: number; activeDays: number; totalDays: number; startDate: string };
  milestones:        MilestoneData[];
  categoryBreakdown: CategoryStat[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_META: Record<Category, { Icon: React.ElementType; color: string; label: string }> = {
  DSA:             { Icon: Code2,      color: "#5B8FD4", label: "DSA"            },
  GD:              { Icon: Users,      color: "#6B8F71", label: "Group Disc."    },
  MOCK_INTERVIEW:  { Icon: Briefcase,  color: "#C4A35A", label: "Mock Interview" },
  PROJECT_WORK:    { Icon: FolderOpen, color: "#8B5CF6", label: "Project Work"   },
  CURRENT_AFFAIRS: { Icon: Globe,      color: "#38BDF8", label: "Curr. Affairs"  },
  JAPANESE:        { Icon: Languages,  color: "#F43F5E", label: "Japanese"       },
  COMMUNICATION:   { Icon: Mic,        color: "#C47D5A", label: "Communication"  },
  READING:         { Icon: BookOpen,   color: "#9B8B7A", label: "Reading"        },
};

const MILESTONE_LABELS: Record<number, string> = {
  3: "First Habit", 7: "One Week", 14: "Two Weeks", 21: "Three Weeks",
  30: "One Month", 60: "Two Months", 90: "Quarter", 180: "Half Year", 365: "Full Year",
};

// ─── Heatmap helpers ──────────────────────────────────────────────────────────

function heatColor(count: number) {
  if (count < 0)  return "transparent";       // padding
  if (count === 0) return "#EDE9E0";           // cream
  if (count <= 2)  return "#B8D4BB";           // light sage
  if (count <= 4)  return "#6B8F71";           // sage
  return "#4A6B50";                            // dark sage
}

function buildWeeks<T extends { dow: number }>(days: T[]): T[][] {
  const weeks: T[][] = [];
  let cur: T[] = [];
  for (const d of days) {
    if (d.dow === 0 && cur.length > 0) { weeks.push(cur); cur = []; }
    cur.push(d);
  }
  if (cur.length) weeks.push(cur);
  return weeks;
}

function monthLabel(weeks: DayCell[][], wi: number): string | null {
  const day = weeks[wi]?.find((d) => d.count >= 0);
  if (!day) return null;
  const prev = weeks[wi - 1]?.find((d) => d.count >= 0);
  const thisM = day.date.slice(0, 7);
  const prevM = prev?.date.slice(0, 7) ?? "";
  if (!prev || thisM !== prevM) return format(new Date(day.date), "MMM");
  return null;
}

// ─── Year Heatmap ─────────────────────────────────────────────────────────────

const DAY_LABELS = ["M", "", "W", "", "F", "", "S"];
const CELL = 12, GAP = 2, STEP = CELL + GAP;

function YearHeatmap({
  days, loading, onSelectDay,
}: {
  days: DayCell[];
  loading: boolean;
  onSelectDay: (day: DayCell) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to end (today) on mount
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [days]);

  if (loading) return <Skeleton className="h-32 w-full" rounded="lg" />;

  const weeks = buildWeeks(days);

  return (
    <div className="overflow-x-auto -mx-5 px-5" ref={scrollRef}>
      <div className="flex gap-0.5" style={{ minWidth: `${weeks.length * STEP}px` }}>
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-0.5 mr-1 pt-5 shrink-0">
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="flex items-center justify-end" style={{ height: CELL }}>
              <span className="text-[8px] text-ink/25 font-sans pr-0.5">{l}</span>
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => {
          const lbl = monthLabel(weeks, wi);
          return (
            <div key={wi} className="flex flex-col shrink-0" style={{ width: CELL, gap: GAP }}>
              {/* Month label row */}
              <div style={{ height: 14 }} className="flex items-end">
                {lbl && (
                  <span className="text-[8px] text-ink/35 font-sans leading-none">{lbl}</span>
                )}
              </div>
              {/* Day cells */}
              {Array.from({ length: 7 }, (_, di) => {
                const cell = week.find((d) => d.dow === di) ?? null;
                const active = cell && cell.count > 0;
                return (
                  <motion.button
                    key={di}
                    whileTap={active ? { scale: 0.85 } : {}}
                    onClick={() => cell && cell.count >= 0 && onSelectDay(cell)}
                    className="rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-sage"
                    style={{
                      width: CELL, height: CELL,
                      background: cell ? heatColor(cell.count) : "#F5F0E8",
                      cursor: active ? "pointer" : "default",
                    }}
                    title={cell && cell.count >= 0
                      ? `${cell.date}: ${cell.count} session${cell.count !== 1 ? "s" : ""}`
                      : undefined
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[9px] text-ink/30 font-sans">Less</span>
        {[0, 1, 3, 5].map((v) => (
          <div key={v} className="rounded-sm" style={{ width: CELL, height: CELL, background: heatColor(v) }} />
        ))}
        <span className="text-[9px] text-ink/30 font-sans">More</span>
      </div>
    </div>
  );
}

// ─── Mini Heatmap (12 weeks) ─────────────────────────────────────────────────

function MiniHeatmap({ data }: { data: { date: string; count: number; dow: number }[] }) {
  const weeks = buildWeeks(data);
  return (
    <div className="flex gap-0.5">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-0.5">
          {Array.from({ length: 7 }, (_, di) => {
            const cell = week.find((d) => d.dow === di);
            return (
              <div
                key={di}
                className="rounded-sm"
                style={{ width: 8, height: 8, background: cell ? heatColor(cell.count) : "#F5F0E8" }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

function DayPanel({ day, onClose }: { day: DayCell; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="bg-parchment border border-mist/60 rounded-2xl p-4 mt-3"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-ink font-sans">
          {format(new Date(day.date), "EEEE, MMMM d")}
        </p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-mist/60 text-ink/40">
          <X size={14} />
        </button>
      </div>
      {day.sessions.length === 0 ? (
        <p className="text-xs text-ink/40 font-sans">No sessions logged</p>
      ) : (
        <div className="space-y-2">
          {day.sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
              <Badge variant={s.category as Category} />
              <span className="text-xs font-mono text-ink/60 ml-auto">{s.durationMinutes} min</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: i < s.selfRating ? "#C4A35A" : "#E8E2D8" }} />
                ))}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-ink/30 font-sans text-right">
            {day.sessions.reduce((s, r) => s + r.durationMinutes, 0)} min total
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Streak Card ──────────────────────────────────────────────────────────────

function StreakCard({ s }: { s: StreakData }) {
  const { Icon, color, label } = CAT_META[s.category];
  const bg =
    s.status === "active"  ? "bg-sage/8 border-sage/30" :
    s.status === "pending" ? "bg-white border-mist/60" :
                             "bg-terracotta/5 border-terracotta/20";
  const numColor =
    s.status === "active"  ? "text-sage" :
    s.status === "pending" ? "text-ink/50" :
                             "text-terracotta";

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className={`shrink-0 w-[112px] rounded-2xl border p-3.5 flex flex-col gap-2 ${bg}`}
    >
      <div className="flex items-center gap-2">
        <Icon size={15} style={{ color }} strokeWidth={1.8} />
        <span className="text-[10px] font-medium text-ink/50 font-sans truncate">{label}</span>
      </div>

      <div className="flex items-end gap-1">
        <motion.span
          key={s.currentStreak}
          className={`font-serif text-3xl font-semibold leading-none ${numColor}`}
          initial={{ rotateX: 90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{ display: "inline-block", perspective: 400 }}
        >
          {s.currentStreak}
        </motion.span>
        <span className="text-[10px] text-ink/35 font-sans mb-0.5">days</span>
        {s.status === "active" && (
          <motion.span
            animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame size={13} className="text-gold mb-0.5 ml-0.5" />
          </motion.span>
        )}
      </div>

      <p className="text-[9px] text-ink/30 font-sans leading-none">
        Best: {s.bestStreak}d
      </p>

      {s.status !== "broken" && s.currentStreak === 0 && (
        <p className="text-[9px] text-ink/30 font-sans">Start today!</p>
      )}
    </motion.div>
  );
}

// ─── Milestones ───────────────────────────────────────────────────────────────

function MilestonesSection({ milestones, loading }: {
  milestones: MilestoneData[];
  loading: boolean;
}) {
  const upcoming = milestones.filter((m) => m.nextMilestone !== null && m.daysAway <= 30);
  const allAchieved = milestones.flatMap((m) =>
    m.achieved.map((days) => ({ category: m.category, days, status: m.status }))
  ).sort((a, b) => b.days - a.days);

  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-3">
        Milestones
      </p>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" rounded="lg" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Upcoming */}
          {upcoming.map((m) => (
            <motion.div
              key={`${m.category}-next`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 bg-gold/8 border border-gold/20 rounded-2xl px-4 py-3"
            >
              <div className="w-8 h-8 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
                <Trophy size={16} className="text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink font-sans">
                  {m.daysAway === 1 ? "Tomorrow!" : `${m.daysAway} days away`}
                </p>
                <p className="text-xs text-ink/50 font-sans">
                  {MILESTONE_LABELS[m.nextMilestone!] ?? `${m.nextMilestone}d`} {m.category.replace(/_/g," ")} streak
                </p>
              </div>
              <Badge variant={m.category} />
            </motion.div>
          ))}

          {upcoming.length === 0 && !allAchieved.length && (
            <div className="text-center py-6">
              <Trophy size={24} className="text-ink/20 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-xs text-ink/30 font-sans">Log sessions to earn milestones</p>
            </div>
          )}

          {/* Achieved */}
          {allAchieved.slice(0, 6).map(({ category, days }) => (
            <div
              key={`${category}-${days}`}
              className="flex items-center gap-3 bg-white border border-mist/50 rounded-2xl px-4 py-3"
            >
              <CheckCircle2 size={16} className="text-sage shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-ink font-sans">
                  {MILESTONE_LABELS[days] ?? `${days}-day streak`}
                </p>
                <p className="text-[10px] text-ink/35 font-sans">
                  {category.replace(/_/g, " ")}
                </p>
              </div>
              <Badge variant={category} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Consistency Widget ───────────────────────────────────────────────────────

function ConsistencyWidget({ data, loading }: {
  data: ApiData["consistency"] | undefined;
  loading: boolean;
}) {
  const score = data?.score ?? 0;
  const color = score >= 80 ? "#6B8F71" : score >= 50 ? "#C4A35A" : "#C47D5A";
  const r = 38, cx = 44, cy = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] flex items-center gap-5">
      {loading ? (
        <Skeleton className="w-[88px] h-[88px]" rounded="full" />
      ) : (
        <svg width={88} height={88} viewBox="0 0 88 88" className="shrink-0">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E8E2D8" strokeWidth={5} />
          <motion.circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke={color} strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            transform="rotate(-90 44 44)"
          />
          <text x={cx} y={cy + 6} textAnchor="middle" fontSize={18}
            fontFamily="var(--font-newsreader)" fontWeight="600" fill="#2D2A26">
            {score}%
          </text>
        </svg>
      )}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-1">
          Consistency Score
        </p>
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink font-sans">
              Active {data?.activeDays} of {data?.totalDays} days
            </p>
            <p className="text-xs text-ink/40 font-sans mt-0.5">
              Since {data?.startDate}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ data, loading }: {
  data: CategoryStat[];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState<Category | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" rounded="lg" />)}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-ink/30 font-sans">No sessions logged yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((cat) => {
        const { Icon, color, label } = CAT_META[cat.category];
        const isOpen = expanded === cat.category;
        const hours  = Math.round(cat.totalMinutes / 60 * 10) / 10;

        return (
          <div key={cat.category} className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(45,42,38,0.06)] overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : cat.category)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink font-sans">{label}</p>
                <p className="text-xs text-ink/40 font-sans">
                  {cat.totalSessions} sessions · {hours}h total
                </p>
              </div>
              <MiniHeatmap data={cat.miniHeatmap} />
              <ChevronRight
                size={14}
                className="text-ink/25 ml-2 shrink-0 transition-transform"
                style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
              />
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-mist/40">
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {[
                        { label: "Sessions", value: String(cat.totalSessions), Icon: Flame },
                        { label: "Total",    value: `${hours}h`,              Icon: Clock },
                        { label: "Avg",      value: `${cat.avgDuration}m`,    Icon: Clock },
                      ].map(({ label, value, Icon: I }) => (
                        <div key={label} className="bg-cream rounded-xl px-3 py-2.5 text-center">
                          <p className="font-serif text-lg font-semibold text-ink leading-none">{value}</p>
                          <p className="text-[10px] text-ink/35 font-sans mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StreaksPage() {
  const [data, setData]         = useState<ApiData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null);

  useEffect(() => {
    fetch("/api/streaks")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const streaks           = data?.streaks          ?? [];
  const heatmapDays       = data?.heatmapDays      ?? [];
  const consistency       = data?.consistency;
  const milestones        = data?.milestones        ?? [];
  const categoryBreakdown = data?.categoryBreakdown ?? [];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-ink">
          Your <em>Streaks.</em>
        </h1>
        <p className="text-sm text-ink/40 font-sans mt-1">
          Consistency is the compound interest of effort
        </p>
      </div>

      {/* 1. Current Streak Cards */}
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-3">
          Current Streaks
        </p>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="shrink-0 w-[112px] h-[104px]" rounded="lg" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {streaks
              .sort((a, b) => b.currentStreak - a.currentStreak)
              .map((s) => <StreakCard key={s.category} s={s} />)}
          </div>
        )}
      </div>

      {/* 2. Consistency Score */}
      <div className="mb-5">
        <ConsistencyWidget data={consistency} loading={loading} />
      </div>

      {/* 3. Full Year Heatmap */}
      <div className="mb-5 bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-ink font-sans">Activity Calendar</p>
          <p className="text-[11px] text-ink/40 font-sans">Last 12 months · tap to explore</p>
        </div>

        <YearHeatmap days={heatmapDays} loading={loading} onSelectDay={setSelectedDay} />

        {/* Selected day detail */}
        <AnimatePresence>
          {selectedDay && (
            <DayPanel day={selectedDay} onClose={() => setSelectedDay(null)} />
          )}
        </AnimatePresence>
      </div>

      {/* 4. Milestones */}
      <div className="mb-5">
        <MilestonesSection milestones={milestones} loading={loading} />
      </div>

      {/* 5. Category Breakdown */}
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-3">
          Category Breakdown
        </p>
        <CategoryBreakdown data={categoryBreakdown} loading={loading} />
      </div>
    </AppShell>
  );
}
