"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Flame, Timer, ChevronRight, Code2, Users, Briefcase,
  FolderOpen, Globe, Languages, Mic, BookOpen,
  Lightbulb, Target, CalendarCheck, BarChart2,
  Star, TrendingUp, Zap, AlertTriangle, Clock, Play,
} from "lucide-react";
import type { Recommendations, PlanItem } from "@/lib/ai/recommendations";

import { AppShell }    from "@/components/layout/AppShell";
import { Card }        from "@/components/ui/Card";
import { Badge }       from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScoreCircle } from "@/components/ui/ScoreCircle";
import { Sparkline }   from "@/components/ui/Sparkline";
import { EmptyState }  from "@/components/ui/EmptyState";
import { StaggerList, StaggerItem } from "@/components/ui/StaggerList";
import {
  Skeleton, ScoreCardSkeleton, SessionRowSkeleton, StreakChipSkeleton,
} from "@/components/ui/Skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTimer }       from "@/context/TimerContext";
import type { StudySession, Streak, Target as TargetType, DailyReport, Category } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  todaySessions:  StudySession[];
  streaks:        Streak[];
  monthlyTargets: TargetType[];
  dailyReport:    DailyReport | null;
  last7Scores:    (number | null)[];
  nudge:          string | null;
  recommendation: string | null;
}

// ─── Category meta ────────────────────────────────────────────────────────────

const CAT_META: Record<Category, { Icon: React.ElementType; color: string; label: string }> = {
  DSA:            { Icon: Code2,      color: "text-blue-500",    label: "DSA"           },
  GD:             { Icon: Users,      color: "text-sage",        label: "Group D."      },
  MOCK_INTERVIEW: { Icon: Briefcase,  color: "text-amber-500",   label: "Mock"          },
  PROJECT_WORK:   { Icon: FolderOpen, color: "text-violet-500",  label: "Project"       },
  CURRENT_AFFAIRS:{ Icon: Globe,      color: "text-sky-500",     label: "Curr. Affairs" },
  JAPANESE:       { Icon: Languages,  color: "text-rose-500",    label: "Japanese"      },
  COMMUNICATION:  { Icon: Mic,        color: "text-terracotta",  label: "Comm."         },
  READING:        { Icon: BookOpen,   color: "text-ink/50",      label: "Reading"       },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Still up,";
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  if (h < 21) return "Good evening,";
  return "Good night,";
}

function firstName(name?: string | null) {
  return name?.split(" ")[0] ?? "there";
}

function fmtTime(d: Date | string) {
  return format(new Date(d), "HH:mm");
}

function fmtElapsed(secs: number) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// ─── Section: Greeting ────────────────────────────────────────────────────────

function GreetingSection({ user, nudge, loading }: {
  user?: { name?: string | null };
  nudge: Recommendations["nudge"] | string | null;
  loading: boolean;
}) {
  const richNudge = nudge && typeof nudge === "object" ? nudge : null;
  const simpleNudge = typeof nudge === "string" ? nudge : null;

  const nudgeBg =
    richNudge?.urgency === "high"   ? "bg-terracotta/10 border-terracotta/25" :
    richNudge?.urgency === "medium" ? "bg-gold/10 border-gold/20" :
                                      "bg-sage/8 border-sage/20";
  const nudgeIcon =
    richNudge?.type === "streak_risk"    ? <Flame size={12} className="text-terracotta shrink-0" /> :
    richNudge?.type === "time_reminder"  ? <Clock size={12} className="text-gold shrink-0" /> :
    richNudge?.type === "break_reminder" ? <AlertTriangle size={12} className="text-sage shrink-0" /> :
    richNudge?.type === "positive"       ? <Zap size={12} className="text-sage shrink-0" /> :
                                           <Zap size={12} className="text-gold shrink-0" />;
  const nudgeTextColor =
    richNudge?.urgency === "high"   ? "text-terracotta/80" :
    richNudge?.urgency === "medium" ? "text-amber-700" : "text-sage";

  return (
    <div className="mb-6">
      <p className="text-sm text-ink/40 font-sans mb-0.5">{greeting()}</p>
      <h1 className="font-serif text-[2rem] font-semibold text-ink leading-tight">
        {firstName(user?.name)}.
      </h1>
      <p className="text-xs text-ink/35 font-sans mt-1">
        {format(new Date(), "EEEE, d MMMM yyyy")}
      </p>
      {loading ? (
        <Skeleton className="h-4 w-64 mt-3" />
      ) : richNudge ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`mt-3 inline-flex items-center gap-2 border rounded-full px-3 py-1.5 ${nudgeBg}`}
        >
          {nudgeIcon}
          <p className={`text-xs font-sans ${nudgeTextColor}`}>{richNudge.message}</p>
        </motion.div>
      ) : simpleNudge ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5"
        >
          <Zap size={12} className="text-gold shrink-0" />
          <p className="text-xs text-amber-700 font-sans">{simpleNudge}</p>
        </motion.div>
      ) : null}
    </div>
  );
}

