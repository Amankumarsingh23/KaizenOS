"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
  Bell, BellOff, ExternalLink, Clock, Trophy,
  TrendingUp, TrendingDown, Minus, RefreshCw, Settings,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { AppShell }    from "@/components/layout/AppShell";
import { Skeleton }    from "@/components/ui/Skeleton";
import { WarmTooltip, TICK, GRID_PROPS } from "@/components/charts/ChartWrapper";
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
  const [contests, setContests]     = useState<Contest[]>([]);
  const [profile, setProfile]       = useState<CFProfile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [profileLoading, setPL]     = useState(true);
  const [noHandle, setNoHandle]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

      {/* CF Profile — Phase 3 */}
      {!profileLoading && profile && <CFProfileSection profile={profile} />}

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
