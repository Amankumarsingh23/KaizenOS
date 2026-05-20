"use client";

import { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Flame, Clock, Star, TrendingUp, ChevronLeft,
  Copy, Check, Swords, CheckCircle2, XCircle, BarChart2, Pin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BadgeItem { id: string; name: string; emoji: string; rarity: string; earnedAt: string; featured?: boolean; }
interface ProfileData {
  userId: string; name: string; image: string | null; code: string; isOwn: boolean;
  xp: number; level: number; levelTitle: string;
  levelProgress: { current: number; nextAt: number; pct: number };
  weeklyXp: number; streakFreezes: number;
  league: { name: string; color: string; emoji: string };
  joinedAt: string; totalSessions: number; totalHours: number; avgScore: number | null;
  streaks: { category: string; current: number; best: number; active: boolean }[];
  heatmap: { date: string; count: number; dow: number }[];
  topCategories: { cat: string; hours: number }[];
  dsaMap: { topic: string; level: number }[];
  badges: BadgeItem[];
  featuredBadges: BadgeItem[];
  milestones: { date: string; label: string }[];
  challenge: { id: string; status: string; challengerId: string; challengedId: string } | null;
  viewerWeeklyXp: number | null;
  viewerXp: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
  DSA:"DSA", GD:"Group Discussion", MOCK_INTERVIEW:"Mock Interview",
  PROJECT_WORK:"Projects", CURRENT_AFFAIRS:"Curr. Affairs",
  JAPANESE:"Japanese", COMMUNICATION:"Communication", READING:"Reading",
};
const DSA_LEVEL_COLORS = ["bg-mist/40","bg-blue-200","bg-amber-300","bg-sage","bg-violet-500"];

function heatColor(count: number) {
  if (count === 0) return "#EDE9E0";
  if (count === 1) return "#B8D4BB";
  if (count <= 3) return "#6B8F71";
  return "#2D4A33";
}

function Avatar({ name, image, size = 72 }: { name: string; image: string | null; size?: number }) {
  if (image) return <img src={image} alt={name} className="rounded-full object-cover ring-4 ring-white" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full ring-4 ring-white bg-gradient-to-br from-gold to-sage flex items-center justify-center text-white font-serif font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ─── Challenge Button ─────────────────────────────────────────────────────────

function ChallengeSection({ profile, onUpdate }: {
  profile: ProfileData;
  onUpdate: (c: ProfileData["challenge"]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const { challenge } = profile;

  async function sendChallenge() {
    setLoading(true);
    const res = await fetch("/api/challenges", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengedId: profile.userId }),
    });
    if (res.ok) onUpdate(await res.json());
    setLoading(false);
  }

  async function respond(action: "accept" | "decline") {
    if (!challenge) return;
    setLoading(true);
    const res = await fetch("/api/challenges", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.id, action }),
    });
    if (res.ok) onUpdate({ ...challenge, status: action === "accept" ? "ACTIVE" : "DECLINED" });
    setLoading(false);
  }

  if (!challenge) return (
    <motion.button onClick={sendChallenge} disabled={loading} whileTap={{ scale: 0.97 }}
      className="w-full flex items-center justify-center gap-2 bg-ink text-cream rounded-2xl py-3.5 text-sm font-semibold font-sans mb-4 shadow-[0_2px_12px_rgba(45,42,38,0.20)] hover:bg-ink/90 transition-colors disabled:opacity-40">
      <Swords size={16} /> {loading ? "Challenging…" : `⚔️ Challenge ${profile.name.split(" ")[0]}`}
    </motion.button>
  );

  if (challenge.status === "PENDING") {
    const iAmChallenger = challenge.challengerId !== profile.userId;
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
        <p className="text-sm font-semibold text-ink font-sans mb-1">
          {iAmChallenger ? "Challenge sent! Waiting for response…" : `${profile.name.split(" ")[0]} challenged you!`}
        </p>
        <p className="text-xs text-ink/50 font-sans mb-3">7-day XP battle — whoever earns more XP this week wins</p>
        {!iAmChallenger && (
          <div className="flex gap-2">
            <button onClick={() => respond("decline")} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-mist text-sm text-ink/50 font-sans">
              <XCircle size={13}/> Decline
            </button>
            <button onClick={() => respond("accept")} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sage text-white text-sm font-semibold font-sans shadow-[0_2px_8px_rgba(107,143,113,0.30)]">
              <CheckCircle2 size={13}/> Accept
            </button>
          </div>
        )}
      </div>
    );
  }

  if (challenge.status === "ACTIVE") return (
    <div className="bg-sage/8 border border-sage/20 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Swords size={15} className="text-sage"/>
        <p className="text-sm font-semibold text-sage font-sans">Active Challenge ⚔️</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "You", xp: profile.viewerWeeklyXp ?? 0, isLeading: (profile.viewerWeeklyXp ?? 0) >= profile.weeklyXp },
          { label: profile.name.split(" ")[0], xp: profile.weeklyXp, isLeading: profile.weeklyXp >= (profile.viewerWeeklyXp ?? 0) },
        ].map(({ label, xp, isLeading }) => (
          <div key={label} className={`rounded-xl p-3 text-center border ${isLeading ? "bg-sage/10 border-sage/30" : "bg-mist/30 border-mist"}`}>
            <p className="text-[10px] text-ink/40 font-sans">{label}</p>
            <p className={`font-serif text-xl font-bold ${isLeading ? "text-sage" : "text-ink/50"}`}>{xp} XP</p>
            {isLeading && <p className="text-[9px] text-sage font-sans">Leading ⚡</p>}
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}

// ─── Comparative View ─────────────────────────────────────────────────────────

function ComparativeView({ profile }: { profile: ProfileData }) {
  if (profile.isOwn || profile.viewerXp === null) return null;

  const rows = [
    { label: "Total XP",     mine: profile.viewerXp ?? 0,       theirs: profile.xp,           suffix: "XP" },
    { label: "Weekly XP",    mine: profile.viewerWeeklyXp ?? 0, theirs: profile.weeklyXp,      suffix: "XP" },
    { label: "Total Sessions",mine: 0,                           theirs: profile.totalSessions, suffix: "" },
    { label: "Study Hours",  mine: 0,                           theirs: profile.totalHours,    suffix: "h" },
    { label: "Badges",       mine: 0,                           theirs: profile.badges.length, suffix: "" },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={14} className="text-ink/40"/>
        <p className="text-sm font-semibold text-ink font-sans">Compare</p>
      </div>
      <div className="space-y-3">
        {rows.filter(r => r.theirs > 0).map(({ label, mine, theirs, suffix }) => {
          const max     = Math.max(mine, theirs, 1);
          const iAhead  = mine > theirs;
          const theyAhead = theirs > mine;
          return (
            <div key={label}>
              <div className="flex items-center justify-between text-[10px] text-ink/40 font-sans mb-1">
                <span className={mine > 0 ? (iAhead ? "text-sage font-medium" : "") : "text-ink/20"}>You {mine > 0 ? `${mine}${suffix}` : "?"}</span>
                <span className="font-medium text-ink/60">{label}</span>
                <span className={theyAhead ? "text-terracotta font-medium" : ""}>{theirs}{suffix}</span>
              </div>
              <div className="flex gap-1 h-2">
                {mine > 0 && (
                  <motion.div initial={{width:0}} animate={{width:`${(mine/max)*50}%`}} transition={{duration:0.6}}
                    className={`h-full rounded-l-full ${iAhead ? "bg-sage" : "bg-mist"}`}/>
                )}
                <div className="w-px bg-ink/10 shrink-0"/>
                <motion.div initial={{width:0}} animate={{width:`${(theirs/max)*50}%`}} transition={{duration:0.6}}
                  className={`h-full rounded-r-full ${theyAhead ? "bg-terracotta" : "bg-mist"}`}/>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-ink/20 font-sans mt-3 text-center">Your session data will show after you log some sessions</p>
    </div>
  );
}

// ─── Featured Badges ──────────────────────────────────────────────────────────

function FeaturedBadgesRow({ badges, isOwn, onToggle }: {
  badges: BadgeItem[]; isOwn: boolean; onToggle?: (id: string) => void;
}) {
  if (badges.length === 0 && !isOwn) return null;
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Pin size={11} className="text-gold"/>
        <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans">Featured</p>
        {isOwn && <p className="text-[9px] text-ink/25 font-sans ml-auto">Pin from Achievements</p>}
      </div>
      <div className="flex gap-3">
        {badges.length > 0 ? badges.map((b) => (
          <div key={b.id} className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/15 to-sage/15 border border-gold/20 flex items-center justify-center text-3xl shadow-[0_2px_8px_rgba(196,163,90,0.15)]">
              {b.emoji}
            </div>
            <p className="text-[9px] font-sans text-ink/50 text-center max-w-14 leading-tight">{b.name}</p>
          </div>
        )) : (
          <p className="text-xs text-ink/25 font-sans italic">No featured badges — pin your favorites in Achievements</p>
        )}
      </div>
    </div>
  );
}

// ─── Section: Heatmap ─────────────────────────────────────────────────────────

function HeatmapSection({ heatmap }: { heatmap: ProfileData["heatmap"] }) {
  const firstDow = heatmap[0]?.dow ?? 0;
  const padded   = [...Array(firstDow).fill(null), ...heatmap];
  const weeks: (typeof heatmap[0] | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const totalActive = heatmap.filter((d) => d.count > 0).length;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-ink font-sans">Activity</p>
        <p className="text-[11px] text-ink/35 font-sans">{totalActive} active days in 90</p>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 shrink-0">
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week[di] ?? null;
              return (
                <div key={di} className="w-3 h-3 rounded-sm"
                  style={{ background: cell ? heatColor(cell.count) : "#F5F0E8" }}
                  title={cell ? `${cell.date}: ${cell.count} sessions` : ""} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Streaks ─────────────────────────────────────────────────────────

function StreaksSection({ streaks }: { streaks: ProfileData["streaks"] }) {
  const active  = streaks.filter((s) => s.active && s.current > 0);
  const dormant = streaks.filter((s) => !s.active && s.best > 0);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-4">
      <p className="text-sm font-semibold text-ink font-sans mb-3">Streaks</p>
      {active.length === 0 && dormant.length === 0 ? (
        <p className="text-sm text-ink/30 font-sans">No streaks yet</p>
      ) : (
        <div className="space-y-2">
          {active.map((s) => (
            <div key={s.category} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-sage shrink-0" />
              <span className="text-xs font-sans text-ink/70 flex-1">{CAT_LABELS[s.category] ?? s.category}</span>
              <span className="font-mono text-sm font-bold text-sage flex items-center gap-1">
                <Flame size={12} /> {s.current}d
              </span>
            </div>
          ))}
          {dormant.slice(0, 3).map((s) => (
            <div key={s.category} className="flex items-center gap-3 opacity-40">
              <div className="w-2 h-2 rounded-full bg-mist shrink-0" />
              <span className="text-xs font-sans text-ink/60 flex-1">{CAT_LABELS[s.category] ?? s.category}</span>
              <span className="font-mono text-xs text-ink/40">best {s.best}d</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Badge Wall ──────────────────────────────────────────────────────

function BadgesSection({ badges, isOwn }: { badges: ProfileData["badges"]; isOwn: boolean }) {
  if (badges.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-4 text-center">
        <p className="text-sm text-ink/30 font-sans">No badges yet</p>
      </div>
    );
  }

  const RARITY_RING: Record<string, string> = {
    common: "ring-mist", rare: "ring-blue-200", epic: "ring-violet-300", legendary: "ring-gold/60",
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-ink font-sans">Badges ({badges.length})</p>
        {isOwn && <a href="/achievements" className="text-[11px] text-sage font-sans hover:underline">Manage →</a>}
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <div key={b.id} title={b.name}
            className={`w-10 h-10 rounded-2xl bg-mist/30 flex items-center justify-center text-xl ring-2 ${RARITY_RING[b.rarity] ?? "ring-mist"}`}>
            {b.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: DSA Skill Map ───────────────────────────────────────────────────

function DsaSkillSection({ dsaMap }: { dsaMap: ProfileData["dsaMap"] }) {
  const withLevels = dsaMap.filter((t) => t.level > 0);
  if (withLevels.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-4">
      <p className="text-sm font-semibold text-ink font-sans mb-3">DSA Skill Map</p>
      <div className="flex flex-wrap gap-1.5">
        {dsaMap.map((t) => (
          <div key={t.topic}
            className={`text-[9px] font-sans px-2 py-1 rounded-full text-white font-medium ${
              t.level === 0 ? "bg-mist/50 text-ink/30" :
              t.level === 1 ? "bg-blue-400" :
              t.level === 2 ? "bg-amber-400" :
              t.level === 3 ? "bg-sage" : "bg-violet-500"
            }`}
            title={["Unexplored","Practicing","Comfortable","Strong","Mastered"][t.level]}>
            {t.topic}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-3">
        {[["Practicing","bg-blue-400"],["Comfortable","bg-amber-400"],["Strong","bg-sage"],["Mastered","bg-violet-500"]].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${color}`}/>
            <span className="text-[9px] text-ink/35 font-sans">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Journey ─────────────────────────────────────────────────────────

function JourneySection({ milestones }: { milestones: ProfileData["milestones"] }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-4">
      <p className="text-sm font-semibold text-ink font-sans mb-4">Journey</p>
      <div className="space-y-3">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-px bg-mist self-stretch relative">
              <div className="absolute -left-[3px] top-1 w-1.5 h-1.5 rounded-full bg-sage" />
            </div>
            <div className="pb-1">
              <p className="text-xs font-sans text-ink/70">{m.label}</p>
              <p className="text-[10px] text-ink/30 font-sans">{m.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage({ params }: { params: Promise<{ code?: string[] }> }) {
  const { code: codeSegments } = use(params);
  const code    = codeSegments?.[0] ?? "me";
  const router  = useRouter();

  const [profile, setProfile]   = useState<ProfileData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [showCompare, setCompare] = useState(false);

  useEffect(() => {
    fetch(`/api/profile/${code}`)
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); return; }
        setProfile(await r.json());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  function copyLink() {
    if (!profile) return;
    // Copy the PUBLIC shareable link (works without login)
    navigator.clipboard.writeText(`${window.location.origin}/p/${profile.code.toLowerCase()}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <AppShell>
      <div className="space-y-4">
        <Skeleton className="h-40" rounded="lg"/>
        <Skeleton className="h-32" rounded="lg"/>
        <Skeleton className="h-48" rounded="lg"/>
      </div>
    </AppShell>
  );

  if (notFound || !profile) return (
    <AppShell>
      <div className="text-center py-20">
        <p className="font-serif text-xl text-ink/40">Profile not found</p>
        <p className="text-sm text-ink/25 font-sans mt-1">This person may not be your friend yet</p>
        <button onClick={() => router.back()} className="mt-4 text-sage text-sm font-sans underline">Go back</button>
      </div>
    </AppShell>
  );

  const topStreak = profile.streaks.filter((s) => s.active && s.current > 0).sort((a, b) => b.current - a.current)[0];

  return (
    <AppShell>
      {/* Back */}
      {!profile.isOwn && (
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-ink/70 font-sans mb-4 transition-colors">
          <ChevronLeft size={14}/> Back
        </button>
      )}

      {/* ── Hero card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(45,42,38,0.10)] mb-4 relative overflow-hidden">
        {/* BG gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage/5 to-gold/5 pointer-events-none"/>

        {/* Share public profile */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button onClick={copyLink}
            className="flex items-center gap-1.5 text-[11px] text-ink/30 hover:text-sage font-sans transition-colors bg-cream rounded-xl px-2.5 py-1 border border-mist/60">
            {copied ? <><Check size={11}/> Copied!</> : <><Copy size={11}/> Copy public link</>}
          </button>
        </div>
        {profile.isOwn && (
          <a href={`/p/${profile.code.toLowerCase()}`} target="_blank" rel="noopener noreferrer"
            className="absolute top-10 right-4 text-[10px] text-sage/60 hover:text-sage font-sans transition-colors">
            Preview public page →
          </a>
        )}

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-5">
          <Avatar name={profile.name} image={profile.image} size={68} />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-semibold text-ink leading-tight">{profile.name}</h1>
            <p className="text-xs text-ink/40 font-sans mt-0.5">Grinding since {profile.joinedAt}</p>
            {topStreak && (
              <div className="flex items-center gap-1 mt-2">
                <Flame size={13} className="text-gold"/>
                <span className="text-xs font-sans font-semibold text-ink/70">
                  {topStreak.current}-day {CAT_LABELS[topStreak.category] ?? topStreak.category} streak
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Level + league */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-cream rounded-2xl px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans">Level {profile.level}</p>
            <p className="font-serif text-base font-semibold text-ink">{profile.levelTitle}</p>
          </div>
          <div className="flex-1 bg-cream rounded-2xl px-4 py-3 text-center">
            <p className="text-2xl">{profile.league.emoji}</p>
            <p className={`text-xs font-semibold font-sans ${profile.league.color}`}>{profile.league.name}</p>
          </div>
        </div>

        {/* XP progress */}
        <div className="mb-4">
          <div className="h-2 bg-mist rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${profile.levelProgress.pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-sage to-gold"
            />
          </div>
          <p className="text-[10px] text-ink/30 font-sans mt-1">{profile.levelProgress.pct}% to Level {profile.level + 1}</p>
        </div>

        {/* Vital stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label:"Sessions",   value: profile.totalSessions, icon:<Star size={12} className="text-gold"/> },
            { label:"Hours",      value: `${profile.totalHours}h`, icon:<Clock size={12} className="text-sage"/> },
            { label:"Avg Score",  value: profile.avgScore ? `${profile.avgScore}/100` : "—", icon:<TrendingUp size={12} className="text-violet-500"/> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-cream rounded-xl p-2.5 text-center">
              <div className="flex justify-center mb-1">{icon}</div>
              <p className="font-serif text-base font-semibold text-ink leading-none">{value}</p>
              <p className="text-[9px] text-ink/35 font-sans mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── This month categories ────────────────────────────────────────── */}
      {profile.topCategories.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-4">
          <p className="text-sm font-semibold text-ink font-sans mb-3">This Month</p>
          {profile.topCategories.map((c, i) => (
            <div key={c.cat} className="flex items-center gap-3 mb-2 last:mb-0">
              <span className="text-xs font-sans text-ink/60 w-28 shrink-0">{CAT_LABELS[c.cat] ?? c.cat}</span>
              <div className="flex-1 h-4 bg-mist/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.hours / profile.topCategories[0].hours) * 100}%` }}
                  transition={{ delay: i * 0.1 }}
                  className="h-full rounded-full bg-sage"
                />
              </div>
              <span className="text-[10px] font-mono text-ink/40 w-8 text-right shrink-0">{c.hours}h</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Heatmap ──────────────────────────────────────────────────────── */}
      <HeatmapSection heatmap={profile.heatmap} />

      {/* ── Streaks ──────────────────────────────────────────────────────── */}
      <StreaksSection streaks={profile.streaks} />

      {/* ── Challenge button (friend profiles only) ──────────────────────── */}
      {!profile.isOwn && (
        <ChallengeSection
          profile={profile}
          onUpdate={(c) => setProfile((p) => p ? { ...p, challenge: c } : p)}
        />
      )}

      {/* ── Compare toggle (friend profiles only) ────────────────────────── */}
      {!profile.isOwn && (
        <button onClick={() => setCompare((v) => !v)}
          className="w-full flex items-center justify-center gap-2 border border-mist rounded-2xl py-2.5 text-xs font-sans text-ink/40 hover:text-ink/60 hover:border-ink/20 transition-all mb-4">
          <BarChart2 size={13}/>
          {showCompare ? "Hide comparison" : "Compare stats side by side"}
        </button>
      )}
      {showCompare && <ComparativeView profile={profile} />}

      {/* ── Featured badges ───────────────────────────────────────────────── */}
      <FeaturedBadgesRow
        badges={profile.featuredBadges ?? []}
        isOwn={profile.isOwn}
      />

      {/* ── All badges ───────────────────────────────────────────────────── */}
      <BadgesSection badges={profile.badges} isOwn={profile.isOwn} />

      {/* ── DSA Skill Map ────────────────────────────────────────────────── */}
      <DsaSkillSection dsaMap={profile.dsaMap} />

      {/* ── Journey ──────────────────────────────────────────────────────── */}
      {profile.milestones.length > 0 && <JourneySection milestones={profile.milestones} />}

      {/* Friend code */}
      <div className="text-center py-4">
        <p className="text-[10px] text-ink/20 font-mono">code: {profile.code}</p>
      </div>
    </AppShell>
  );
}
