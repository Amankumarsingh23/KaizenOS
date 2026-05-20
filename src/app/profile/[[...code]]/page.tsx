"use client";

import { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Flame, Clock, Star, TrendingUp, ChevronLeft,
  Pin, Share2, Copy, Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  badges: { id: string; name: string; emoji: string; rarity: string; earnedAt: string }[];
  milestones: { date: string; label: string }[];
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
    navigator.clipboard.writeText(`${window.location.origin}/profile/${profile.code.toLowerCase()}`);
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

        {/* Share button */}
        <button onClick={copyLink}
          className="absolute top-4 right-4 flex items-center gap-1.5 text-[11px] text-ink/30 hover:text-ink/60 font-sans transition-colors">
          {copied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Share</>}
        </button>

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

      {/* ── Badges ───────────────────────────────────────────────────────── */}
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
