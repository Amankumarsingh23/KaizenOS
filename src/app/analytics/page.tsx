"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { TrendingUp, TrendingDown, Clock, Star, Flame } from "lucide-react";

import { AppShell }    from "@/components/layout/AppShell";
import { Badge }       from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton }    from "@/components/ui/Skeleton";
import {
  ChartWrapper, WarmTooltip, CAT_COLORS, PALETTE, TICK, GRID_PROPS,
} from "@/components/charts/ChartWrapper";
import type { Category } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "weekly" | "monthly" | "trends";

interface AnalyticsData {
  overview: {
    scoreTrend: { date: string; score: number | null }[];
    avgScore: number | null;
    activityDistribution: { category: string; minutes: number; sessions: number }[];
    radarData: { category: string; value: number }[];
    heatmapData: { date: string; count: number; dow: number }[];
    categoryProgress: { category: string; current: number; target: number; unit: string }[];
  };
  weekly: {
    thisWeek: Record<string, number | string>[];
    lastWeek: Record<string, number | string>[];
    thisTotal: number;
    lastTotal: number;
    bestDay:  Record<string, number | string> | null;
    worstDay: Record<string, number | string> | null;
  };
  monthly: {
    targetsVsActual: { category: string; target: number; actual: number }[];
    cumulative: { date: string; DSA: number; GD: number; MOCK_INTERVIEW: number }[];
  };
  trends: {
    durationTrend: { week: string; avgMinutes: number; avgRating: number }[];
    timeOfDay: { hour: number; label: string; count: number }[];
  };
}

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview"  },
  { key: "weekly",   label: "Weekly"    },
  { key: "monthly",  label: "Monthly"   },
  { key: "trends",   label: "Trends"    },
];

const RADAR_LABELS: Record<string, string> = {
  DSA: "DSA", GD: "GD", MOCK_INTERVIEW: "Mock",
  PROJECT_WORK: "Project", CURRENT_AFFAIRS: "C.Affairs",
  JAPANESE: "Japanese", COMMUNICATION: "Comm.", READING: "Reading",
};

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function heatColor(count: number) {
  if (count === 0) return "#EDE9E0";
  if (count <= 2)  return "#B8D4BB";
  if (count <= 4)  return "#6B8F71";
  return "#4A6B50";
}

