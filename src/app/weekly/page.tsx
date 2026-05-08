"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  CheckCircle2, XCircle, TrendingUp, TrendingDown,
  Target, Clock, Smile, Zap, CalendarDays,
  Code2, Users, Briefcase, FolderOpen, Globe,
  Languages, Mic, BookOpen,
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";

import { AppShell }    from "@/components/layout/AppShell";
import { Card }        from "@/components/ui/Card";
import { Badge }       from "@/components/ui/Badge";
import { Skeleton }    from "@/components/ui/Skeleton";
import {
  ChartWrapper, WarmTooltip, CAT_COLORS, TICK, GRID_PROPS,
} from "@/components/charts/ChartWrapper";
import type { Category } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyData {
  weekRange:          { start: string; end: string };
  totalSessions:      number;
  totalMinutes:       number;
  sessionsByCategory: Record<string, { count: number; minutes: number }>;
  hitCategories:      Category[];
  gapCategories:      { category: Category; needed: number; unit: string }[];
  moodTrend:          { date: string; mood: number; energy: number }[];
  avgMood:            number | null;
  avgEnergy:          number | null;
  dailyMinutes:       { day: string; minutes: number }[];
}

// ─── Category meta ────────────────────────────────────────────────────────────

const CAT_META: Record<Category, { Icon: React.ElementType; color: string; label: string }> = {
  DSA:            { Icon: Code2,      color: "text-blue-500",   label: "DSA"           },
  GD:             { Icon: Users,      color: "text-sage",       label: "Group D."      },
  MOCK_INTERVIEW: { Icon: Briefcase,  color: "text-amber-500",  label: "Mock"          },
  PROJECT_WORK:   { Icon: FolderOpen, color: "text-violet-500", label: "Project"       },
  CURRENT_AFFAIRS:{ Icon: Globe,      color: "text-sky-500",    label: "Curr. Affairs" },
  JAPANESE:       { Icon: Languages,  color: "text-rose-500",   label: "Japanese"      },
  COMMUNICATION:  { Icon: Mic,        color: "text-terracotta", label: "Comm."         },
  READING:        { Icon: BookOpen,   color: "text-ink/50",     label: "Reading"       },
};

// ─── Mood helpers ─────────────────────────────────────────────────────────────

const MOOD_LABELS = ["", "Low", "Meh", "OK", "Good", "Great"];

