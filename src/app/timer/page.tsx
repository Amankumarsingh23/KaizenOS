"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2, Users, Briefcase, FolderOpen, Globe,
  Languages, Mic, BookOpen, Play, Pause, Square,
  Star, ChevronDown, X, CheckCircle2, RotateCcw,
} from "lucide-react";
import { AppShell }         from "@/components/layout/AppShell";
import { Badge }            from "@/components/ui/Badge";
import { SuccessCheckmark } from "@/components/ui/Button";
import { useTimer, type SavePayload } from "@/context/TimerContext";
import type { Category } from "@/types";

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORIES: {
  key: Category;
  label: string;
  sublabel: string;
  Icon: React.ElementType;
  accent: string;
  iconBg: string;
}[] = [
  { key: "DSA",            label: "DSA",          sublabel: "Problem solving",   Icon: Code2,      accent: "border-blue-300 bg-blue-50/60",      iconBg: "bg-blue-100 text-blue-600"       },
  { key: "GD",             label: "Group D.",      sublabel: "Discussion",        Icon: Users,      accent: "border-sage/40 bg-sage/5",           iconBg: "bg-sage/15 text-sage"            },
  { key: "MOCK_INTERVIEW", label: "Mock",          sublabel: "Interview",         Icon: Briefcase,  accent: "border-gold/40 bg-gold/5",           iconBg: "bg-gold/15 text-amber-700"       },
  { key: "PROJECT_WORK",   label: "Project",       sublabel: "Build something",   Icon: FolderOpen, accent: "border-violet-300 bg-violet-50/60",  iconBg: "bg-violet-100 text-violet-600"   },
  { key: "CURRENT_AFFAIRS",label: "Curr. Affairs", sublabel: "Stay informed",     Icon: Globe,      accent: "border-sky-300 bg-sky-50/60",        iconBg: "bg-sky-100 text-sky-600"         },
  { key: "JAPANESE",       label: "Japanese",      sublabel: "Language study",    Icon: Languages,  accent: "border-rose-300 bg-rose-50/60",      iconBg: "bg-rose-100 text-rose-600"       },
  { key: "COMMUNICATION",  label: "Comm.",         sublabel: "STAR stories",      Icon: Mic,        accent: "border-terracotta/40 bg-terracotta/5", iconBg: "bg-terracotta/15 text-terracotta"},
  { key: "READING",        label: "Reading",       sublabel: "Books & articles",  Icon: BookOpen,   accent: "border-mist bg-mist/30",             iconBg: "bg-mist text-ink/60"             },
];

// ─── Subcategory forms ────────────────────────────────────────────────────────

