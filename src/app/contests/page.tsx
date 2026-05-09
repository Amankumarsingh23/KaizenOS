"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
  Bell, BellOff, ExternalLink, Clock, Trophy,
  TrendingUp, TrendingDown, Minus, RefreshCw, Settings,
  Zap, BarChart2, CheckCircle2, Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from "recharts";
import { AppShell }    from "@/components/layout/AppShell";
import { Skeleton }    from "@/components/ui/Skeleton";
import { WarmTooltip, TICK, GRID_PROPS, PALETTE } from "@/components/charts/ChartWrapper";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contest {
  id: number; name: string; divLabel: string; type: string;
  startTime: number; durationMin: number; reminderSet: boolean;
}
interface CFProfile {
  handle: string; rating: number; maxRating: number;
  rank: string; maxRank: string; totalContests: number;
  recentContests: {
    contestId: number; contestName: string; rank: number;
    oldRating: number; newRating: number; delta: number; date: string;
  }[];
}
interface CFProblemStats {
  handle: string; totalSubmissions: number; totalSolved: number;
  acceptanceRate: number; currentStreak: number;
  difficultyBreakdown: { label: string; count: number }[];
  tagPerformance:      { tag: string; count: number; mapped: string | null }[];
  skillSuggestions:    Record<string, { count: number; level: number }>;
  calendar:            { date: string; count: number; dow: number }[];
}

// ─── CF rating helpers ────────────────────────────────────────────────────────

function ratingColor(r: number) {
  if (r >= 2400) return "text-red-500";
  if (r >= 2100) return "text-orange-500";
  if (r >= 1900) return "text-violet-500";
  if (r >= 1600) return "text-blue-500";
  if (r >= 1400) return "text-cyan-500";
  if (r >= 1200) return "text-green-500";
  return "text-ink/40";
}
function ratingLabel(r: number) {
  if (r >= 2400) return "Grandmaster";
  if (r >= 2100) return "Master";
  if (r >= 1900) return "Candidate Master";
  if (r >= 1600) return "Expert";
  if (r >= 1400) return "Specialist";
  if (r >= 1200) return "Pupil";
  return "Newbie";
}
function ratingBg(r: number) {
  if (r >= 2400) return "bg-red-50 border-red-200";
  if (r >= 2100) return "bg-orange-50 border-orange-200";
  if (r >= 1900) return "bg-violet-50 border-violet-200";
  if (r >= 1600) return "bg-blue-50 border-blue-200";
  if (r >= 1400) return "bg-cyan-50 border-cyan-200";
  if (r >= 1200) return "bg-green-50 border-green-200";
  return "bg-mist/40 border-mist";
}