// ─── Section: Today's Score ───────────────────────────────────────────────────

function ScoreCard({ report, last7, loading, onRefresh }: {
  report: DailyReport | null;
  last7: (number | null)[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/reports/generate", { method: "POST" });
      onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) return <ScoreCardSkeleton />;

  const has7 = last7.some((v) => v !== null);

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40">
          Daily Score
        </p>
        <button onClick={handleRefresh} disabled={refreshing}
          className="text-[10px] text-ink/30 hover:text-sage font-sans flex items-center gap-1 transition-colors disabled:opacity-40">
          <TrendingUp size={10} className={refreshing ? "animate-pulse" : ""} />
          {refreshing ? "Updating…" : "Refresh"}
        </button>
      </div>
      {report ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink/60 font-sans mb-1">{report.summary}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-sage font-sans">↑ {report.strengths.split(",")[0]}</span>
            </div>
            {has7 && (
              <div className="mt-3">
                <p className="text-[10px] text-ink/30 font-sans mb-1">Last 7 days</p>
                <Sparkline data={last7} width={100} height={28} />
              </div>
            )}
          </div>
          <ScoreCircle score={report.overallScore} size="lg" label="/ 100" />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-ink/50 font-sans">No report yet for today</p>
            <p className="text-xs text-ink/30 font-sans mt-1">
              Complete sessions to generate your daily score
            </p>
            {has7 && (
              <div className="mt-3">
                <p className="text-[10px] text-ink/30 font-sans mb-1">Last 7 days</p>
                <Sparkline data={last7} width={100} height={28} />
              </div>
            )}
          </div>
          <div className="w-20 h-20 rounded-full border-[3px] border-mist flex items-center justify-center shrink-0">
            <p className="text-2xl font-serif text-ink/20">—</p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Section: Active Timer Shortcut ──────────────────────────────────────────

function TimerShortcut() {
  const { status, elapsed, category } = useTimer();
  const router = useRouter();
  const isLive = status === "running" || status === "paused";

  return (
    <motion.div
      layout
      onClick={() => router.push("/timer")}
      className="cursor-pointer mb-4"
    >
      {isLive ? (
        <Card className="!p-4 border-2 border-sage/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {status === "running" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sage animate-ping" />
                )}
                <span className="w-2 h-2 rounded-full bg-sage block" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-sage font-sans font-medium">
                  {status === "running" ? "Session running" : "Paused"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {category && <Badge variant={category} />}
                  <span className="font-mono text-base font-semibold text-ink">
                    {fmtElapsed(elapsed)}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-ink/30" />
          </div>
        </Card>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); router.push("/timer"); }}
          className="w-full flex items-center justify-between bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)] hover:shadow-[0_4px_20px_rgba(45,42,38,0.10)] transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sage/10 flex items-center justify-center">
              <Timer size={18} className="text-sage" strokeWidth={1.8} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-ink font-sans">Start a session</p>
              <p className="text-xs text-ink/40 font-sans">Log your study time</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-ink/30" />
        </button>
      )}
    </motion.div>
  );
}

// ─── Session metadata helpers ─────────────────────────────────────────────────

function parseSessionMeta(s: StudySession): { primary?: string; chips?: string[] } | null {
  if (!s.metadata) return null;
  try {
    const m = JSON.parse(s.metadata) as Record<string, string>;
    switch (s.category) {
      case "DSA":            return { primary: m.problem, chips: [m.platform, m.difficulty].filter(Boolean) };
      case "GD":             return { primary: m.topic,   chips: [m.format].filter(Boolean) };
      case "MOCK_INTERVIEW": return { primary: m.type,    chips: [m.company].filter(Boolean) };
      case "PROJECT_WORK":   return { primary: m.project, chips: [m.task].filter(Boolean) };
      case "READING":        return { primary: m.title,   chips: [m.author].filter(Boolean) };
      case "JAPANESE":       return { primary: m.lesson,  chips: [m.type].filter(Boolean) };
      case "COMMUNICATION":  return { primary: m.topic,   chips: [m.type].filter(Boolean) };
      case "CURRENT_AFFAIRS":return { primary: m.topic,   chips: [m.source].filter(Boolean) };
      default:               return null;
    }
  } catch { return null; }
}

