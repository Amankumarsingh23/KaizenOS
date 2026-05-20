"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Coins, Snowflake, TrendingUp, Gift, Send } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { getLeagueTier } from "@/lib/xp";
import type { BadgeDef } from "@/lib/badges";

// ─── Types ────────────────────────────────────────────────────────────────────

interface XpData {
  xp: number; coins: number; level: number; levelTitle: string;
  levelProgress: { current: number; nextAt: number; pct: number };
  weeklyXp: number; streakFreezes: number;
  league: { name: string; color: string; emoji: string };
}
interface BadgeWithStatus extends BadgeDef { earned: boolean; earnedAt: string | null; }

const RARITY_COLORS: Record<string, string> = {
  common:    "border-mist bg-mist/30",
  rare:      "border-blue-200 bg-blue-50",
  epic:      "border-violet-200 bg-violet-50",
  legendary: "border-gold/40 bg-gold/8",
};
const RARITY_LABEL_COLORS: Record<string, string> = {
  common: "text-ink/40", rare: "text-blue-500", epic: "text-violet-600", legendary: "text-gold",
};
const CATEGORIES = ["streak","dsa","volume","consistency","gd","social","special"] as const;
const CAT_LABELS: Record<string, string> = {
  streak:"🔥 Streaks", dsa:"💻 DSA", volume:"📊 Volume",
  consistency:"📅 Consistency", gd:"🎤 GD", social:"🤝 Social", special:"⭐ Special",
};

// ─── XP Card ──────────────────────────────────────────────────────────────────

function XpCard({ data }: { data: XpData }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(45,42,38,0.10)] mb-5">
      {/* Level + title */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans">Level {data.level}</p>
          <p className="font-serif text-2xl font-semibold text-ink">{data.levelTitle}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl">{data.league.emoji}</p>
          <p className={`text-xs font-semibold font-sans ${data.league.color}`}>{data.league.name} League</p>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs font-sans text-ink/40 mb-1.5">
          <span>{data.levelProgress.current.toLocaleString()} XP</span>
          <span>{data.levelProgress.nextAt.toLocaleString()} to next level</span>
        </div>
        <div className="h-3 bg-mist rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.levelProgress.pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-sage to-gold"
          />
        </div>
        <p className="text-[10px] text-ink/30 font-sans mt-1">{data.levelProgress.pct}% to Level {data.level + 1}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: <Zap size={14} className="text-gold" />,          label: "Total XP",    value: data.xp.toLocaleString()    },
          { icon: <Coins size={14} className="text-amber-500" />,   label: "Coins",       value: data.coins.toLocaleString() },
          { icon: <TrendingUp size={14} className="text-sage" />,   label: "This Week",   value: `${data.weeklyXp} XP`       },
          { icon: <Snowflake size={14} className="text-sky-500" />, label: "Freezes",     value: `${data.streakFreezes}×`    },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-cream rounded-2xl p-3 text-center">
            <div className="flex justify-center mb-1">{icon}</div>
            <p className="font-serif text-base font-semibold text-ink leading-none">{value}</p>
            <p className="text-[9px] text-ink/35 font-sans mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Badge Grid ───────────────────────────────────────────────────────────────

