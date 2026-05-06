"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2, TrendingUp, TrendingDown, Minus,
  ChevronDown, Sparkles, Edit3,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { AppShell }    from "@/components/layout/AppShell";
import { Skeleton }    from "@/components/ui/Skeleton";
import { WarmTooltip } from "@/components/charts/ChartWrapper";

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_COLORS: Record<number, string> = {
  1: "#C0392B",
  2: "#C47D5A",
  3: "#C4A35A",
  4: "#8FBF95",
  5: "#6B8F71",
};
const MOOD_LABELS: Record<number, string> = {
  1: "Bad", 2: "Low", 3: "Okay", 4: "Good", 5: "Great",
};
const MOOD_EMOJI: Record<number, string> = {
  1: "😞", 2: "😕", 3: "😐", 4: "🙂", 5: "😄",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface JournalEntry {
  id:        string;
  date:      string;
  content:   string;
  mood:      number;
  energy:    number;
  createdAt: string;
}

interface Analytics {
  moodTrend:     { date: string; mood: number | null; energy: number | null }[];
  thisWkAvg:     number | null;
  lastWkAvg:     number | null;
  moodDelta:     number | null;
  correlation:   number | null;
  dominantMood:  number | null;
  totalEntries:  number;
}

// ─── Mood / Energy selector ───────────────────────────────────────────────────

function ScaleSelector({
  label, value, onChange, locked = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  locked?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-3">{label}</p>
      <div className="flex gap-2.5 items-end">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <motion.button
              key={n}
              disabled={locked}
              onClick={() => onChange(n)}
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-1.5 outline-none"
            >
              <motion.div
                animate={{
                  scale:     selected ? 1.25 : 1,
                  boxShadow: selected ? `0 0 0 3px ${MOOD_COLORS[n]}30` : "none",
                }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="rounded-full"
                style={{
                  width: 28,
                  height: 28,
                  background: selected ? MOOD_COLORS[n] : `${MOOD_COLORS[n]}35`,
                  border: `2px solid ${selected ? MOOD_COLORS[n] : "transparent"}`,
                }}
              />
              <span className={`text-[9px] font-sans leading-none transition-colors ${
                selected ? "text-ink/70" : "text-ink/25"
              }`}>
                {n}
              </span>
            </motion.button>
          );
        })}
        <span className="text-sm font-medium font-sans text-ink/40 pb-4 ml-1">
          {MOOD_LABELS[value]}
        </span>
      </div>
    </div>
  );
}

