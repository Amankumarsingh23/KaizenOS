"use client";

import { use, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Clock, Star, Zap, ExternalLink, Camera } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProfile {
  name: string; image: string | null; code: string; joinedAt: string;
  level: number; levelTitle: string; xp: number; weeklyXp: number;
  league: { name: string; emoji: string; color: string };
  totalSessions: number; totalHours: number; avgScore: number | null;
  activeDays90: number; earnedBadgesCount: number;
  bestStreaks: { category: string; current: number; best: number; active: boolean }[];
  featuredBadges: { emoji: string; name: string; rarity: string }[];
  topBadges: { emoji: string; name: string; rarity: string }[];
  topCategories: { cat: string; hours: number }[];
  dsaStrengths: { topic: string; level: number }[];
  heatmap: { date: string; count: number; dow: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
  DSA:"DSA",GD:"Group Discussion",MOCK_INTERVIEW:"Mock Interview",
  PROJECT_WORK:"Projects",CURRENT_AFFAIRS:"Curr. Affairs",
  JAPANESE:"Japanese",COMMUNICATION:"Communication",READING:"Reading",
};
const LEVEL_COLORS = ["","bg-mist","bg-amber-400","bg-sage","bg-violet-500"];

function heatColor(count: number) {
  if (count === 0) return "#EDE9E0";
  if (count === 1) return "#B8D4BB";
  if (count <= 3) return "#6B8F71";
  return "#2D4A33";
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) return <img src={image} alt={name} className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-lg" />;
  return (
    <div className="w-20 h-20 rounded-full ring-4 ring-white shadow-lg bg-gradient-to-br from-gold to-sage flex items-center justify-center text-white font-serif text-3xl font-bold">
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ─── The screenshot-ready profile card ────────────────────────────────────────

function ProfileCard({ profile }: { profile: PublicProfile }) {
  const topStreak = profile.bestStreaks.find((s) => s.active && s.current > 0);

  return (
    <div id="profile-card"
      className="bg-gradient-to-br from-cream to-parchment rounded-3xl p-6 shadow-[0_8px_40px_rgba(45,42,38,0.15)] border border-mist/60 max-w-sm mx-auto">

      {/* Top: avatar + identity */}
      <div className="flex items-start gap-4 mb-5">
        <Avatar name={profile.name} image={profile.image} />
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-xl font-bold text-ink leading-tight">{profile.name}</h2>
          <p className="text-xs font-sans text-ink/50 mt-0.5">Grinding since {profile.joinedAt}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-sans font-semibold text-sage bg-sage/10 px-2 py-0.5 rounded-full">
              Lv.{profile.level} · {profile.levelTitle}
            </span>
            <span className="text-sm">{profile.league.emoji}</span>
          </div>
        </div>
      </div>

      {/* Featured badges */}
      {profile.featuredBadges.length > 0 && (
        <div className="flex gap-3 mb-5 justify-center">
          {profile.featuredBadges.map((b) => (
            <div key={b.name} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold/20 to-sage/20 border border-gold/30 flex items-center justify-center text-2xl shadow-sm">
                {b.emoji}
              </div>
              <p className="text-[9px] font-sans text-ink/40 text-center max-w-14 leading-tight">{b.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label:"Sessions",   value: profile.totalSessions,   icon:"📚" },
          { label:"Hours",      value: `${profile.totalHours}h`, icon:"⏱" },
          { label:"Avg Score",  value: profile.avgScore ? `${profile.avgScore}` : "—", icon:"⭐" },
          { label:"Active Days",value: profile.activeDays90,    icon:"📅" },
          { label:"Total XP",   value: profile.xp.toLocaleString(), icon:"⚡" },
          { label:"Badges",     value: profile.earnedBadgesCount, icon:"🏅" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white rounded-2xl p-2.5 text-center shadow-sm">
            <p className="text-base font-serif font-bold text-ink">{value}</p>
            <p className="text-[9px] text-ink/35 font-sans">{icon} {label}</p>
          </div>
        ))}
      </div>

      {/* Best streak */}
      {topStreak && (
        <div className="flex items-center gap-2 mb-4 bg-gold/8 border border-gold/20 rounded-2xl px-3 py-2">
          <Flame size={14} className="text-gold shrink-0" />
          <p className="text-xs font-sans font-semibold text-ink/70">
            {topStreak.current}-day {CAT_LABELS[topStreak.category] ?? topStreak.category} streak 🔥
          </p>
        </div>
      )}

      {/* DSA strengths */}
      {profile.dsaStrengths.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] uppercase tracking-widest text-ink/30 font-sans mb-2">DSA Strengths</p>
          <div className="flex flex-wrap gap-1">
            {profile.dsaStrengths.slice(0, 8).map((s) => (
              <span key={s.topic} className={`text-[9px] text-white font-sans px-2 py-0.5 rounded-full ${LEVEL_COLORS[s.level] ?? "bg-sage"}`}>
                {s.topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KaizenOS branding */}
      <div className="flex items-center justify-between pt-3 border-t border-mist/40">
        <div className="flex items-center gap-1.5">
          <Zap size={12} className="text-sage" />
          <span className="text-[11px] font-sans font-semibold text-sage">KaizenOS</span>
        </div>
        <p className="text-[10px] text-ink/25 font-mono">kaizenos.online/p/{profile.code.toLowerCase()}</p>
      </div>
    </div>
  );
}

// ─── Heatmap section ──────────────────────────────────────────────────────────

function PublicHeatmap({ heatmap }: { heatmap: PublicProfile["heatmap"] }) {
  const firstDow = heatmap[0]?.dow ?? 0;
  const padded   = [...Array(firstDow).fill(null), ...heatmap];
  const weeks: (typeof heatmap[0] | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-5">
      <p className="text-sm font-semibold text-ink font-sans mb-3">90-day Activity</p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 shrink-0">
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week[di] ?? null;
              return (
                <div key={di} className="w-3 h-3 rounded-sm"
                  style={{ background: cell ? heatColor(cell.count) : "#F5F0E8" }}
                  title={cell ? `${cell.date}: ${cell.count}` : ""} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function PublicProfileClient({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/p/${code}`)
      .then(async (r) => { if (!r.ok) { setNotFound(true); return; } setProfile(await r.json()); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  function screenshotCard() {
    const card = document.getElementById("profile-card");
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    // After scroll, tell user to use native screenshot
    setTimeout(() => {
      alert("Scroll up to see your card! Use your phone's screenshot button or browser's 'Screenshot' tool to capture it.");
    }, 500);
  }

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-sage border-t-transparent animate-spin"/>
        <p className="text-sm text-ink/40 font-sans">Loading profile…</p>
      </div>
    </div>
  );

  if (notFound || !profile) return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
      <p className="font-serif text-2xl text-ink/30 mb-2">Profile not found</p>
      <p className="text-sm text-ink/20 font-sans mb-6">This profile may be private or the link may be wrong.</p>
      <a href="https://kaizenos.online" className="text-sage text-sm font-sans underline">Visit KaizenOS →</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-mist/60 px-4 py-3 flex items-center justify-between">
        <a href="https://kaizenos.online" className="flex items-center gap-2">
          <Zap size={16} className="text-sage" />
          <span className="font-serif text-base font-semibold text-ink">KaizenOS</span>
        </a>
        <div className="flex items-center gap-2">
          <button onClick={screenshotCard}
            className="flex items-center gap-1.5 text-xs font-sans text-ink/50 hover:text-ink/80 border border-mist rounded-xl px-3 py-1.5 transition-colors">
            <Camera size={12} /> Screenshot Card
          </button>
          <a href="https://kaizenos.online"
            className="flex items-center gap-1.5 text-xs font-sans text-sage border border-sage/30 rounded-xl px-3 py-1.5 hover:bg-sage/5 transition-colors">
            <ExternalLink size={12} /> Get KaizenOS
          </a>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Screenshot card (the main shareable element) */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-widest text-ink/30 font-sans text-center mb-4">
            📸 Screenshot the card below to share
          </p>
          <ProfileCard profile={profile} />
        </div>

        {/* Heatmap */}
        <PublicHeatmap heatmap={profile.heatmap} />

        {/* Badges */}
        {profile.topBadges.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-5">
            <p className="text-sm font-semibold text-ink font-sans mb-3">
              Badges ({profile.earnedBadgesCount} earned)
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.topBadges.map((b) => (
                <div key={b.name} title={b.name}
                  className="w-10 h-10 rounded-xl bg-mist/30 flex items-center justify-center text-xl">
                  {b.emoji}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {profile.topCategories.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-5">
            <p className="text-sm font-semibold text-ink font-sans mb-3">Focus Areas</p>
            {profile.topCategories.map((c, i) => (
              <div key={c.cat} className="flex items-center gap-3 mb-2 last:mb-0">
                <span className="text-xs font-sans text-ink/60 w-28 shrink-0">{CAT_LABELS[c.cat] ?? c.cat}</span>
                <div className="flex-1 h-3 bg-mist/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.hours / profile.topCategories[0].hours) * 100}%` }}
                    transition={{ delay: i * 0.1, duration: 0.6 }}
                    className="h-full rounded-full bg-sage"
                  />
                </div>
                <span className="text-[10px] font-mono text-ink/40 w-8 text-right">{c.hours}h</span>
              </div>
            ))}
          </div>
        )}

        {/* Streaks */}
        {profile.bestStreaks.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-5">
            <p className="text-sm font-semibold text-ink font-sans mb-3">Streaks</p>
            <div className="space-y-2">
              {profile.bestStreaks.map((s) => (
                <div key={s.category} className="flex items-center gap-3">
                  <Flame size={13} className={s.active ? "text-gold" : "text-mist"} />
                  <span className="text-xs font-sans text-ink/60 flex-1">{CAT_LABELS[s.category] ?? s.category}</span>
                  <span className={`text-xs font-mono font-bold ${s.active ? "text-gold" : "text-ink/30"}`}>
                    {s.current > 0 ? `${s.current}d` : `best ${s.best}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center py-8">
          <p className="text-sm text-ink/40 font-sans mb-3">Track your placement prep like this</p>
          <a href="https://kaizenos.online"
            className="inline-flex items-center gap-2 bg-sage text-white rounded-2xl px-6 py-3 text-sm font-semibold font-sans shadow-[0_4px_16px_rgba(107,143,113,0.35)] hover:bg-sage/90 transition-colors">
            <Zap size={15} /> Start on KaizenOS — free
          </a>
          <p className="text-[10px] text-ink/20 font-sans mt-4">kaizenos.online · Continuous improvement, one session at a time.</p>
        </div>
      </div>
    </div>
  );
}