function divColor(label: string) {
  if (label === "Div.1")   return "bg-red-50 text-red-600 border-red-100";
  if (label === "Div.1+2") return "bg-orange-50 text-orange-600 border-orange-100";
  if (label === "Div.2")   return "bg-blue-50 text-blue-600 border-blue-100";
  if (label === "Div.3")   return "bg-green-50 text-green-600 border-green-100";
  if (label === "Div.4")   return "bg-sage/10 text-sage border-sage/20";
  if (label === "Educational") return "bg-violet-50 text-violet-600 border-violet-100";
  if (label === "Global")  return "bg-amber-50 text-amber-600 border-amber-100";
  return "bg-mist text-ink/50 border-mist";
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(startTimeMs: number) {
  const [diff, setDiff] = useState(startTimeMs - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(startTimeMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [startTimeMs]);

  if (diff <= 0) return { label: "Live now", urgent: true };

  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins  = Math.floor((diff % 3_600_000)  / 60_000);
  const secs  = Math.floor((diff % 60_000)     / 1_000);

  if (days > 0)   return { label: `${days}d ${hours}h ${mins}m`, urgent: false };
  if (hours > 0)  return { label: `${hours}h ${mins}m ${secs}s`, urgent: hours < 3 };
  return { label: `${mins}m ${secs}s`, urgent: true };
}

// ─── Submission Heatmap ───────────────────────────────────────────────────────

function SubmissionHeatmap({ calendar }: { calendar: CFProblemStats["calendar"] }) {
  const firstDow = calendar[0]?.dow ?? 0;
  const padded: (typeof calendar[0] | null)[] = [...Array(firstDow).fill(null), ...calendar];
  const weeks: (typeof calendar[0] | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  function heatColor(count: number) {
    if (count === 0) return "#EDE9E0";
    if (count <= 2)  return "#B8D4BB";
    if (count <= 5)  return "#6B8F71";
    if (count <= 10) return "#4A6B50";
    return "#2D4A33";
  }

  const DAY_LABELS = ["M","W","F","S"];
  const DAY_IDX    = [0, 2, 4, 6];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
      <p className="text-sm font-semibold text-ink font-sans mb-3">Submission Activity <span className="text-[11px] font-normal text-ink/35">last 365 days</span></p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <div className="flex flex-col gap-1 mr-1 pt-5 shrink-0">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center">
              {DAY_IDX.includes(i) && <span className="text-[9px] text-ink/30 font-sans">{DAY_LABELS[DAY_IDX.indexOf(i)]}</span>}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 shrink-0">
            {wi % 4 === 0 && week[0] && (
              <div className="h-4 flex items-end mb-0.5">
                <span className="text-[8px] text-ink/25 font-sans">{format(new Date(week[0].date), "MMM")}</span>
              </div>
            )}
            {wi % 4 !== 0 && <div className="h-4 mb-0.5" />}
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week[di] ?? null;
              return (
                <div key={di} className="w-3 h-3 rounded-sm cursor-default"
                  style={{ background: cell ? heatColor(cell.count) : "#F5F0E8" }}
                  title={cell ? `${cell.date}: ${cell.count} submission${cell.count !== 1 ? "s" : ""}` : ""}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] text-ink/30 font-sans">Less</span>
        {[0,1,3,6,11].map((v) => (
          <div key={v} className="w-3 h-3 rounded-sm" style={{ background: heatColor(v) }} />
        ))}
        <span className="text-[10px] text-ink/30 font-sans">More</span>
      </div>
    </div>
  );
}

// ─── CF Problem Stats Section ─────────────────────────────────────────────────

function CFProblemStatsSection({ stats }: { stats: CFProblemStats }) {
  const [syncing, setSyncing]   = useState(false);
  const [synced, setSynced]     = useState(false);
  const maxCount = Math.max(...stats.difficultyBreakdown.map((d) => d.count), 1);

  async function syncToSkillMap() {
    setSyncing(true);
    const entries = Object.entries(stats.skillSuggestions);
    await Promise.all(entries.map(([topic, { level }]) =>
      fetch("/api/skills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level }),
      })
    ));
    setSynced(true);
    setSyncing(false);
    setTimeout(() => setSynced(false), 3000);
  }

  const DIFF_COLORS: Record<string, string> = {
    "< 1000": "#8B8075", "1000": "#22c55e", "1200": "#06b6d4",
    "1400": "#3b82f6", "1600": "#8b5cf6", "1800": "#f59e0b",
    "2000": "#f97316", "2200": "#ef4444", "2400+": "#991b1b",
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Solved",    value: stats.totalSolved,     color: "text-sage"       },
          { label: "AC Rate",   value: `${stats.acceptanceRate}%`, color: "text-blue-500" },
          { label: "Submitted", value: stats.totalSubmissions, color: "text-ink"        },
          { label: "Streak",    value: `${stats.currentStreak}d`, color: "text-gold"   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
            <p className={`font-serif text-xl font-semibold ${color}`}>{value}</p>
            <p className="text-[9px] text-ink/35 font-sans mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Difficulty breakdown */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
        <p className="text-sm font-semibold text-ink font-sans mb-4">Problems by Difficulty</p>
        <div className="space-y-2">
          {stats.difficultyBreakdown.filter((d) => d.count > 0).map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-semibold w-12 shrink-0" style={{ color: DIFF_COLORS[d.label] ?? "#6B8F71" }}>
                {d.label}
              </span>
              <div className="flex-1 h-5 bg-mist/40 rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-lg flex items-center px-2"
                  style={{ background: DIFF_COLORS[d.label] ?? "#6B8F71", opacity: 0.8 }}
                >
                  <span className="text-[9px] text-white font-semibold font-mono">{d.count}</span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tag performance */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
        <p className="text-sm font-semibold text-ink font-sans mb-4">Top Problem Tags</p>
        <div className="flex flex-wrap gap-2">
          {stats.tagPerformance.map(({ tag, count, mapped }) => (
            <div key={tag}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs font-sans ${
                mapped ? "bg-sage/8 border-sage/20 text-sage" : "bg-mist/40 border-mist text-ink/40"
              }`}>
              <span>{tag}</span>
              <span className={`font-mono font-semibold text-[10px] ${mapped ? "text-sage" : "text-ink/30"}`}>{count}</span>
            </div>
          ))}
        </div>
        {Object.keys(stats.skillSuggestions).length > 0 && (
          <p className="text-[10px] text-ink/30 font-sans mt-3">
            ✦ Highlighted tags map to your DSA Skill Map
          </p>
        )}
      </div>

      {/* Submission heatmap */}
      <SubmissionHeatmap calendar={stats.calendar} />

      {/* Sync to Skill Map CTA */}
      {Object.keys(stats.skillSuggestions).length > 0 && (
        <div className="bg-gradient-to-br from-sage/8 to-sage/4 border border-sage/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-sage/15 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={16} className="text-sage" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink font-sans">Sync to DSA Skill Map</p>
              <p className="text-xs text-ink/50 font-sans mt-1 leading-relaxed">
                Based on your {stats.totalSolved} solved problems across CF tags,
                {" "}{Object.keys(stats.skillSuggestions).length} topics can be auto-rated on your skill map.
                Solves 1–5 → Practicing · 6–20 → Comfortable · 21–50 → Strong · 50+ → Mastered.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
                {Object.entries(stats.skillSuggestions).slice(0, 8).map(([topic, { level, count }]) => {
                  const LEVEL_LABELS = ["","Practicing","Comfortable","Strong","Mastered"];
                  const LEVEL_COLORS = ["","text-blue-500","text-amber-500","text-sage","text-violet-600"];
                  return (
                    <span key={topic} className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-white border border-mist ${LEVEL_COLORS[level]}`}>
                      {topic} → {LEVEL_LABELS[level]} ({count})
                    </span>
                  );
                })}
              </div>
              <button onClick={syncToSkillMap} disabled={syncing || synced}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold font-sans transition-all ${
                  synced ? "bg-sage/15 text-sage" : "bg-sage text-white hover:bg-sage/90 shadow-[0_2px_8px_rgba(107,143,113,0.30)]"
                } disabled:opacity-60`}>
                {synced ? <><CheckCircle2 size={14}/> Synced!</> :
                 syncing ? "Syncing…" : <><Zap size={14}/> Auto-fill Skill Map</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contest Card ─────────────────────────────────────────────────────────────

function ContestCard({ contest, onToggleReminder }: {
  contest: Contest;
  onToggleReminder: (c: Contest) => void;
}) {
  const { label: countdown, urgent } = useCountdown(contest.startTime);
  const startDate = new Date(contest.startTime);

  return (
    <motion.div layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className={`bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)] border transition-all ${
        urgent ? "border-terracotta/30" : "border-transparent"
      }`}>
      <div className="flex items-start gap-3">
        {/* Div label */}
        <div className={`shrink-0 text-[10px] font-semibold font-sans border rounded-lg px-2 py-1 ${divColor(contest.divLabel)}`}>
          {contest.divLabel}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink font-sans leading-snug line-clamp-2">{contest.name}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={`font-mono text-xs font-bold ${urgent ? "text-terracotta" : "text-sage"}`}>
              {countdown}
            </span>
            <span className="text-[11px] text-ink/35 font-sans flex items-center gap-1">
              <Clock size={10} /> {Math.floor(contest.durationMin / 60)}h{contest.durationMin % 60 > 0 ? ` ${contest.durationMin % 60}m` : ""}
            </span>
            <span className="text-[11px] text-ink/35 font-sans">
              {format(startDate, "d MMM, h:mm a")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Register link */}
          <a href={`https://codeforces.com/contest/${contest.id}`} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-ink/30 hover:text-ink/60 hover:bg-mist/50 transition-colors">
            <ExternalLink size={13} />
          </a>
          {/* Reminder toggle */}
          <button onClick={() => onToggleReminder(contest)}
            className={`p-1.5 rounded-lg transition-all ${
              contest.reminderSet
                ? "bg-sage/15 text-sage"
                : "text-ink/25 hover:text-ink/50 hover:bg-mist/50"
            }`}
            title={contest.reminderSet ? "Reminder set — tap to remove" : "Set reminder (1h before)"}>
            {contest.reminderSet ? <Bell size={14} /> : <BellOff size={14} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── CF Profile Section ───────────────────────────────────────────────────────

function CFProfileSection({ profile }: { profile: CFProfile }) {
  const chartData = profile.recentContests.map((c) => ({
    name:   c.contestName.slice(0, 20),
    rating: c.newRating,
    delta:  c.delta,
    rank:   c.rank,
  }));

  return (
    <div className="space-y-4 mb-6">
      {/* Profile card */}
      <div className={`rounded-2xl border p-5 ${ratingBg(profile.rating)}`}>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-bold text-ink">{profile.handle}</p>
              <a href={`https://codeforces.com/profile/${profile.handle}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={12} className="text-ink/30" />
              </a>
            </div>
            <p className={`font-serif text-3xl font-bold mt-1 ${ratingColor(profile.rating)}`}>
              {profile.rating}
            </p>
            <p className={`text-sm font-sans font-medium ${ratingColor(profile.rating)}`}>
              {ratingLabel(profile.rating)}
            </p>
          </div>
          <div className="text-right space-y-1">
            <div>
              <p className="text-[10px] text-ink/40 font-sans">Max Rating</p>
              <p className={`text-lg font-serif font-semibold ${ratingColor(profile.maxRating)}`}>{profile.maxRating}</p>
              <p className={`text-xs font-sans ${ratingColor(profile.maxRating)}`}>{ratingLabel(profile.maxRating)}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t border-ink/10">
          <div className="text-center">
            <p className="font-serif text-xl font-semibold text-ink">{profile.totalContests}</p>
            <p className="text-[10px] text-ink/40 font-sans">Contests</p>
          </div>
          {profile.recentContests.length > 0 && (() => {
            const last = profile.recentContests[profile.recentContests.length - 1];
            return (
              <div className="text-center">
                <p className={`font-serif text-xl font-semibold ${last.delta >= 0 ? "text-sage" : "text-terracotta"}`}>
                  {last.delta >= 0 ? "+" : ""}{last.delta}
                </p>
                <p className="text-[10px] text-ink/40 font-sans">Last Change</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Rating history chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <p className="text-sm font-semibold text-ink font-sans mb-4">
            Rating History <span className="text-[11px] font-normal text-ink/35">last {chartData.length} contests</span>
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={false}
                interval={Math.floor(chartData.length / 4)} />
              <YAxis tick={TICK} tickLine={false} axisLine={false}
                domain={['auto','auto']} />
              <Tooltip content={(p) => (
                <WarmTooltip {...p} formatter={(v: number, name: string) =>
                  name === "rating" ? `${v} (Rank #${p?.payload?.[0]?.payload?.rank ?? "?"})` : `${v > 0 ? "+" : ""}${v}`
                } />
              )} />
              {/* Color bands */}
              {[
                { y: 1200, color: "#22c55e20" }, { y: 1400, color: "#06b6d420" },
                { y: 1600, color: "#3b82f620" }, { y: 1900, color: "#8b5cf620" },
                { y: 2100, color: "#f9731620" }, { y: 2400, color: "#ef444420" },
              ].map(({ y, color }) => (
                <ReferenceLine key={y} y={y} stroke={color} strokeWidth={12} strokeDasharray="" />
              ))}
              <Line type="monotone" dataKey="rating" name="rating" stroke="#6B8F71"
                strokeWidth={2.5} dot={{ r:3, fill:"#6B8F71", strokeWidth:0 }}
                activeDot={{ r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent contests table */}
      {profile.recentContests.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <p className="text-sm font-semibold text-ink font-sans mb-3">Recent Contests</p>
          <div className="space-y-2">
            {[...profile.recentContests].reverse().slice(0, 8).map((c) => (
              <div key={c.contestId} className="flex items-center gap-3 py-1.5 border-b border-mist/40 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-sans text-ink truncate">{c.contestName}</p>
                  <p className="text-[10px] text-ink/35 font-sans">{format(new Date(c.date), "d MMM yyyy")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-semibold text-ink">#{c.rank}</p>
                  <p className={`text-[10px] font-mono font-semibold ${c.delta >= 0 ? "text-sage" : "text-terracotta"}`}>
                    {c.delta >= 0 ? "+" : ""}{c.delta}
                  </p>
                </div>
                <div className="w-6 shrink-0 flex justify-center">
                  {c.delta > 0  ? <TrendingUp  size={12} className="text-sage" /> :
                   c.delta < 0  ? <TrendingDown size={12} className="text-terracotta" /> :
                                  <Minus size={12} className="text-ink/25" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContestsPage() {
  const [contests, setContests]       = useState<Contest[]>([]);
  const [profile, setProfile]         = useState<CFProfile | null>(null);
  const [problemStats, setProblemStats] = useState<CFProblemStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [profileLoading, setPL]       = useState(true);
  const [statsLoading, setSL]         = useState(true);
  const [noHandle, setNoHandle]       = useState(false);
  const [refreshing, setRefreshing]   = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    const res = await fetch("/api/contests/upcoming");
    if (res.ok) setContests(await res.json());
    setLoading(false);
    if (refresh) setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/contests/profile").then(async (r) => {
      const d = await r.json();
      if (d.handle === null) { setNoHandle(true); }
      else if (d.handle)     { setProfile(d); }
    }).catch(console.error).finally(() => setPL(false));

    fetch("/api/contests/problems").then(async (r) => {
      const d = await r.json();
      if (d.handle) setProblemStats(d);
    }).catch(console.error).finally(() => setSL(false));
  }, [load]);

  async function toggleReminder(contest: Contest) {
    if (contest.reminderSet) {
      await fetch("/api/contests/remind", {
        method: "DELETE", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ contestId: contest.id }),
      });
      setContests((prev) => prev.map((c) => c.id === contest.id ? { ...c, reminderSet: false } : c));
    } else {
      const res = await fetch("/api/contests/remind", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ contestId: contest.id, contestName: contest.name, startTimeMs: contest.startTime }),
      });
      if (res.ok) {
        setContests((prev) => prev.map((c) => c.id === contest.id ? { ...c, reminderSet: true } : c));
      }
    }
  }

  const nextContest = contests[0];

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">CF <em>Contests.</em></h1>
          <p className="text-sm text-ink/40 font-sans mt-1">Upcoming rounds · set bell reminders</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="p-2 text-ink/30 hover:text-ink/60 transition-colors disabled:opacity-40">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Next contest hero */}
      {!loading && nextContest && (() => {
        const { label, urgent } = {
          label: formatDistanceToNow(new Date(nextContest.startTime), { addSuffix: true }),
          urgent: nextContest.startTime - Date.now() < 3 * 3_600_000,
        };
        return (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className={`rounded-2xl p-5 mb-5 ${urgent ? "bg-terracotta/5 border border-terracotta/20" : "bg-sage/5 border border-sage/15"}`}>
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-1">Next Contest</p>
            <p className="font-sans font-semibold text-sm text-ink mb-1">{nextContest.name}</p>
            <div className="flex items-center gap-3">
              <span className={`font-mono text-2xl font-bold ${urgent ? "text-terracotta" : "text-sage"}`}>
                {(() => {
                  const diff = nextContest.startTime - Date.now();
                  if (diff <= 0) return "Live!";
                  const d = Math.floor(diff / 86_400_000);
                  const h = Math.floor((diff % 86_400_000) / 3_600_000);
                  const m = Math.floor((diff % 3_600_000) / 60_000);
                  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
                })()}
              </span>
              <span className="text-xs text-ink/40 font-sans">{format(new Date(nextContest.startTime), "EEE d MMM, h:mm a")}</span>
            </div>
          </motion.div>
        );
      })()}

      {/* CF Profile — rating history */}
      {!profileLoading && profile && <CFProfileSection profile={profile} />}

      {/* CF Problem Stats — Phase 3 */}
      {statsLoading && profile && (
        <div className="space-y-3 mb-6">
          {[0,1,2].map((i) => <Skeleton key={i} className="h-32" rounded="lg" />)}
        </div>
      )}
      {!statsLoading && problemStats && <CFProblemStatsSection stats={problemStats} />}

      {/* No handle prompt */}
      {!profileLoading && noHandle && (
        <div className="bg-mist/30 border border-mist rounded-2xl p-4 mb-5 flex items-center gap-3">
          <Trophy size={18} className="text-ink/20 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-sans text-ink/60">Connect your Codeforces account to see your rating history and past contests</p>
          </div>
          <Link href="/settings" className="shrink-0 text-xs font-semibold font-sans text-sage flex items-center gap-1 hover:underline">
            <Settings size={12}/> Settings
          </Link>
        </div>
      )}

      {/* Upcoming contests */}
      <div>
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-3">
          Upcoming Contests
        </p>
        {loading ? (
          <div className="space-y-3">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-20" rounded="lg"/>)}</div>
        ) : contests.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-ink/30 font-sans">No upcoming contests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contests.map((c) => (
              <ContestCard key={c.id} contest={c} onToggleReminder={toggleReminder} />
            ))}
          </div>
        )}
      </div>

      {/* Reminder info */}
      <div className="mt-6 bg-parchment border border-mist/60 rounded-2xl p-4">
        <p className="text-xs text-ink/40 font-sans leading-relaxed">
          <span className="font-semibold text-ink/60">🔔 Reminders</span> — tap the bell on any contest.
          You'll get a push notification ~1 hour before it starts (requires notification permission).
          Reminders run daily at 8 AM IST via scheduled job.
        </p>
      </div>
    </AppShell>
  );
}