function StreakHeatmap({ data, loading }: {
  data: { date: string; count: number; dow: number }[];
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-28 w-full" rounded="lg" />;
  if (!data.length) return null;

  // Pad start so column 0 = Monday
  const firstDow = data[0].dow; // 0=Mon
  const padded: ({ date: string; count: number } | null)[] = [
    ...Array(firstDow).fill(null),
    ...data,
  ];
  const weeks: ({ date: string; count: number } | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const DAY_LABELS = ["M", "W", "F", "S"];
  const DAY_IDX    = [0, 2, 4, 6];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-ink font-sans">Activity Heatmap</p>
        <p className="text-[11px] text-ink/40 font-sans">Last 90 days</p>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1 pt-[18px] shrink-0">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center">
              {DAY_IDX.includes(i) && (
                <span className="text-[9px] text-ink/30 font-sans">{DAY_LABELS[DAY_IDX.indexOf(i)]}</span>
              )}
            </div>
          ))}
        </div>
        {/* Columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 shrink-0">
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week[di] ?? null;
              return (
                <motion.div
                  key={di}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (wi * 7 + di) * 0.001 }}
                  className="w-3 h-3 rounded-sm"
                  style={{ background: cell ? heatColor(cell.count) : "#F5F0E8" }}
                  title={cell ? `${cell.date}: ${cell.count} sessions` : ""}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-ink/30 font-sans">Less</span>
        {[0, 1, 3, 5].map((v) => (
          <div key={v} className="w-3 h-3 rounded-sm" style={{ background: heatColor(v) }} />
        ))}
        <span className="text-[10px] text-ink/30 font-sans">More</span>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ data, loading }: {
  data: AnalyticsData["overview"] | undefined;
  loading: boolean;
}) {
  const isEmpty = !loading && !data?.scoreTrend.some((d) => d.score !== null);

  return (
    <div className="space-y-4">
      {/* Score trend */}
      <ChartWrapper
        title="Daily Score Trend"
        subtitle="Last 30 days · avg line shown"
        loading={loading}
        empty={isEmpty}
        emptyMessage="No reports yet — log a session to auto-generate"
        height={200}
        action={
          data?.avgScore ? (
            <span className="text-xs font-mono font-semibold text-sage">
              avg {data.avgScore}
            </span>
          ) : undefined
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data?.scoreTrend ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false}
              interval={6} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} domain={[0, 100]} />
            <Tooltip content={(p) => (
              <WarmTooltip {...p} formatter={(v: number) => `${v} pts`} />
            )} />
            {data?.avgScore && (
              <ReferenceLine y={data.avgScore} stroke={PALETTE.gold} strokeDasharray="4 4"
                strokeWidth={1.5} />
            )}
            <Line
              type="monotone" dataKey="score" stroke={PALETTE.sage} strokeWidth={2}
              dot={{ r: 2, fill: PALETTE.sage, strokeWidth: 0 }}
              activeDot={{ r: 4 }} connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Donut + Radar side by side (stack on small) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Activity Donut */}
        <ChartWrapper
          title="Time by Category"
          subtitle="Last 90 days"
          loading={loading}
          empty={!loading && !data?.activityDistribution.length}
          height={200}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data?.activityDistribution ?? []}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={80}
                paddingAngle={3} dataKey="minutes"
                nameKey="category"
              >
                {(data?.activityDistribution ?? []).map((d, i) => (
                  <Cell key={i} fill={CAT_COLORS[d.category] ?? PALETTE.mist} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={(p) => (
                <WarmTooltip {...p} formatter={(v: number) => `${Math.round(v / 60 * 10) / 10}h`} />
              )} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>

        {/* Radar */}
        <ChartWrapper
          title="Growth Wheel"
          subtitle="% of monthly target"
          loading={loading}
          empty={!loading && !data?.radarData.some((d) => d.value > 0)}
          height={200}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={
              (data?.radarData ?? []).map((d) => ({
                ...d,
                category: RADAR_LABELS[d.category] ?? d.category,
              }))
            }>
              <PolarGrid stroke={PALETTE.mist} />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 9, fill: "#8B8075", fontFamily: "var(--font-dm-sans)" }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Achievement"
                dataKey="value"
                stroke={PALETTE.sage}
                fill={PALETTE.sage}
                fillOpacity={0.25}
                dot={{ fill: PALETTE.sage, r: 2 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Heatmap */}
      <StreakHeatmap data={data?.heatmapData ?? []} loading={loading} />

      {/* Category progress bars */}
      {(loading || (data?.categoryProgress.length ?? 0) > 0) && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <p className="text-sm font-semibold text-ink font-sans mb-4">Monthly Progress</p>
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-1.5 w-full" rounded="full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(data?.categoryProgress ?? []).map((p) => (
                <div key={p.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={p.category as Category} />
                      <span className="text-[11px] text-ink/40 font-sans">{p.unit}</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-ink">
                      {p.current}/{p.target}
                    </span>
                  </div>
                  <ProgressBar value={p.current} max={p.target} size="xs"
                    color={p.current / p.target < 0.5 ? "terracotta" : "sage"}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Weekly Tab ───────────────────────────────────────────────────────────────

function WeeklyTab({ data, loading }: {
  data: AnalyticsData["weekly"] | undefined;
  loading: boolean;
}) {
  const isEmpty = !loading && !data?.thisWeek.some((d) => Number(d.total) > 0);
  const diffPct = data && data.lastTotal > 0
    ? Math.round(((data.thisTotal - data.lastTotal) / data.lastTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stat summary */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "This Week",
            value: `${Math.round((data?.thisTotal ?? 0) / 60 * 10) / 10}h`,
            sub: `${data?.thisWeek.length ?? 0} active days`,
            color: "text-sage",
          },
          {
            label: "Last Week",
            value: `${Math.round((data?.lastTotal ?? 0) / 60 * 10) / 10}h`,
            sub: diffPct !== 0 ? `${diffPct > 0 ? "+" : ""}${diffPct}% vs last week` : "No change",
            color: diffPct >= 0 ? "text-sage" : "text-terracotta",
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-1">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className={`text-2xl font-serif font-semibold ${color}`}>{value}</p>
            )}
            <p className="text-[11px] text-ink/40 font-sans mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* This week vs last — grouped bar */}
      <ChartWrapper
        title="This Week vs Last Week"
        subtitle="Minutes per day by category"
        loading={loading}
        empty={isEmpty}
        height={220}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data?.thisWeek ?? []}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="day" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} />
            <Tooltip content={(p) => (
              <WarmTooltip {...p} formatter={(v: number) => `${v} min`} />
            )} />
            {["DSA", "GD", "MOCK_INTERVIEW"].map((cat) => (
              <Bar key={cat} dataKey={cat} stackId="a"
                fill={CAT_COLORS[cat]} radius={cat === "MOCK_INTERVIEW" ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Best / worst day */}
      {!loading && data?.bestDay && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-sage/5 border border-sage/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-sage" />
              <p className="text-[10px] uppercase tracking-widest text-sage font-sans font-medium">Best Day</p>
            </div>
            <p className="font-serif text-xl font-semibold text-ink">{String(data.bestDay.day)}</p>
            <p className="text-xs text-ink/50 font-sans">{Number(data.bestDay.total)} min</p>
          </div>
          {data.worstDay && (
            <div className="bg-terracotta/5 border border-terracotta/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-terracotta" />
                <p className="text-[10px] uppercase tracking-widest text-terracotta font-sans font-medium">Quietest</p>
              </div>
              <p className="font-serif text-xl font-semibold text-ink">{String(data.worstDay.day)}</p>
              <p className="text-xs text-ink/50 font-sans">{Number(data.worstDay.total)} min</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Monthly Tab ──────────────────────────────────────────────────────────────

function MonthlyTab({ data, loading }: {
  data: AnalyticsData["monthly"] | undefined;
  loading: boolean;
}) {
  const isEmpty = !loading && !data?.targetsVsActual.some((d) => d.target > 0);

  return (
    <div className="space-y-4">
      {/* Targets vs actual */}
      <ChartWrapper
        title="Targets vs Actual"
        subtitle="This month"
        loading={loading}
        empty={isEmpty}
        emptyMessage="Set monthly targets in Settings → Targets"
        height={220}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data?.targetsVsActual ?? []}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            layout="vertical"
          >
            <CartesianGrid stroke="#E8E2D8" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis dataKey="category" type="category"
              tick={{ fontSize: 9, fill: "#8B8075", fontFamily: "var(--font-dm-sans)" }}
              tickLine={false} axisLine={false} width={60}
            />
            <Tooltip content={(p) => <WarmTooltip {...p} />} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-dm-sans)" }} />
            <Bar dataKey="target" name="Target" fill={PALETTE.mist}     radius={[0, 4, 4, 0]} />
            <Bar dataKey="actual" name="Actual" fill={PALETTE.sage}     radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Cumulative DSA / GD / Mock this month */}
      <ChartWrapper
        title="Cumulative Progress"
        subtitle="Running total this month · DSA / GD / Mock"
        loading={loading}
        empty={!loading && !data?.cumulative.some(
          (d) => d.DSA > 0 || d.GD > 0 || d.MOCK_INTERVIEW > 0
        )}
        emptyMessage="No DSA, GD or Mock sessions logged this month"
        height={200}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data?.cumulative ?? []}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <defs>
              {[
                { id: "dsa",  color: CAT_COLORS.DSA },
                { id: "gd",   color: CAT_COLORS.GD  },
                { id: "mock", color: CAT_COLORS.MOCK_INTERVIEW },
              ].map(({ id, color }) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} />
            <Tooltip content={(p) => <WarmTooltip {...p} />} />
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-dm-sans)" }} />
            <Area type="monotone" dataKey="DSA" name="DSA"
              stroke={CAT_COLORS.DSA} fill="url(#dsa)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="GD"  name="GD"
              stroke={CAT_COLORS.GD}  fill="url(#gd)"  strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="MOCK_INTERVIEW" name="Mock"
              stroke={CAT_COLORS.MOCK_INTERVIEW} fill="url(#mock)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </div>
  );
}

// ─── Trends Tab ───────────────────────────────────────────────────────────────

function TrendsTab({ data, loading }: {
  data: AnalyticsData["trends"] | undefined;
  loading: boolean;
}) {
  const isEmpty = !loading && !data?.durationTrend.length;

  // Time-of-day: show only hours 6-23 for clarity
  const hourData = (data?.timeOfDay ?? []).filter((d) => d.hour >= 6 || d.count > 0);
  const maxCount = Math.max(...hourData.map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      {/* Duration + Rating dual-axis */}
      <ChartWrapper
        title="Session Quality Trend"
        subtitle="Avg duration & self-rating by week"
        loading={loading}
        empty={isEmpty}
        height={200}
        action={
          <div className="flex items-center gap-3 text-[10px] font-sans">
            <span className="flex items-center gap-1"><Clock size={10} className="text-gold" /> Duration</span>
            <span className="flex items-center gap-1"><Star  size={10} className="text-sage" /> Rating</span>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data?.durationTrend ?? []}
            margin={{ top: 4, right: 16, bottom: 0, left: -20 }}
          >
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} interval={1} />
            <YAxis yAxisId="min" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis yAxisId="rating" orientation="right" domain={[1, 5]}
              tick={TICK} tickLine={false} axisLine={false} />
            <Tooltip content={(p) => (
              <WarmTooltip {...p} formatter={(v: number, name: string) =>
                name === "Avg Duration" ? `${v} min` : `${v}/5`
              } />
            )} />
            <Line yAxisId="min"    type="monotone" dataKey="avgMinutes"
              name="Avg Duration" stroke={PALETTE.gold}  strokeWidth={2}
              dot={{ r: 2, fill: PALETTE.gold, strokeWidth: 0 }} />
            <Line yAxisId="rating" type="monotone" dataKey="avgRating"
              name="Avg Rating"   stroke={PALETTE.sage}  strokeWidth={2}
              dot={{ r: 2, fill: PALETTE.sage, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Time-of-day heatmap — custom grid */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-ink font-sans">Productive Hours</p>
          <p className="text-[11px] text-ink/40 font-sans">When you study most</p>
        </div>
        {loading ? (
          <Skeleton className="h-16 w-full" rounded="lg" />
        ) : (
          <div className="space-y-2">
            {/* Bar visualization */}
            <div className="flex items-end gap-0.5 h-16">
              {hourData.map((h) => (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    className="w-full rounded-t-sm"
                    style={{
                      background: h.count > 0 ? PALETTE.sage : PALETTE.mist,
                      opacity: h.count > 0 ? 0.3 + (h.count / maxCount) * 0.7 : 1,
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (h.count / maxCount) * 56)}px` }}
                    transition={{ duration: 0.6, delay: h.hour * 0.02 }}
                    title={`${h.label}: ${h.count} sessions`}
                  />
                </div>
              ))}
            </div>
            {/* Hour labels — show every 3 hours */}
            <div className="flex gap-0.5">
              {hourData.map((h) => (
                <div key={h.hour} className="flex-1 text-center">
                  {h.hour % 4 === 0 && (
                    <span className="text-[9px] text-ink/30 font-sans">{h.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && data?.timeOfDay && (() => {
          const peak = [...(data.timeOfDay)].sort((a, b) => b.count - a.count)[0];
          return peak?.count > 0 ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-ink/50 font-sans">
              <Flame size={12} className="text-gold" />
              Peak productivity around <strong className="text-ink">{peak.label}</strong>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [tab, setTab]         = useState<Tab>("overview");
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      {/* Page title */}
      <div className="mb-5">
        <h1 className="font-serif text-3xl font-semibold text-ink">
          Your <em>Patterns.</em>
        </h1>
        <p className="text-sm text-ink/40 font-sans mt-1">
          Data-driven insight into your progress
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-mist/50 rounded-2xl p-1 mb-5">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="relative flex-1 py-2 text-sm font-medium font-sans rounded-xl transition-colors"
            style={{ color: tab === key ? "#2D2A26" : "#8B8075" }}
          >
            {tab === key && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 bg-white rounded-xl shadow-[0_1px_4px_rgba(45,42,38,0.10)]"
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "overview" && <OverviewTab data={data?.overview}  loading={loading} />}
          {tab === "weekly"   && <WeeklyTab   data={data?.weekly}    loading={loading} />}
          {tab === "monthly"  && <MonthlyTab  data={data?.monthly}   loading={loading} />}
          {tab === "trends"   && <TrendsTab   data={data?.trends}    loading={loading} />}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