// ─── Today's Entry Card ───────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function TodayEntry({ onSaved }: { onSaved: (entry: JournalEntry) => void }) {
  const [existing, setExisting]   = useState<JournalEntry | null>(null);
  const [content, setContent]     = useState("");
  const [mood, setMood]           = useState(3);
  const [energy, setEnergy]       = useState(3);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    fetch(`/api/journal?days=1`)
      .then((r) => r.json())
      .then((entries: JournalEntry[]) => {
        const today = entries.find(
          (e) => format(new Date(e.date), "yyyy-MM-dd") === todayStr
        );
        if (today) {
          setExisting(today);
          setContent(today.content);
          setMood(today.mood);
          setEnergy(today.energy);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Auto-resize textarea
  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  }

  async function handleSave() {
    if (!content.trim()) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mood, energy }),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved: JournalEntry = await res.json();
      setExisting(saved);
      setEditing(false);
      setSaveState("saved");
      onSaved(saved);
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-7 shadow-[0_4px_24px_rgba(45,42,38,0.10)] mb-6">
        <Skeleton className="h-4 w-32 mb-5" />
        <Skeleton className="h-32 w-full mb-5" rounded="lg" />
        <Skeleton className="h-8 w-full" rounded="lg" />
      </div>
    );
  }

  const isLocked = !!existing && !editing;
  const todayDate = format(new Date(), "EEEE, d MMMM");

  return (
    <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(45,42,38,0.10)] mb-6 overflow-hidden">
      {/* Warm stripe */}
      <div
        className="h-1"
        style={{ background: `linear-gradient(90deg, ${MOOD_COLORS[mood]}, ${MOOD_COLORS[Math.min(5, mood + 1)]}88)` }}
      />

      <div className="p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-ink/35 font-sans mb-0.5">
              {existing ? "Today's Entry" : "New Entry"}
            </p>
            <p className="font-serif text-base text-ink/60">{todayDate}</p>
          </div>
          {existing && !editing && (
            <button
              onClick={() => { setEditing(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
              className="flex items-center gap-1.5 text-xs text-ink/35 hover:text-ink/60 transition-colors font-sans"
            >
              <Edit3 size={13} />
              Edit
            </button>
          )}
          {existing && editing && (
            <button
              onClick={() => { setEditing(false); setContent(existing.content); setMood(existing.mood); setEnergy(existing.energy); }}
              className="text-xs text-ink/35 hover:text-ink/60 font-sans transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Textarea */}
        <div className="relative mb-6">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="How was your day? What's on your mind?"
            disabled={isLocked}
            rows={4}
            className={[
              "w-full resize-none outline-none font-serif text-lg text-ink leading-relaxed",
              "placeholder:text-ink/25 placeholder:italic",
              "transition-colors duration-200",
              isLocked ? "bg-transparent cursor-default" : "bg-transparent",
            ].join(" ")}
            style={{ minHeight: "120px" }}
          />
          {!isLocked && content.length > 0 && (
            <p className="text-[10px] text-ink/20 font-sans text-right mt-1">{content.length} chars</p>
          )}
        </div>

        {/* Selectors */}
        <div className="space-y-5 mb-6">
          <ScaleSelector label="Mood" value={mood} onChange={setMood} locked={isLocked} />
          <ScaleSelector label="Energy" value={energy} onChange={setEnergy} locked={isLocked} />
        </div>

        {/* Save / Saved state */}
        {!isLocked && (
          <motion.button
            onClick={handleSave}
            disabled={!content.trim() || saveState === "saving"}
            whileTap={{ scale: 0.98 }}
            className={[
              "w-full py-3.5 rounded-2xl text-sm font-semibold font-sans transition-all",
              saveState === "saved"
                ? "bg-sage/15 text-sage"
                : "bg-ink text-cream shadow-[0_2px_12px_rgba(45,42,38,0.20)] hover:bg-ink/90 disabled:opacity-40",
            ].join(" ")}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={saveState}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center justify-center gap-2"
              >
                {saveState === "saved" ? (
                  <><CheckCircle2 size={15} /> Saved</>
                ) : saveState === "saving" ? (
                  "Saving…"
                ) : saveState === "error" ? (
                  "Error — try again"
                ) : existing ? (
                  "Update entry"
                ) : (
                  "Save entry"
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        )}

        {/* Locked state indicator */}
        {isLocked && (
          <div className="flex items-center gap-2 text-xs text-ink/35 font-sans">
            <div className="w-1.5 h-1.5 rounded-full bg-sage" />
            Entry saved · {MOOD_EMOJI[existing?.mood ?? 3]} {MOOD_LABELS[existing?.mood ?? 3]} mood · ⚡ {MOOD_LABELS[existing?.energy ?? 3]} energy
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mood Analytics ───────────────────────────────────────────────────────────

function MoodAnalytics({ analytics, loading }: {
  analytics: Analytics | null;
  loading: boolean;
}) {
  const hasData = analytics && analytics.totalEntries >= 3;

  const deltaBg =
    (analytics?.moodDelta ?? 0) > 0  ? "text-sage"       :
    (analytics?.moodDelta ?? 0) < 0  ? "text-terracotta"  :
                                        "text-ink/40";
  const DeltaIcon =
    (analytics?.moodDelta ?? 0) > 0  ? TrendingUp  :
    (analytics?.moodDelta ?? 0) < 0  ? TrendingDown :
                                        Minus;

  return (
    <div className="mb-8">
      <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-4">
        Mood Patterns
      </p>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-[160px] w-full" rounded="lg" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" rounded="lg" />
            <Skeleton className="h-20" rounded="lg" />
          </div>
        </div>
      ) : !hasData ? (
        <div className="bg-white rounded-2xl p-6 text-center shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <p className="text-sm text-ink/40 font-sans">Log at least 3 entries to see patterns</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Trend chart */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
            <p className="text-sm font-semibold text-ink font-sans mb-1">Mood Trend</p>
            <p className="text-[11px] text-ink/40 font-sans mb-4">Last 30 days</p>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics.moodTrend}
                  margin={{ top: 4, right: 4, bottom: 0, left: -28 }}
                >
                  <defs>
                    <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6B8F71" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6B8F71" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E8E2D8" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#8B8075", fontFamily: "var(--font-dm-sans)" }}
                    tickLine={false} axisLine={false} interval={9}
                  />
                  <YAxis
                    domain={[1, 5]} ticks={[1, 2, 3, 4, 5]}
                    tick={{ fontSize: 9, fill: "#8B8075", fontFamily: "var(--font-dm-sans)" }}
                    tickLine={false} axisLine={false}
                  />
                  <Tooltip content={(p) => (
                    <WarmTooltip {...p} formatter={(v: number) => `${v}/5`} />
                  )} />
                  <ReferenceLine y={4} stroke="#6B8F71" strokeDasharray="3 3" strokeOpacity={0.4} strokeWidth={1} />
                  <ReferenceLine y={3} stroke="#C4A35A" strokeDasharray="3 3" strokeOpacity={0.3} strokeWidth={1} />
                  <Line
                    type="monotone" dataKey="mood" stroke="#6B8F71" strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (payload.mood === null || payload.mood === undefined) return <g key={`dot-${cx}-${cy}`} />;
                      return (
                        <circle
                          key={`dot-${cx}-${cy}`}
                          cx={cx} cy={cy} r={3}
                          fill={MOOD_COLORS[payload.mood as number] ?? "#6B8F71"}
                          stroke="white" strokeWidth={1.5}
                        />
                      );
                    }}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly comparison + dominant mood */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
              <p className="text-[10px] uppercase tracking-widest text-ink/35 font-sans mb-2">
                This Week
              </p>
              <div className="flex items-end gap-2">
                <span className="font-serif text-3xl font-semibold text-ink leading-none">
                  {analytics.thisWkAvg?.toFixed(1) ?? "—"}
                </span>
                {analytics.moodDelta !== null && (
                  <span className={`flex items-center gap-0.5 text-xs font-sans pb-0.5 ${deltaBg}`}>
                    <DeltaIcon size={12} />
                    {Math.abs(analytics.moodDelta).toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink/35 font-sans mt-1">
                vs {analytics.lastWkAvg?.toFixed(1) ?? "—"} last week
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
              <p className="text-[10px] uppercase tracking-widest text-ink/35 font-sans mb-2">
                Most Common
              </p>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full shrink-0"
                  style={{ background: analytics.dominantMood ? MOOD_COLORS[analytics.dominantMood] : "#E8E2D8" }}
                />
                <div>
                  <p className="font-serif text-lg font-semibold text-ink leading-none">
                    {analytics.dominantMood ? MOOD_LABELS[analytics.dominantMood] : "—"}
                  </p>
                  <p className="text-[11px] text-ink/35 font-sans mt-0.5">mood {analytics.dominantMood ?? "?"}/5</p>
                </div>
              </div>
            </div>
          </div>

          {/* Correlation insight */}
          {analytics.correlation !== null && Math.abs(analytics.correlation) >= 5 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-parchment border border-mist/60 rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-sage/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={14} className="text-sage" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-sage font-sans font-medium mb-1">
                    Insight
                  </p>
                  <p className="text-sm text-ink font-sans leading-relaxed">
                    {analytics.correlation > 0
                      ? `On days you feel good (mood 4+), your study score is ${analytics.correlation}% higher. Protecting your mood protects your progress.`
                      : `Even on lower-mood days, you keep showing up — resilience is ${Math.abs(analytics.correlation)}% more valuable than perfect days.`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Entries List ─────────────────────────────────────────────────────────────

function EntryPreview({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false);
  const preview = entry.content.split("\n")[0].slice(0, 90);
  const hasMore = entry.content.length > preview.length || entry.content.includes("\n");

  return (
    <motion.div
      layout
      className="border-b border-mist/40 last:border-0 py-4 first:pt-0"
    >
      <button
        onClick={() => hasMore && setExpanded((e) => !e)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          {/* Mood dot */}
          <div className="mt-1 shrink-0 flex flex-col items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: MOOD_COLORS[entry.mood] }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold text-ink font-sans">
                {format(parseISO(entry.date.slice(0, 10)), "EEE, d MMM")}
              </p>
              <div className="flex gap-1 items-center ml-auto">
                <span className="text-[10px] font-sans text-ink/30">
                  {MOOD_EMOJI[entry.mood]} · ⚡{entry.energy}
                </span>
                {hasMore && (
                  <ChevronDown
                    size={12}
                    className="text-ink/25 transition-transform"
                    style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
                  />
                )}
              </div>
            </div>
            <p className={`text-sm font-serif text-ink/70 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
              {expanded ? entry.content : preview + (hasMore && !expanded ? "…" : "")}
            </p>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function EntriesList({ entries, todayDate, loading }: {
  entries: JournalEntry[];
  todayDate: string;
  loading: boolean;
}) {
  // Group by month, exclude today (shown at top)
  const past = entries.filter((e) => e.date.slice(0, 10) !== todayDate);

  const grouped: Record<string, JournalEntry[]> = {};
  for (const e of past) {
    const key = format(parseISO(e.date.slice(0, 10)), "MMMM yyyy");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" rounded="lg" />)}
      </div>
    );
  }

  if (!past.length) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-ink/30 font-sans">No past entries yet</p>
        <p className="text-xs text-ink/20 font-sans mt-1">Come back tomorrow</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([month, monthEntries]) => (
        <div key={month}>
          {/* Month header — Empaithy style */}
          <div className="mb-1">
            <h2 className="font-serif text-2xl font-semibold text-ink">{month.split(" ")[0]}</h2>
            <p className="text-xs text-ink/35 font-sans">
              {monthEntries.length} {monthEntries.length === 1 ? "entry" : "entries"}
            </p>
          </div>

          <div className="bg-white rounded-2xl px-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] mt-3">
            {monthEntries.map((e) => <EntryPreview key={e.id} entry={e} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [entries, setEntries]       = useState<JournalEntry[]>([]);
  const [analytics, setAnalytics]   = useState<Analytics | null>(null);
  const [loading, setLoading]       = useState(true);
  const [analyticsLoading, setAL]   = useState(true);
  const todayDate                   = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetch("/api/journal?days=90")
      .then((r) => r.json())
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch("/api/journal/analytics")
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setAL(false));
  }, []);

  function handleSaved(newEntry: JournalEntry) {
    setEntries((prev) => {
      const existing = prev.findIndex((e) => e.date.slice(0, 10) === todayDate);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = newEntry;
        return next;
      }
      return [newEntry, ...prev];
    });
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-7">
        <h1 className="font-serif text-3xl font-semibold text-ink">
          Your <em>Journal.</em>
        </h1>
        <p className="text-sm text-ink/40 font-sans mt-1.5">
          A quiet space to reflect on your progress
        </p>
      </div>

      {/* Today's entry */}
      <TodayEntry onSaved={handleSaved} />

      {/* Mood analytics */}
      <MoodAnalytics analytics={analytics} loading={analyticsLoading} />

      {/* Past entries */}
      <div>
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-4">
          Past Entries
        </p>
        <EntriesList
          entries={entries}
          todayDate={todayDate}
          loading={loading}
        />
      </div>
    </AppShell>
  );
}
