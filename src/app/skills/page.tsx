"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Code2, Info } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";

interface Skill { topic: string; level: number; practiceCount: number; lastPracticed: string | null; }
interface Summary { mastered: number; strong: number; comfortable: number; practicing: number; unexplored: number; overallPct: number; }
interface SkillData { grid: Skill[]; summary: Summary; }

const LEVELS = [
  { label: "Unexplored", color: "bg-mist/60 text-ink/25 border-mist",           dot: "bg-mist"        },
  { label: "Practicing", color: "bg-blue-50 text-blue-400 border-blue-100",     dot: "bg-blue-400"    },
  { label: "Comfortable",color: "bg-amber-50 text-amber-500 border-amber-100",  dot: "bg-amber-400"   },
  { label: "Strong",     color: "bg-sage/10 text-sage border-sage/20",          dot: "bg-sage"        },
  { label: "Mastered",   color: "bg-violet-50 text-violet-600 border-violet-100", dot: "bg-violet-500" },
];

function SkillChip({ skill, onUpdate }: { skill: Skill; onUpdate: (topic: string, level: number) => void }) {
  const [saving, setSaving] = useState(false);
  const level = LEVELS[skill.level];

  async function cycleLevel() {
    const next = (skill.level + 1) % 5;
    setSaving(true);
    await fetch("/api/skills", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: skill.topic, level: next }),
    });
    onUpdate(skill.topic, next);
    setSaving(false);
  }

  return (
    <motion.button
      onClick={cycleLevel}
      disabled={saving}
      whileTap={{ scale: 0.95 }}
      title={`${skill.topic} — ${level.label}. Click to advance.`}
      className={`relative text-left rounded-xl border px-3 py-2.5 text-sm font-sans font-medium transition-all disabled:opacity-50 ${level.color}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full shrink-0 ${level.dot}`} />
        <span className="leading-tight text-xs">{skill.topic}</span>
      </div>
      {skill.practiceCount > 0 && (
        <p className="text-[9px] mt-0.5 ml-4 opacity-60">{skill.practiceCount}× practiced</p>
      )}
    </motion.button>
  );
}

export default function SkillsPage() {
  const [data, setData]       = useState<SkillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuide, setGuide] = useState(false);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json()).then(setData).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleUpdate(topic: string, level: number) {
    setData((prev) => {
      if (!prev) return prev;
      const grid = prev.grid.map((s) => s.topic === topic ? { ...s, level } : s);
      const summary: Summary = {
        mastered:    grid.filter((s) => s.level === 4).length,
        strong:      grid.filter((s) => s.level === 3).length,
        comfortable: grid.filter((s) => s.level === 2).length,
        practicing:  grid.filter((s) => s.level === 1).length,
        unexplored:  grid.filter((s) => s.level === 0).length,
        overallPct:  Math.round((grid.reduce((sum, s) => sum + s.level, 0) / (grid.length * 4)) * 100),
      };
      return { grid, summary };
    });
  }

  const summary = data?.summary;

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">DSA <em>Skill Map.</em></h1>
          <p className="text-sm text-ink/40 font-sans mt-1">Self-rate your topic mastery — tap to advance</p>
        </div>
        <button onClick={() => setGuide((g) => !g)} className="p-2 text-ink/30 hover:text-ink/60 transition-colors">
          <Info size={18} />
        </button>
      </div>

      {/* Guide */}
      {showGuide && (
        <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
          className="bg-parchment border border-mist/60 rounded-2xl p-4 mb-5 space-y-1.5">
          {LEVELS.map((l, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full shrink-0 ${l.dot}`} />
              <span className="text-xs font-semibold font-sans text-ink w-24">{l.label}</span>
              <span className="text-xs text-ink/40 font-sans">
                {["Haven't touched this topic", "Aware of concept, solving basics", "Can solve medium problems", "Comfortable with hard problems", "Can teach this — deep mastery"][i]}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Overall progress */}
      {summary && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-ink/40 font-sans">Overall DSA readiness</p>
            <p className="font-serif text-xl font-semibold text-ink">{summary.overallPct}%</p>
          </div>
          <div className="h-3 bg-mist rounded-full overflow-hidden">
            <motion.div
              initial={{ width:0 }}
              animate={{ width: `${summary.overallPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-blue-400 via-sage to-violet-500"
            />
          </div>
          <div className="flex gap-3 mt-3 flex-wrap">
            {[
              { label: "Mastered",    count: summary.mastered,    color: "text-violet-600" },
              { label: "Strong",      count: summary.strong,      color: "text-sage"       },
              { label: "Comfortable", count: summary.comfortable, color: "text-amber-500"  },
              { label: "Practicing",  count: summary.practicing,  color: "text-blue-500"   },
              { label: "Unexplored",  count: summary.unexplored,  color: "text-ink/30"     },
            ].map(({ label, count, color }) => count > 0 && (
              <div key={label} className={`text-xs font-sans ${color} font-medium`}>{count} {label}</div>
            ))}
          </div>
        </div>
      )}

      {/* Level legend */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {LEVELS.map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${l.dot}`} />
            <span className="text-[10px] text-ink/40 font-sans">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Skill grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-12" rounded="lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 pb-6">
          {data!.grid.map((skill, i) => (
            <motion.div key={skill.topic} initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i * 0.02 }}>
              <SkillChip skill={skill} onUpdate={handleUpdate} />
            </motion.div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-ink/20 font-sans text-center mt-2">
        Tap any topic to advance its level. Honest self-assessment leads to better prep.
      </p>
    </AppShell>
  );
}