function moodColor(avg: number | null) {
  if (!avg) return "text-ink/30";
  if (avg >= 4)  return "text-sage";
  if (avg >= 3)  return "text-gold";
  return "text-terracotta";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeeklyPage() {
  const [data, setData]       = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/weekly")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Week range display
  const weekLabel = data
    ? (() => {
        const s = parseISO(data.weekRange.start);
        const e = addDays(s, 6);
        return `${format(s, "d")}–${format(e, "d MMM yyyy")}`;
      })()
    : "—";

  const allCategories = Object.keys(CAT_META) as Category[];

  return (
    <AppShell>
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={14} className="text-ink/35" />
          <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40">
            Week of {weekLabel}
          </p>
        </div>
        <h1 className="font-serif text-[1.75rem] font-semibold text-ink leading-tight">
          Weekly Review
        </h1>
      </div>

      {/* ── Stat pills ── */}
      {loading ? (
        <div className="flex gap-3 mb-5">
          <Skeleton className="h-14 flex-1" rounded="lg" />
          <Skeleton className="h-14 flex-1" rounded="lg" />
          <Skeleton className="h-14 flex-1" rounded="lg" />
        </div>
      ) : (
        <div className="flex gap-3 mb-5">
          {[
            { label: "Sessions",  value: data?.totalSessions ?? 0,                  Icon: Target },
            { label: "Minutes",   value: data?.totalMinutes  ?? 0,                  Icon: Clock  },
            { label: "Avg Mood",  value: data?.avgMood ? `${data.avgMood.toFixed(1)} / 5` : "—", Icon: Smile },
          ].map(({ label, value, Icon }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 bg-white rounded-2xl p-3 shadow-[0_2px_12px_rgba(45,42,38,0.06)] flex flex-col items-center gap-1"
            >
              <Icon size={14} className="text-ink/30" />
              <p className="font-serif text-xl font-semibold text-ink leading-none">{value}</p>
              <p className="text-[10px] font-sans text-ink/35 leading-none">{label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Daily activity bar chart ── */}
      <ChartWrapper
        title="Daily Activity"
        subtitle="Minutes per day this week"
        loading={loading}
        empty={!loading && (data?.dailyMinutes.every((d) => d.minutes === 0) ?? true)}
        emptyMessage="No sessions logged this week yet"
        height={140}
        className="mb-4"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.dailyMinutes} barSize={18}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="day" tick={TICK} axisLine={false} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              content={<WarmTooltip formatter={(v: number) => `${v} min`} />}
              cursor={{ fill: "rgba(107,143,113,0.06)" }}
            />
            <Bar dataKey="minutes" fill={CAT_COLORS.GD} radius={[4, 4, 0, 0]} name="Minutes" />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* ── Category status grid ── */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40">
            Target Status
          </p>
          <div className="flex items-center gap-3 text-[10px] font-sans text-ink/35">
            <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-sage" /> On track</span>
            <span className="flex items-center gap-1"><XCircle size={10} className="text-terracotta/70" /> Behind</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0,1,2,3].map((i) => <Skeleton key={i} className="h-8 w-full" rounded="lg" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {allCategories.map((cat, idx) => {
              const isHit  = data?.hitCategories.includes(cat) ?? false;
              const gap    = data?.gapCategories.find((g) => g.category === cat);
              const stats  = data?.sessionsByCategory[cat];
              const hasTarget = isHit || !!gap;
              if (!hasTarget) return null;
              const { Icon, color, label } = CAT_META[cat];

              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2.5",
                    isHit ? "bg-sage/6" : "bg-terracotta/5",
                  ].join(" ")}
                >
                  <Icon size={15} className={color} strokeWidth={1.8} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink font-sans leading-none">{label}</p>
                    {stats && (
                      <p className="text-[10px] text-ink/40 font-sans mt-0.5 leading-none">
                        {stats.count} session{stats.count !== 1 ? "s" : ""} · {stats.minutes} min
                      </p>
                    )}
                  </div>
                  {isHit ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-sage" />
                      <span className="text-[10px] text-sage font-sans font-medium">Done</span>
                    </div>
                  ) : gap ? (
                    <div className="flex items-center gap-1">
                      <XCircle size={14} className="text-terracotta/70" />
                      <span className="text-[10px] text-terracotta font-sans font-medium">
                        {gap.needed} {gap.unit} short
                      </span>
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
            {!loading && !data?.hitCategories.length && !data?.gapCategories.length && (
              <p className="text-xs text-ink/35 font-sans text-center py-4">
                Set monthly targets in Settings to track weekly progress.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* ── Mood trend ── */}
      {(loading || (data?.moodTrend.length ?? 0) > 0) && (
        <ChartWrapper
          title="Mood This Week"
          subtitle="Daily mood & energy (1–5 scale)"
          loading={loading}
          empty={!loading && (data?.moodTrend.length ?? 0) === 0}
          emptyMessage="No journal entries this week"
          height={160}
          className="mb-4"
          action={
            !loading && data?.avgMood != null ? (
              <div className="text-right">
                <p className={`text-lg font-serif font-semibold ${moodColor(data.avgMood)}`}>
                  {MOOD_LABELS[Math.round(data.avgMood)]}
                </p>
                <p className="text-[10px] text-ink/35 font-sans">avg mood</p>
              </div>
            ) : undefined
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data?.moodTrend.map((m) => ({
                date:   format(parseISO(m.date), "EEE"),
                Mood:   m.mood,
                Energy: m.energy,
              }))}
            >
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={TICK} axisLine={false} tickLine={false} width={16} />
              <Tooltip content={<WarmTooltip />} />
              <Line type="monotone" dataKey="Mood"   stroke={CAT_COLORS.GD}  strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Energy" stroke={CAT_COLORS.MOCK_INTERVIEW} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>
      )}

      {/* ── Focus next week ── */}
      {(loading || (data?.gapCategories.length ?? 0) > 0) && (
        <Card className="mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-terracotta/10 flex items-center justify-center">
              <TrendingUp size={13} className="text-terracotta" />
            </div>
            <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40">
              Focus Next Week
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0,1,2].map((i) => <Skeleton key={i} className="h-10 w-full" rounded="lg" />)}
            </div>
          ) : data?.gapCategories.length === 0 ? (
            <div className="flex items-center gap-2 text-sage">
              <CheckCircle2 size={16} />
              <p className="text-sm font-sans font-medium">All targets on track — great week!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data!.gapCategories.map((g, idx) => {
                const { Icon, color, label } = CAT_META[g.category];
                const isTop = idx === 0;
                return (
                  <motion.div
                    key={g.category}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={[
                      "flex items-center gap-3 rounded-xl px-3 py-2.5",
                      isTop ? "bg-terracotta/8 border border-terracotta/15" : "bg-mist/30",
                    ].join(" ")}
                  >
                    <Icon size={15} className={color} strokeWidth={1.8} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink font-sans">{label}</p>
                        {isTop && (
                          <span className="text-[9px] bg-terracotta/15 text-terracotta font-sans font-semibold rounded-full px-2 py-0.5 uppercase tracking-wide">
                            Top priority
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink/45 font-sans mt-0.5">
                        Aim for {g.needed} more {g.unit} this week
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </AppShell>
  );
}
