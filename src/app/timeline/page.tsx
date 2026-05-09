"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Star, Target, CalendarDays, BookOpen, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";

interface MonthSummary {
  month: string; label: string;
  sessions: number; minutes: number; activeDays: number;
  avgMood: number | null; avgScore: number | null;
  topCategory: string | null;
  milestones: string[];
  achievements: string[];
}
interface TimelineData {
  months: MonthSummary[];
  totalSessions: number;
  overallBestStreak: number;
  categoriesExplored: number;
}

const MOOD_EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];
const CAT_LABEL: Record<string, string> = {
  DSA: "DSA", GD: "Group Discussion", MOCK_INTERVIEW: "Mock Interview",
  PROJECT_WORK: "Project Work", CURRENT_AFFAIRS: "Current Affairs",
  JAPANESE: "Japanese", COMMUNICATION: "Communication", READING: "Reading",
};

function MonthCard({ summary, index }: { summary: MonthSummary; index: number }) {
  const hours = Math.round(summary.minutes / 60 * 10) / 10;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative pl-8"
    >
      {/* Timeline line */}
      <div className="absolute left-2.5 top-0 bottom-0 w-px bg-mist" />

      {/* Timeline dot */}
      <div className="absolute left-0 top-4 w-5 h-5 rounded-full bg-white border-2 border-sage flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-sage" />
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mb-6">
        {/* Month header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">{summary.label.split(" ")[0]}</h2>
            <p className="text-xs text-ink/35 font-sans">{summary.label.split(" ")[1]}</p>
          </div>
          {summary.avgMood && (
            <span className="text-2xl" title={`Avg mood: ${summary.avgMood}/5`}>{MOOD_EMOJI[Math.round(summary.avgMood)]}</span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Sessions",     value: summary.sessions,  icon: <BookOpen size={12} className="text-sage" /> },
            { label: "Study Time",   value: `${hours}h`,       icon: <CalendarDays size={12} className="text-gold" /> },
            { label: "Active Days",  value: summary.activeDays, icon: <Flame size={12} className="text-terracotta" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-cream rounded-xl p-2.5 text-center">
              <div className="flex justify-center mb-1">{icon}</div>
              <p className="font-serif text-lg font-semibold text-ink leading-none">{value}</p>
              <p className="text-[9px] text-ink/35 font-sans mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Top category + AI score */}
        <div className="flex items-center gap-3 mb-4">
          {summary.topCategory && (
            <div className="flex-1 bg-sage/8 rounded-xl px-3 py-2">
              <p className="text-[10px] text-ink/40 font-sans">Top focus</p>
              <p className="text-sm font-semibold text-sage font-sans">{CAT_LABEL[summary.topCategory] ?? summary.topCategory}</p>
            </div>
          )}
          {summary.avgScore && (
            <div className="flex-1 bg-gold/8 rounded-xl px-3 py-2">
              <p className="text-[10px] text-ink/40 font-sans">Avg AI Score</p>
              <p className="text-sm font-semibold text-gold font-sans flex items-center gap-1">
                <Star size={12} fill="currentColor" /> {summary.avgScore}/10
              </p>
            </div>
          )}
        </div>

        {/* Milestones */}
        {summary.milestones.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-widest text-ink/35 font-sans mb-2">Milestones Completed</p>
            <div className="space-y-1">
              {summary.milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Target size={11} className="text-violet-500 shrink-0" />
                  <p className="text-xs font-sans text-ink/70">{m}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {summary.achievements.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {summary.achievements.map((a, i) => (
              <span key={i} className="text-[11px] font-sans bg-parchment border border-mist/60 rounded-full px-2.5 py-1 text-ink/60">
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function TimelinePage() {
  const [data, setData]     = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/timeline")
      .then((r) => r.json()).then(setData).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-ink">Your <em>Journey.</em></h1>
        <p className="text-sm text-ink/40 font-sans mt-1">A chronicle of your preparation — month by month</p>
      </div>

      {/* Overall stats */}
      {!loading && data && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Sessions",  value: data.totalSessions,       icon: <BookOpen size={16} className="text-sage" /> },
            { label: "Best Streak",     value: `${data.overallBestStreak}d`, icon: <Flame size={16} className="text-gold" /> },
            { label: "Areas Explored",  value: data.categoriesExplored,  icon: <Trophy size={16} className="text-violet-500" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-2xl p-4 text-center shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
              <div className="flex justify-center mb-1.5">{icon}</div>
              <p className="font-serif text-2xl font-semibold text-ink">{value}</p>
              <p className="text-[10px] text-ink/35 font-sans mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-4 pl-8">
          {[0,1,2].map((i) => <Skeleton key={i} className="h-48" rounded="lg" />)}
        </div>
      ) : !data?.months.length ? (
        <div className="text-center py-16">
          <CalendarDays size={32} className="text-ink/15 mx-auto mb-3" />
          <p className="text-sm text-ink/40 font-sans">Start logging sessions to build your timeline</p>
        </div>
      ) : (
        <div>
          {data.months.map((m, i) => <MonthCard key={m.month} summary={m} index={i} />)}
          <div className="pl-8">
            <div className="relative pl-0">
              <div className="absolute -left-5.5 top-2 w-5 h-5 rounded-full bg-sage/20 border-2 border-sage/40 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-sage/60" />
              </div>
              <p className="text-xs text-ink/25 font-sans pl-2">Your journey began here</p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