function BadgeGrid({ badges }: { badges: BadgeWithStatus[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = activeCategory === "all"
    ? badges
    : badges.filter((b) => b.category === activeCategory);

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-widest text-ink/40 font-sans">
          Badges — {earnedCount}/{badges.length} earned
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 scrollbar-none">
        <button onClick={() => setActiveCategory("all")}
          className={`shrink-0 text-xs font-sans px-3 py-1.5 rounded-full border transition-all ${activeCategory === "all" ? "bg-ink text-cream border-transparent" : "border-mist text-ink/50"}`}>
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`shrink-0 text-xs font-sans px-3 py-1.5 rounded-full border transition-all ${activeCategory === cat ? "bg-ink text-cream border-transparent" : "border-mist text-ink/50"}`}>
            {CAT_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 gap-3">
        {filtered.map((b, i) => (
          <motion.div key={b.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`rounded-2xl border p-3 text-center transition-all ${
              b.earned ? RARITY_COLORS[b.rarity] : "border-mist/40 bg-mist/10 opacity-40"
            }`}>
            <div className={`text-2xl mb-1 ${!b.earned ? "grayscale" : ""}`}>{b.emoji}</div>
            <p className="text-[10px] font-semibold font-sans text-ink leading-tight">{b.name}</p>
            <p className={`text-[9px] font-sans mt-0.5 ${RARITY_LABEL_COLORS[b.rarity]}`}>
              {b.rarity}
            </p>
            {b.earned && b.earnedAt && (
              <p className="text-[8px] text-ink/30 font-sans mt-0.5">
                {new Date(b.earnedAt).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
              </p>
            )}
            {!b.earned && (
              <p className="text-[8px] text-ink/25 font-sans mt-0.5 line-clamp-1">{b.description}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Gift History ─────────────────────────────────────────────────────────────

function GiftHistory() {
  const [txns, setTxns]     = useState<{
    id: string; amount: number; message: string | null; createdAt: string;
    fromUser: { name: string | null }; toUser: { name: string | null };
  }[]>([]);
  const [dir, setDir]       = useState<"received" | "sent">("received");
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    setLoad(true);
    fetch(`/api/coins/gift?direction=${dir}`)
      .then((r) => r.json()).then(setTxns).catch(console.error).finally(() => setLoad(false));
  }, [dir]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest text-ink/40 font-sans">Coin History</p>
        <div className="flex gap-1 bg-mist/40 rounded-full p-0.5">
          {(["received","sent"] as const).map((d) => (
            <button key={d} onClick={() => setDir(d)}
              className={`text-xs font-sans px-3 py-1 rounded-full transition-all ${dir === d ? "bg-white shadow text-ink" : "text-ink/40"}`}>
              {d === "received" ? <><Gift size={10} className="inline mr-1"/>Received</> : <><Send size={10} className="inline mr-1"/>Sent</>}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-12" rounded="lg" />)}</div>
      ) : txns.length === 0 ? (
        <p className="text-sm text-ink/30 font-sans text-center py-4">No {dir} gifts yet</p>
      ) : (
        <div className="space-y-2">
          {txns.map((t) => (
            <div key={t.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-[0_1px_4px_rgba(45,42,38,0.06)]">
              <span className="text-xl">🎁</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink font-sans">
                  {dir === "received" ? `From ${t.fromUser.name ?? "Someone"}` : `To ${t.toUser.name ?? "Friend"}`}
                </p>
                {t.message && <p className="text-[11px] text-ink/40 font-sans italic truncate">"{t.message}"</p>}
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-mono font-bold ${dir === "received" ? "text-sage" : "text-terracotta"}`}>
                  {dir === "received" ? "+" : "-"}{t.amount}🪙
                </p>
                <p className="text-[10px] text-ink/25 font-sans">
                  {new Date(t.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AchievementsPage() {
  const [xpData, setXp]       = useState<XpData | null>(null);
  const [badges, setBadges]   = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/xp").then((r) => r.json()),
      fetch("/api/badges").then((r) => r.json()),
    ]).then(([xp, bdg]) => {
      setXp(xp);
      setBadges(Array.isArray(bdg) ? bdg : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-ink">Your <em>Progress.</em></h1>
        <p className="text-sm text-ink/40 font-sans mt-1">XP · Badges · League · Coins</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-52" rounded="lg" />
          <Skeleton className="h-80" rounded="lg" />
        </div>
      ) : (
        <>
          {xpData && <XpCard data={xpData} />}
          {badges.length > 0 && <BadgeGrid badges={badges} />}
          <GiftHistory />
        </>
      )}
    </AppShell>
  );
}