const PLATFORMS = ["LeetCode", "Codeforces", "GFG", "HackerRank", "AtCoder", "Other"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const INTERVIEW_TYPES = ["HR", "Technical", "System Design"];
const GD_FORMATS = ["Group Discussion", "Solo Practice", "Topic Research"];
const JP_TYPES = ["Vocabulary", "Grammar", "Reading", "Listening", "Speaking", "Writing"];
const COMM_TYPES = ["STAR Story", "Presentation", "Group Discussion", "Mock Speech"];
const PROJECT_TASKS = ["Design", "Coding", "Documentation", "Research", "Testing"];

function SubcategoryFields({
  category,
  meta,
  onChange,
}: {
  category: Category;
  meta: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const sel = (label: string, key: string, opts: string[]) => (
    <div key={key}>
      <label className="block text-xs font-medium text-ink/50 mb-1.5 font-sans">{label}</label>
      <div className="relative">
        <select
          value={meta[key] ?? ""}
          onChange={(e) => onChange(key, e.target.value)}
          className="w-full appearance-none bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-colors pr-8"
        >
          <option value="">Select…</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
      </div>
    </div>
  );

  const txt = (label: string, key: string, placeholder: string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-ink/50 mb-1.5 font-sans">{label}</label>
      <input
        type="text"
        value={meta[key] ?? ""}
        onChange={(e) => onChange(key, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-colors"
      />
    </div>
  );

  const num = (label: string, key: string, placeholder: string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-ink/50 mb-1.5 font-sans">{label}</label>
      <input
        type="number"
        min="0"
        max="100"
        value={meta[key] ?? ""}
        onChange={(e) => onChange(key, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-mono text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-colors"
      />
    </div>
  );

  switch (category) {
    case "DSA":
      return <div className="space-y-3">
        {num("Problems solved this session", "count", "e.g. 3")}
        {txt("Problem names (optional)", "problem", "e.g. Two Sum, LRU Cache, Merge Intervals")}
        {sel("Platform", "platform", PLATFORMS)}
        {sel("Difficulty", "difficulty", DIFFICULTIES)}
      </div>;
    case "GD":
      return <div className="space-y-3">
        {txt("Topic", "topic", "e.g. AI regulation in India")}
        {sel("Format", "format", GD_FORMATS)}
      </div>;
    case "MOCK_INTERVIEW":
      return <div className="space-y-3">
        {sel("Interview type", "type", INTERVIEW_TYPES)}
        {txt("Company (optional)", "company", "e.g. Google")}
      </div>;
    case "PROJECT_WORK":
      return <div className="space-y-3">
        {txt("Project name", "project", "e.g. KaizenOS")}
        {sel("Task type", "task", PROJECT_TASKS)}
      </div>;
    case "JAPANESE":
      return <div className="space-y-3">
        {sel("Lesson type", "type", JP_TYPES)}
        {txt("Lesson / chapter", "lesson", "e.g. Chapter 5 – Te-form")}
      </div>;
    case "COMMUNICATION":
      return <div className="space-y-3">
        {sel("Type", "type", COMM_TYPES)}
        {txt("Topic", "topic", "e.g. Tell me about yourself")}
      </div>;
    case "CURRENT_AFFAIRS":
      return <div className="space-y-3">
        {txt("Topic", "topic", "e.g. India-China relations")}
        {txt("Source (optional)", "source", "e.g. The Hindu")}
      </div>;
    case "READING":
      return <div className="space-y-3">
        {txt("Title", "title", "e.g. Atomic Habits")}
        {txt("Author / source", "author", "e.g. James Clear")}
      </div>;
    default:
      return null;
  }
}

// ─── Timer ring ───────────────────────────────────────────────────────────────

const RING_R = 88;
const RING_C = 100;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
const BLOCK = 25 * 60; // 25-minute Pomodoro block

function TimerRing({ elapsed, status }: { elapsed: number; status: string }) {
  const pct    = (elapsed % BLOCK) / BLOCK;
  const offset = CIRCUMFERENCE * (1 - pct);
  const color  = status === "paused" ? "#C4A35A" : "#6B8F71";
  const isRunning = status === "running";

  return (
    <svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0">
      {/* Pulse ring — only when running */}
      {isRunning && (
        <motion.circle
          cx={RING_C} cy={RING_C} r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="6"
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "100px 100px" }}
        />
      )}
      {/* Track */}
      <circle cx={RING_C} cy={RING_C} r={RING_R}
        fill="none" stroke="var(--color-mist,#E8E2D8)" strokeWidth="3" />
      {/* Progress */}
      <motion.circle
        cx={RING_C} cy={RING_C} r={RING_R}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 100 100)"
        transition={{ duration: 0.4 }}
      />
    </svg>
  );
}

// ─── Format time ──────────────────────────────────────────────────────────────

function fmt(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ─── Save Panel ───────────────────────────────────────────────────────────────

function SavePanel({ onClose }: { onClose: () => void }) {
  const { category, elapsed, startTime, saveSession } = useTimer();
  const [notes, setNotes]     = useState("");
  const [rating, setRating]   = useState(0);
  const [meta, setMeta]       = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const textRef               = useRef<HTMLTextAreaElement>(null);

  const endTime = new Date();
  const durationMins = Math.max(1, Math.round(elapsed / 60));

  function setMetaKey(key: string, val: string) {
    setMeta((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!rating) return;
    setSaving(true);
    const payload: SavePayload = {
      notes: notes.trim() || "—",
      selfRating: rating,
      subcategory: meta.problem || meta.topic || meta.title || meta.project || undefined,
      metadata: Object.keys(meta).length ? meta : undefined,
    };
    await saveSession(payload);
    setSaved(true);
    setTimeout(onClose, 1000);
  }

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl overflow-hidden"
      style={{ boxShadow: "0 -8px 40px rgba(45,42,38,0.18)", maxHeight: "92dvh" }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-mist" />
      </div>

      <div className="overflow-y-auto px-5 pb-10" style={{ maxHeight: "calc(92dvh - 28px)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pt-1">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">Save Session</h2>
            <p className="text-xs text-ink/40 font-sans mt-0.5">How did it go?</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-mist/60 text-ink/40">
            <X size={18} />
          </button>
        </div>

        {/* Summary strip */}
        <div className="flex items-center gap-3 bg-cream rounded-2xl p-4 mb-5">
          {category && <Badge variant={category} />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink font-mono">{fmt(elapsed)}</p>
            <p className="text-xs text-ink/40 font-sans">
              {startTime ? new Date(startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"} → {endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {durationMins} min
            </p>
          </div>
        </div>

        {/* Subcategory fields */}
        {category && (
          <div className="mb-5">
            <p className="text-xs font-medium text-ink/40 uppercase tracking-widest mb-3 font-sans">Details</p>
            <SubcategoryFields category={category} meta={meta} onChange={setMetaKey} />
          </div>
        )}

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-ink/40 uppercase tracking-widest mb-2 font-sans">
            Notes
          </label>
          <textarea
            ref={textRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you work on? Any blockers or wins?"
            rows={3}
            className="w-full bg-cream border border-mist rounded-2xl px-4 py-3 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 resize-none transition-colors leading-relaxed"
          />
        </div>

        {/* Star rating */}
        <div className="mb-6">
          <p className="text-xs font-medium text-ink/40 uppercase tracking-widest mb-2 font-sans">
            Self-rating
          </p>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.button
                key={n}
                onClick={() => setRating(n)}
                whileTap={{ scale: 0.80 }}
                animate={n <= rating ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 14 }}
              >
                <Star
                  size={30}
                  className={n <= rating ? "text-gold" : "text-mist"}
                  fill={n <= rating ? "currentColor" : "none"}
                  strokeWidth={n <= rating ? 0 : 1.5}
                />
              </motion.button>
            ))}
          </div>
          {rating === 0 && (
            <p className="text-xs text-terracotta/70 mt-1.5 font-sans">Tap stars to rate</p>
          )}
        </div>

        {/* Save button */}
        <motion.button
          onClick={handleSave}
          disabled={rating === 0 || saving || saved}
          whileTap={!saved && !saving ? { scale: 0.97 } : {}}
          className="w-full flex items-center justify-center gap-2 bg-sage text-white rounded-2xl py-3.5 text-sm font-semibold font-sans disabled:opacity-50"
          style={{ boxShadow: "0 2px 12px rgba(107,143,113,0.35)" }}
        >
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.span key="saved" className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <SuccessCheckmark size={16} color="white" /> Saved!
              </motion.span>
            ) : saving ? (
              <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Saving…
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Save Session
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimerPage() {
  const {
    status, elapsed, category,
    selectCategory, start, pause, resume, stop, reset,
  } = useTimer();

  const [showPanel, setShowPanel] = useState(false);

  // Open panel when timer is stopped
  const isActive  = status === "running" || status === "paused";
  const isStopped = status === "stopped";

  // Open save panel automatically when stopped
  if (isStopped && !showPanel) setShowPanel(true);

  const activeCat = CATEGORIES.find((c) => c.key === category);

  return (
    <AppShell>
      <AnimatePresence mode="wait">

        {/* ── IDLE: Category selector ─────────────────────────────────────── */}
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6">
              <h1 className="font-serif text-3xl font-semibold text-ink leading-tight">
                Log <em>Session.</em>
              </h1>
              <p className="text-sm text-ink/45 font-sans mt-1">Choose a category to begin</p>
            </div>

            {/* 2×4 grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {CATEGORIES.map(({ key, label, sublabel, Icon, accent, iconBg }) => {
                const isSelected = category === key;
                return (
                  <motion.button
                    key={key}
                    onClick={() => selectCategory(key)}
                    whileTap={{ scale: 0.97 }}
                    className={[
                      "relative flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-150 bg-white",
                      isSelected
                        ? "border-sage shadow-[0_4px_20px_rgba(107,143,113,0.20)]"
                        : "border-transparent shadow-[0_2px_12px_rgba(45,42,38,0.06)] hover:border-mist",
                    ].join(" ")}
                  >
                    {/* Color accent stripe */}
                    {isSelected && (
                      <motion.div
                        layoutId="cat-accent"
                        className="absolute left-0 inset-y-3 w-1 rounded-full bg-sage"
                      />
                    )}
                    <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink font-sans leading-none">{label}</p>
                      <p className="text-[11px] text-ink/40 font-sans mt-0.5 leading-none">{sublabel}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sage" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Start button */}
            <motion.button
              onClick={start}
              disabled={!category}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2.5 bg-sage text-white rounded-2xl py-4 text-base font-semibold font-sans transition-all disabled:opacity-35"
              style={category ? { boxShadow: "0 4px_20px_rgba(107,143,113,0.35)" } : {}}
            >
              <Play size={18} fill="currentColor" strokeWidth={0} />
              {category ? `Start ${activeCat?.label} session` : "Select a category first"}
            </motion.button>
          </motion.div>
        )}

        {/* ── ACTIVE: Running / Paused ───────────────────────────────────── */}
        {(isActive || isStopped) && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center"
          >
            {/* Active category chip */}
            <div className="w-full flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                {category && <Badge variant={category} />}
                <span className="text-sm text-ink/40 font-sans">
                  {status === "running" ? "In progress" : status === "paused" ? "Paused" : "Done"}
                </span>
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs text-ink/35 hover:text-ink/60 transition-colors font-sans"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            </div>

            {/* Timer ring + clock */}
            <div className="relative w-[200px] h-[200px] flex items-center justify-center mb-8">
              <TimerRing elapsed={elapsed} status={status} />
              <div className="text-center z-10">
                <motion.p
                  className="font-mono text-4xl font-semibold text-ink tracking-tight tabular-nums"
                  animate={{ opacity: status === "paused" ? [1, 0.5, 1] : 1 }}
                  transition={status === "paused" ? { duration: 2, repeat: Infinity } : {}}
                >
                  {fmt(elapsed)}
                </motion.p>
                <p className="text-[11px] text-ink/30 font-sans mt-1 uppercase tracking-widest">
                  {Math.floor(elapsed / 60)} min
                </p>
              </div>
            </div>

            {/* Controls */}
            {!isStopped && (
              <div className="flex items-center gap-4">
                {status === "running" ? (
                  <motion.button
                    onClick={pause}
                    whileTap={{ scale: 0.94 }}
                    className="flex items-center gap-2 bg-white border border-mist text-ink px-6 py-3 rounded-2xl text-sm font-semibold font-sans shadow-[0_2px_12px_rgba(45,42,38,0.08)]"
                  >
                    <Pause size={16} fill="currentColor" strokeWidth={0} />
                    Pause
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={resume}
                    whileTap={{ scale: 0.94 }}
                    className="flex items-center gap-2 bg-white border border-mist text-ink px-6 py-3 rounded-2xl text-sm font-semibold font-sans shadow-[0_2px_12px_rgba(45,42,38,0.08)]"
                  >
                    <Play size={16} fill="currentColor" strokeWidth={0} />
                    Resume
                  </motion.button>
                )}
                <motion.button
                  onClick={stop}
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-2 bg-terracotta/10 text-terracotta border border-terracotta/20 px-6 py-3 rounded-2xl text-sm font-semibold font-sans"
                >
                  <Square size={14} fill="currentColor" strokeWidth={0} />
                  Stop
                </motion.button>
              </div>
            )}

            {/* Waiting for save panel */}
            {isStopped && !showPanel && (
              <p className="text-sm text-ink/40 font-sans mt-4">Opening save panel…</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save panel (bottom sheet) ──────────────────────────────────────── */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]"
              onClick={() => { setShowPanel(false); reset(); }}
            />
            <SavePanel onClose={() => { setShowPanel(false); }} />
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
