"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Clock, Zap, Crown, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";

interface LeaderRow {
  id: string; name: string; image: string | null; isYou: boolean;
  sessionCount: number; totalMinutes: number; bestStreak: number;
  activeStreaks: number; topStreak: { category: string; days: number } | null;
}

const RANK_COLORS = ["text-yellow-500", "text-slate-400", "text-amber-600"];
const RANK_ICONS  = ["🥇", "🥈", "🥉"];

const CAT_SHORT: Record<string, string> = {
  DSA: "DSA", GD: "GD", MOCK_INTERVIEW: "Mock", PROJECT_WORK: "Proj",
  CURRENT_AFFAIRS: "CA", JAPANESE: "JP", COMMUNICATION: "Comm", READING: "Read",
};

function Avatar({ name, image, size = 40 }: { name: string; image: string | null; size?: number }) {
  if (image) return <img src={image} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-gradient-to-br from-gold to-sage flex items-center justify-center text-white font-semibold font-serif"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function LeaderboardPage() {
  const [rows, setRows]     = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json()).then(setRows).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const youRow = rows.find((r) => r.isYou);
  const youRank = rows.findIndex((r) => r.isYou) + 1;

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-ink">Accountability <em>Board.</em></h1>
        <p className="text-sm text-ink/40 font-sans mt-1">This week · only public profiles are shown</p>
      </div>

      {/* Your rank banner (if not top) */}
      {!loading && youRow && youRank > 3 && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          className="bg-sage/10 border border-sage/20 rounded-2xl p-4 mb-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center font-serif text-lg font-semibold text-sage">
            {youRank}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink font-sans">You're #{youRank} this week</p>
            <p className="text-xs text-ink/40 font-sans">{youRow.totalMinutes} min · {youRow.sessionCount} sessions · {youRow.activeStreaks} active streaks</p>
          </div>
          <div className="text-2xl">
            {youRow.activeStreaks >= 4 ? "🔥" : youRow.sessionCount >= 5 ? "💪" : "📚"}
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-20" rounded="lg" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <Users size={32} className="text-ink/15 mx-auto mb-3" />
          <p className="text-sm text-ink/40 font-sans">No public profiles yet</p>
          <p className="text-xs text-ink/25 font-sans mt-1">Enable your public profile in Settings to appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => {
            const rank     = i + 1;
            const isTop3   = rank <= 3;
            const hoursStr = `${Math.round(row.totalMinutes / 60 * 10) / 10}h`;

            return (
              <motion.div key={row.id}
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)] border transition-all ${
                  row.isYou ? "border-sage/30 shadow-[0_2px_16px_rgba(107,143,113,0.15)]" : "border-transparent"
                }`}>
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {isTop3
                      ? <span className="text-xl">{RANK_ICONS[rank-1]}</span>
                      : <span className="font-serif text-lg font-semibold text-ink/30">{rank}</span>}
                  </div>

                  {/* Avatar */}
                  <Avatar name={row.name} image={row.image} size={40} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold font-sans text-ink truncate">{row.name}</p>
                      {row.isYou && <span className="text-[10px] bg-sage/15 text-sage px-2 py-0.5 rounded-full font-sans font-medium">You</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-ink/40 font-sans">
                        <Clock size={10} /> {hoursStr}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-ink/40 font-sans">
                        <Zap size={10} /> {row.sessionCount} sessions
                      </span>
                      {row.topStreak && row.topStreak.days > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-gold font-sans">
                          <Flame size={10} /> {row.topStreak.days}d {CAT_SHORT[row.topStreak.category] ?? row.topStreak.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active streaks badge */}
                  {row.activeStreaks > 0 && (
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="text-lg">{"🔥".repeat(Math.min(row.activeStreaks, 3))}</div>
                      <p className="text-[9px] text-ink/30 font-sans">{row.activeStreaks} active</p>
                    </div>
                  )}
                </div>

                {/* Mini progress bar based on rank 1's minutes */}
                {rows.length > 0 && (
                  <div className="mt-3 h-1 bg-mist rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width:0 }}
                      animate={{ width: `${rows[0].totalMinutes > 0 ? (row.totalMinutes / rows[0].totalMinutes) * 100 : 0}%` }}
                      transition={{ delay: i * 0.05 + 0.2 }}
                      className={`h-full rounded-full ${row.isYou ? "bg-sage" : "bg-mist/80 border-t border-ink/10"}`}
                      style={{ background: isTop3 ? ["#C4A35A","#94A3B8","#C47D5A"][rank-1] : row.isYou ? "#6B8F71" : "#D4CEC5" }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      <div className="mt-8 bg-mist/30 rounded-2xl p-4">
        <p className="text-xs text-ink/40 font-sans text-center leading-relaxed">
          Only sessions, streaks and study time are shared. Journal, placement pipeline and AI reports are always private.
          {" "}<a href="/settings" className="text-sage underline">Enable public profile</a> in Settings.
        </p>
      </div>
    </AppShell>
  );
}