const DIFF_COLOR: Record<string, string> = {
  Easy:   "bg-sage/15 text-sage",
  Medium: "bg-gold/15 text-amber-700",
  Hard:   "bg-terracotta/15 text-terracotta",
};

// ─── Section: Today's Sessions ────────────────────────────────────────────────

function SessionTimeline({ sessions, loading }: {
  sessions: StudySession[];
  loading: boolean;
}) {
  const CAT_DOT: Record<Category, string> = {
    DSA: "bg-blue-400", GD: "bg-sage", MOCK_INTERVIEW: "bg-amber-400",
    PROJECT_WORK: "bg-violet-400", CURRENT_AFFAIRS: "bg-sky-400",
    JAPANESE: "bg-rose-400", COMMUNICATION: "bg-terracotta", READING: "bg-ink/30",
  };

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40">
          Today's Sessions
        </p>
        {sessions.length > 0 && (
          <span className="text-xs text-ink/30 font-sans">
            {sessions.reduce((s, r) => s + r.durationMinutes, 0)} min total
          </span>
        )}
      </div>

      {loading ? (
        <Card className="!p-4 space-y-0 divide-y divide-mist/40">
          {[0, 1].map((i) => <SessionRowSkeleton key={i} />)}
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="!py-2 !px-4">
          <EmptyState
            type="sessions"
            body="Your first session starts your first streak. Go!"
          />
        </Card>
      ) : (
        <Card className="!p-4">
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[55px] top-4 bottom-4 w-px bg-mist" />

            {sessions.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                {/* Time */}
                <p className="text-[11px] font-mono text-ink/35 w-10 shrink-0 mt-0.5 text-right">
                  {fmtTime(s.startTime)}
                </p>

                {/* Dot */}
                <div className="flex flex-col items-center gap-1 mt-1.5 shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${CAT_DOT[s.category]} ring-2 ring-white`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={s.category} />
                    <span className="text-xs text-ink/40 font-sans">{s.durationMinutes} min</span>
                    <div className="flex gap-0.5 ml-auto">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={10}
                          className={i < s.selfRating ? "text-gold" : "text-mist"}
                          fill={i < s.selfRating ? "currentColor" : "none"}
                          strokeWidth={i < s.selfRating ? 0 : 1.5}
                        />
                      ))}
                    </div>
                  </div>
                  {(() => {
                    const meta = parseSessionMeta(s);
                    if (!meta || (!meta.primary && !meta.chips?.length)) return null;
                    return (
                      <div className="mb-1">
                        {meta.primary && (
                          <p className="text-xs font-semibold text-ink/75 font-sans leading-snug">{meta.primary}</p>
                        )}
                        {meta.chips?.length ? (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {meta.chips.map((chip) => (
                              <span
                                key={chip}
                                className={`text-[10px] rounded-full px-2 py-0.5 font-sans ${DIFF_COLOR[chip] ?? "bg-mist/70 text-ink/45"}`}
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                  {s.notes && s.notes !== "—" && (
                    <p className="text-xs text-ink/50 font-sans leading-relaxed line-clamp-2">
                      {s.notes}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Section: Streak Bar ──────────────────────────────────────────────────────

function StreakBar({ streaks, loading }: { streaks: Streak[]; loading: boolean }) {
  const ALL_CATS = Object.keys(CAT_META) as Category[];

  return (
    <div className="mb-5">
      <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-3">
        Streaks
      </p>
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {loading
          ? ALL_CATS.map((c) => <StreakChipSkeleton key={c} />)
          : ALL_CATS.map((cat) => {
              const s = streaks.find((x) => x.category === cat);
              const { Icon, color, label } = CAT_META[cat];
              const current = s?.currentStreak ?? 0;
              const isAlive = current > 0;

              return (
                <motion.div
                  key={cat}
                  whileTap={{ scale: 0.95 }}
                  className={[
                    "shrink-0 w-[76px] rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-default",
                    isAlive
                      ? "bg-white shadow-[0_2px_12px_rgba(45,42,38,0.08)] border border-mist/60"
                      : "bg-mist/30 border border-transparent",
                  ].join(" ")}
                >
                  <Icon size={18} className={isAlive ? color : "text-ink/20"} strokeWidth={1.8} />
                  <div className="flex items-center gap-0.5">
                    <span
                      className={[
                        "font-serif text-xl font-semibold leading-none",
                        isAlive ? "text-ink" : "text-ink/20",
                      ].join(" ")}
                    >
                      {current}
                    </span>
                    {isAlive && <Flame size={12} className="text-gold" />}
                  </div>
                  <p className="text-[10px] font-sans text-ink/35 leading-none text-center">
                    {label}
                  </p>
                </motion.div>
              );
            })}
      </div>
    </div>
  );
}

// ─── Section: Quick Actions ───────────────────────────────────────────────────

function QuickActions() {
  const { status, selectCategory } = useTimer();
  const router = useRouter();

  function goTimer(cat: Category) {
    if (status === "idle") selectCategory(cat);
    router.push("/timer");
  }

  const actions = [
    { label: "Start GD",     sub: "Group discussion",   Icon: Users,        onClick: () => goTimer("GD"),             bg: "bg-sage/10",        ic: "text-sage"       },
    { label: "Log DSA",      sub: "Problem solving",    Icon: Code2,        onClick: () => goTimer("DSA"),            bg: "bg-blue-50",        ic: "text-blue-500"   },
    { label: "Daily Check-in",sub:"Journal entry",      Icon: CalendarCheck,onClick: () => router.push("/journal"),   bg: "bg-gold/10",        ic: "text-gold"       },
    { label: "Analytics",    sub: "Track progress",     Icon: BarChart2,    onClick: () => router.push("/analytics"), bg: "bg-terracotta/10",  ic: "text-terracotta" },
  ];

  return (
    <div className="mb-5">
      <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-3">
        Quick Actions
      </p>
      <StaggerList className="grid grid-cols-2 gap-2.5">
        {actions.map(({ label, sub, Icon, onClick, bg, ic }) => (
          <StaggerItem key={label}>
            <motion.button
              onClick={onClick}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)] hover:shadow-[0_4px_20px_rgba(45,42,38,0.10)] transition-shadow text-left w-full"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={16} className={ic} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink font-sans leading-none">{label}</p>
                <p className="text-[11px] text-ink/35 font-sans mt-0.5 leading-none truncate">{sub}</p>
              </div>
            </motion.button>
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  );
}

// ─── Section: Monthly Targets ─────────────────────────────────────────────────

function TargetsSection({ targets, loading }: { targets: TargetType[]; loading: boolean }) {
  if (loading) {
    return (
      <Card className="mb-5">
        <Skeleton className="h-3 w-32 mb-4" />
        {[0,1,2].map((i) => (
          <div key={i} className="mb-4 last:mb-0 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-1.5 w-full" rounded="full" />
          </div>
        ))}
      </Card>
    );
  }
  if (!targets.length) return null;

  const month = format(new Date(), "MMMM");
  const dom   = new Date().getDate();
  const dim   = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const expectedPct = dom / dim;

  return (
    <Card className="mb-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40">
          {month} Targets
        </p>
        <Target size={14} className="text-ink/25" />
      </div>
      <div className="space-y-4">
        {targets.map((t) => {
          const pct = t.targetValue > 0 ? t.currentValue / t.targetValue : 0;
          const behind = pct < expectedPct - 0.1;
          return (
            <div key={t.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant={t.category as Category} />
                  <span className="text-[11px] text-ink/40 font-sans">{t.unit}</span>
                  {behind && (
                    <span className="text-[10px] text-terracotta font-sans font-medium">behind</span>
                  )}
                </div>
                <span className="text-xs font-mono font-medium text-ink">
                  {t.currentValue}/{t.targetValue}
                </span>
              </div>
              <ProgressBar
                value={t.currentValue}
                max={t.targetValue}
                color={behind ? "terracotta" : "sage"}
                size="xs"
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Section: Morning Plan ────────────────────────────────────────────────────

const BADGE_STYLE: Record<PlanItem["badge"], { pill: string; label: string }> = {
  streak_risk:   { pill: "bg-terracotta/10 text-terracotta border-terracotta/25", label: "streak at risk" },
  behind_target: { pill: "bg-gold/10 text-amber-700 border-gold/20",              label: "behind"         },
  scheduled:     { pill: "bg-sage/10 text-sage border-sage/20",                   label: "today"          },
  on_track:      { pill: "bg-mist text-ink/50 border-mist",                       label: "on track"       },
};

function MorningPlanCard({ recs, loading }: { recs: Recommendations | null; loading: boolean }) {
  const { status, startWithCategory } = useTimer();
  const router = useRouter();

  function quickStart(cat: Category) {
    if (status === "idle") startWithCategory(cat);
    router.push("/timer");
  }
  if (loading) {
    return (
      <Card className="mb-5">
        <Skeleton className="h-3 w-40 mb-4" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3 py-3 border-b border-mist/40 last:border-0">
            <Skeleton className="w-6 h-6 shrink-0" rounded="full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </Card>
    );
  }

  const plan = recs?.morningPlan;
  if (!plan?.items.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-5"
    >
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-0.5">
              Today's Plan
            </p>
            <p className="text-sm font-semibold text-ink font-sans">{plan.headline}</p>
          </div>
          <span className="text-xs font-mono text-ink/35">{plan.totalMinutes} min</span>
        </div>

        <div className="space-y-0 divide-y divide-mist/40">
          {plan.items.map((item) => {
            const badgeStyle = BADGE_STYLE[item.badge];
            return (
              <div key={item.category} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-6 h-6 rounded-full bg-ink/8 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[11px] font-mono font-semibold text-ink/50">{item.priority}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={item.category} />
                    <span
                      className={`text-[10px] font-sans font-medium border rounded-full px-2 py-0.5 ${badgeStyle.pill}`}
                    >
                      {badgeStyle.label}
                    </span>
                    <span className="text-[10px] text-ink/30 font-sans ml-auto">{item.durationMin} min</span>
                  </div>
                  <p className="text-sm text-ink font-sans leading-snug">{item.action}</p>
                  <p className="text-[11px] text-ink/40 font-sans mt-0.5">{item.reason}</p>
                </div>
                <motion.button
                  onClick={() => quickStart(item.category)}
                  whileTap={{ scale: 0.9 }}
                  className="shrink-0 w-7 h-7 rounded-full bg-sage/15 hover:bg-sage/25 flex items-center justify-center mt-0.5 transition-colors"
                  title={`Start ${item.category}`}
                >
                  <Play size={12} className="text-sage" fill="currentColor" />
                </motion.button>
              </div>
            );
          })}
        </div>

        {recs?.gapAnalysis.overallStatus !== "on_track" && (
          <div className={[
            "mt-4 rounded-xl px-3 py-2 text-xs font-sans",
            recs?.gapAnalysis.overallStatus === "significantly_behind"
              ? "bg-terracotta/8 text-terracotta/80"
              : "bg-gold/8 text-amber-700",
          ].join(" ")}>
            {recs?.gapAnalysis.encouragement}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ─── Section: Daily Recommendation ───────────────────────────────────────────

function RecommendationCard({ recommendation, loading }: {
  recommendation: string | null;
  loading: boolean;
}) {
  if (loading) return (
    <Card className="mb-5">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4 mt-2" />
    </Card>
  );

  if (!recommendation) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="mb-5 border-l-4 border-l-sage !pl-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-xl bg-sage/10 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp size={14} className="text-sage" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-sage font-sans font-medium mb-1">
              Today's Focus
            </p>
            <p className="text-sm text-ink font-sans leading-relaxed">{recommendation}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Dashboard (main) ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [data, setData]       = useState<DashboardData | null>(null);
  const [recs, setRecs]       = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch("/api/recommendations/today")
      .then((r) => r.json())
      .then(setRecs)
      .catch(console.error)
      .finally(() => setRecsLoading(false));
  }, []);

  const todaySessions  = data?.todaySessions  ?? [];
  const streaks        = data?.streaks        ?? [];
  const monthlyTargets = data?.monthlyTargets ?? [];
  const dailyReport    = data?.dailyReport    ?? null;
  const last7Scores    = data?.last7Scores    ?? [];
  const recommendation = data?.recommendation ?? null;

  // Prefer rich nudge from recommendations; fall back to simple dashboard nudge
  const nudge = recs?.nudge ?? data?.nudge ?? null;

  return (
    <AppShell>
      <GreetingSection user={user} nudge={nudge} loading={loading && recsLoading} />
      <ScoreCard
        report={dailyReport} last7={last7Scores} loading={loading}
        onRefresh={() => {
          fetch("/api/dashboard").then((r) => r.json()).then(setData).catch(console.error);
        }}
      />
      <TimerShortcut />
      <MorningPlanCard recs={recs} loading={recsLoading} />
      <SessionTimeline sessions={todaySessions} loading={loading} />
      <StreakBar        streaks={streaks} loading={loading} />
      <QuickActions />
      <TargetsSection  targets={monthlyTargets} loading={loading} />
      <RecommendationCard recommendation={recommendation} loading={loading} />
    </AppShell>
  );
}
