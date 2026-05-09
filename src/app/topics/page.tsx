"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Plus, CheckCircle2, Edit3, ChevronDown, X, Search,
  BookOpen, Star, Mic, TrendingUp, BarChart2, Users, Target,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import { AppShell }    from "@/components/layout/AppShell";
import { Badge }       from "@/components/ui/Badge";
import { Skeleton }    from "@/components/ui/Skeleton";
import { ChartWrapper, WarmTooltip, TICK, GRID_PROPS, PALETTE, CAT_COLORS } from "@/components/charts/ChartWrapper";
import type { GDTopicCategory, InterviewType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GDTopic {
  id: string; category: GDTopicCategory; topic: string;
  practiced: boolean; practiceCount: number;
  lastPracticedAt: string | null; bestScore: number | null;
}
interface IQQuestion {
  id: string; type: InterviewType; question: string;
  preparedAnswer: string | null; practiced: boolean;
  practiceCount: number; lastPracticedAt: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GD_CATS: { key: GDTopicCategory | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" }, { key: "ABSTRACT", label: "Abstract" },
  { key: "CURRENT_AFFAIRS", label: "Curr. Affairs" }, { key: "BUSINESS", label: "Business" },
  { key: "TECHNICAL", label: "Technical" }, { key: "ETHICAL", label: "Ethical" },
];
const IQ_TYPES: { key: InterviewType | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" }, { key: "HR", label: "HR" },
  { key: "TECHNICAL", label: "Technical" }, { key: "SYSTEM_DESIGN", label: "System Design" },
];

function fmtDate(d: string | null) {
  if (!d) return "Never";
  try { return format(parseISO(d.slice(0, 10)), "d MMM"); } catch { return "—"; }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function FilterPills<T extends string>({ options, active, onChange }: {
  options: { key: T; label: string }[]; active: T; onChange: (k: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none mb-4">
      {options.map(({ key, label }) => (
        <motion.button key={key} onClick={() => onChange(key)} whileTap={{ scale: 0.95 }}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium font-sans transition-all ${
            active === key ? "bg-ink text-cream shadow-[0_2px_8px_rgba(45,42,38,0.20)]"
                          : "bg-white text-ink/50 border border-mist/60 hover:border-mist"}`}>
          {label}
        </motion.button>
      ))}
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative mb-4">
      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search…"
        className="w-full bg-white border border-mist/60 rounded-2xl pl-9 pr-4 py-2.5 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30 transition-colors"
      />
    </div>
  );
}

function StatsRow({ total, practiced }: { total: number; practiced: number }) {
  const pct = total > 0 ? Math.round((practiced / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4 mb-4">
      <p className="text-xs text-ink/40 font-sans">{total} topics</p>
      <div className="flex items-center gap-1.5">
        <div className="w-20 h-1.5 rounded-full bg-mist overflow-hidden">
          <motion.div className="h-full rounded-full bg-sage" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
        </div>
        <span className="text-xs text-ink/40 font-sans">{pct}% done</span>
      </div>
    </div>
  );
}

function SheetModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
        style={{ boxShadow: "0 -8px 40px rgba(45,42,38,0.16)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-mist/60 text-ink/40"><X size={16} /></button>
        </div>
        {children}
      </motion.div>
    </>
  );
}

// ─── GD Session Log Modal ─────────────────────────────────────────────────────

function GDSessionModal({ topic, onClose, onLogged }: {
  topic: GDTopic; onClose: () => void; onLogged: (updated: GDTopic) => void;
}) {
  const [score, setScore]               = useState(7);
  const [duration, setDuration]         = useState(15);
  const [groupSize, setGroupSize]       = useState(5);
  const [keyArgument, setKeyArgument]   = useState("");
  const [whatWentWell, setWentWell]     = useState("");
  const [whatToImprove, setImprove]     = useState("");
  const [initiated, setInitiated]       = useState(false);
  const [concluded, setConcluded]       = useState(false);
  const [saving, setSaving]             = useState(false);

  async function submit() {
    setSaving(true);
    const res = await fetch(`/api/topics/gd/${topic.id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, durationMin: duration, groupSize, keyArgument, whatWentWell, whatToImprove, initiated, concluded }),
    });
    if (res.ok) {
      onLogged({
        ...topic,
        practiced: true,
        practiceCount: topic.practiceCount + 1,
        lastPracticedAt: new Date().toISOString(),
        bestScore: topic.bestScore === null ? score : Math.max(topic.bestScore, score),
      });
      onClose();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-sans text-ink/40 mb-1">Topic</p>
        <p className="text-sm font-sans text-ink font-medium leading-snug">{topic.topic}</p>
      </div>

      {/* Score */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans">Performance Score</p>
          <span className="font-serif text-2xl font-semibold text-ink">{score}<span className="text-sm text-ink/30">/10</span></span>
        </div>
        <input type="range" min={1} max={10} value={score} onChange={(e) => setScore(Number(e.target.value))}
          className="w-full accent-sage" />
        <div className="flex justify-between text-[10px] text-ink/25 font-sans mt-1">
          <span>Weak</span><span>Average</span><span>Strong</span>
        </div>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Duration (min)", value: duration, set: setDuration, min: 1, max: 120 },
          { label: "Group Size", value: groupSize, set: setGroupSize, min: 2, max: 20 },
        ].map(({ label, value, set, min, max }) => (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-1">{label}</p>
            <input type="number" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))}
              className="w-full bg-cream border border-mist rounded-xl px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-sage/30" />
          </div>
        ))}
      </div>

      {/* Checkboxes */}
      <div className="flex gap-4">
        {[
          { label: "I initiated the topic", value: initiated, set: setInitiated },
          { label: "I concluded the group", value: concluded, set: setConcluded },
        ].map(({ label, value, set }) => (
          <label key={label} className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => set(!value)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${value ? "bg-sage border-sage" : "border-mist"}`}>
              {value && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <span className="text-xs font-sans text-ink/60">{label}</span>
          </label>
        ))}
      </div>

      {/* Text fields */}
      {[
        { label: "Key Argument Made", value: keyArgument, set: setKeyArgument, ph: "The main point I argued or countered…" },
        { label: "What Went Well", value: whatWentWell, set: setWentWell, ph: "Strong points, good examples, clear structure…" },
        { label: "What to Improve", value: whatToImprove, set: setImprove, ph: "Spoke too fast, missed counter-argument…" },
      ].map(({ label, value, set, ph }) => (
        <div key={label}>
          <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-1">{label}</p>
          <textarea value={value} onChange={(e) => set(e.target.value)} placeholder={ph} rows={2}
            className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none" />
        </div>
      ))}

      <button onClick={submit} disabled={saving}
        className="w-full bg-sage text-white rounded-2xl py-3.5 text-sm font-semibold font-sans disabled:opacity-40 shadow-[0_2px_12px_rgba(107,143,113,0.30)] hover:bg-sage/90 transition-colors">
        {saving ? "Logging…" : "Log Session"}
      </button>
    </div>
  );
}

// ─── Interview Attempt Modal ──────────────────────────────────────────────────

function InterviewAttemptModal({ question, onClose, onLogged }: {
  question: IQQuestion; onClose: () => void; onLogged: (updated: IQQuestion) => void;
}) {
  const [rating, setRating]         = useState(3);
  const [notes, setNotes]           = useState("");
  const [whatWentWell, setWentWell] = useState("");
  const [whatToImprove, setImprove] = useState("");
  const [saving, setSaving]         = useState(false);

  async function submit() {
    if (!notes.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/topics/interview/${question.id}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, notes, whatWentWell, whatToImprove }),
    });
    if (res.ok) {
      onLogged({
        ...question,
        practiced: true,
        practiceCount: question.practiceCount + 1,
        lastPracticedAt: new Date().toISOString(),
      });
      onClose();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-sans text-ink/40 mb-1">Question</p>
        <p className="text-sm font-sans text-ink font-medium leading-snug">{question.question}</p>
      </div>

      {/* Star rating */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-3">Self Rating</p>
        <div className="flex gap-3 justify-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)}>
              <Star size={28} className={n <= rating ? "text-gold" : "text-mist"}
                fill={n <= rating ? "currentColor" : "none"} strokeWidth={n <= rating ? 0 : 1.5} />
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-ink/35 font-sans mt-2">
          {["", "Needs work", "Below average", "Average", "Good", "Excellent"][rating]}
        </p>
      </div>

      {/* Text fields */}
      {[
        { label: "How did my answer go? *", value: notes, set: setNotes, ph: "What I said, structure I used, examples…", required: true },
        { label: "What Went Well", value: whatWentWell, set: setWentWell, ph: "Clear structure, strong example, good delivery…" },
        { label: "What to Improve", value: whatToImprove, set: setImprove, ph: "Rambled, missed the STAR format, weak ending…" },
      ].map(({ label, value, set, ph }) => (
        <div key={label}>
          <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-1">{label}</p>
          <textarea value={value} onChange={(e) => set(e.target.value)} placeholder={ph} rows={3}
            className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/30 resize-none" />
        </div>
      ))}

      <button onClick={submit} disabled={!notes.trim() || saving}
        className="w-full bg-gold/90 text-white rounded-2xl py-3.5 text-sm font-semibold font-sans disabled:opacity-40 hover:bg-gold transition-colors shadow-[0_2px_12px_rgba(196,163,90,0.25)]">
        {saving ? "Logging…" : "Log Attempt"}
      </button>
    </div>
  );
}

// ─── GD Topic Card ────────────────────────────────────────────────────────────

function TopicCard({ topic, onPractice, onUpdate }: {
  topic: GDTopic; onPractice: (t: GDTopic) => void; onUpdate: (t: GDTopic) => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)] border border-transparent"
      style={!topic.practiced ? { borderColor: "rgba(107,143,113,0.15)" } : {}}>
      <div className="flex items-start gap-2.5 mb-3">
        {!topic.practiced
          ? <div className="w-2 h-2 rounded-full bg-sage mt-1.5 shrink-0 animate-pulse" />
          : <CheckCircle2 size={14} className="text-sage/50 mt-1 shrink-0" />}
        <p className="text-sm font-sans text-ink leading-snug">{topic.topic}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Badge variant={topic.category as GDTopicCategory} />
        {topic.practiced && (
          <span className="text-[11px] text-ink/35 font-sans">{topic.practiceCount}× · {fmtDate(topic.lastPracticedAt)}</span>
        )}
        {topic.bestScore !== null && (
          <span className="flex items-center gap-0.5 text-[11px] text-gold font-sans ml-auto">
            <Star size={10} fill="currentColor" />{topic.bestScore}/10
          </span>
        )}
      </div>
      <button onClick={() => onPractice(topic)}
        className="flex items-center gap-1.5 bg-sage text-white rounded-xl px-3 py-1.5 text-xs font-semibold font-sans hover:bg-sage/90 transition-colors shadow-[0_1px_4px_rgba(107,143,113,0.30)]">
        <BarChart2 size={11} /> Log Session
      </button>
    </motion.div>
  );
}

// ─── Interview Question Card ──────────────────────────────────────────────────

function QuestionCard({ question, onPractice, onUpdate }: {
  question: IQQuestion; onPractice: (q: IQQuestion) => void; onUpdate: (q: IQQuestion) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [answer, setAnswer]     = useState(question.preparedAnswer ?? "");
  const [saving, setSaving]     = useState(false);
  const [localQ, setLocalQ]     = useState(question);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function handleSaveAnswer() {
    setSaving(true);
    const res = await fetch(`/api/topics/interview/${question.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateAnswer", preparedAnswer: answer }),
    });
    if (res.ok) { setLocalQ(await res.json()); setEditing(false); }
    setSaving(false);
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
      <button onClick={() => setExpanded((e) => !e)} className="w-full text-left">
        <div className="flex items-start gap-2 mb-2">
          {!localQ.practiced
            ? <div className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0 animate-pulse" />
            : <CheckCircle2 size={14} className="text-sage/50 mt-1 shrink-0" />}
          <p className="text-sm font-sans text-ink leading-snug flex-1">{localQ.question}</p>
          <ChevronDown size={14} className="text-ink/25 mt-0.5 shrink-0 transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }} />
        </div>
      </button>
      <div className="flex items-center gap-2 mb-3 ml-4">
        <Badge variant={localQ.type} />
        {localQ.practiced && <span className="text-[11px] text-ink/35 font-sans">{localQ.practiceCount}× · {fmtDate(localQ.lastPracticedAt)}</span>}
        {localQ.preparedAnswer && <span className="text-[11px] text-sage font-sans ml-auto flex items-center gap-1"><CheckCircle2 size={10} /> Ready</span>}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="border-t border-mist/40 pt-3 mb-3 ml-4">
              {editing ? (
                <div className="space-y-2">
                  <textarea ref={textRef} value={answer} onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Prepared answer using STAR method…" rows={5} autoFocus
                    className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none leading-relaxed" />
                  <div className="flex gap-2">
                    <button onClick={handleSaveAnswer} disabled={saving}
                      className="flex-1 bg-sage text-white rounded-xl py-2 text-xs font-semibold font-sans disabled:opacity-40">
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => { setEditing(false); setAnswer(localQ.preparedAnswer ?? ""); }}
                      className="px-3 py-2 rounded-xl bg-mist/60 text-ink/50 text-xs font-sans">Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  {localQ.preparedAnswer
                    ? <p className="text-sm font-sans text-ink/65 leading-relaxed mb-2 whitespace-pre-wrap">{localQ.preparedAnswer}</p>
                    : <p className="text-xs text-ink/30 font-sans italic mb-2">No prepared answer yet</p>}
                  <button onClick={() => { setEditing(true); setTimeout(() => textRef.current?.focus(), 50); }}
                    className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-ink/70 font-sans">
                    <Edit3 size={11} /> {localQ.preparedAnswer ? "Edit answer" : "Add answer"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 ml-4">
        <button onClick={() => onPractice(localQ)}
          className="flex items-center gap-1.5 bg-gold/90 text-white rounded-xl px-3 py-1.5 text-xs font-semibold font-sans hover:bg-gold transition-colors shadow-[0_1px_4px_rgba(196,163,90,0.30)]">
          <Mic size={11} strokeWidth={2} /> Log Attempt
        </button>
      </div>
    </motion.div>
  );
}

// ─── Add modals ───────────────────────────────────────────────────────────────

function AddTopicModal({ onClose, onAdded }: { onClose: () => void; onAdded: (t: GDTopic) => void }) {
  const [topic, setTopic]       = useState("");
  const [category, setCategory] = useState<GDTopicCategory>("ABSTRACT");
  const [saving, setSaving]     = useState(false);

  async function handleAdd() {
    if (!topic.trim()) return;
    setSaving(true);
    const res = await fetch("/api/topics/gd", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, category }) });
    if (res.ok) { onAdded(await res.json()); onClose(); }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-ink/40 font-sans mb-1.5">Topic</label>
        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} autoFocus
          placeholder="e.g. AI regulation — India lead or follow?"
          className="w-full bg-cream border border-mist rounded-xl px-4 py-3 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30" />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink/40 font-sans mb-1.5">Category</label>
        <div className="flex flex-wrap gap-2">
          {(["ABSTRACT","CURRENT_AFFAIRS","BUSINESS","TECHNICAL","ETHICAL"] as GDTopicCategory[]).map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium font-sans transition-all ${category === c ? "bg-ink text-cream" : "bg-mist/60 text-ink/50"}`}>
              {c.replace(/_/g," ")}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleAdd} disabled={!topic.trim() || saving}
        className="w-full bg-sage text-white rounded-2xl py-3.5 text-sm font-semibold font-sans disabled:opacity-40 shadow-[0_2px_12px_rgba(107,143,113,0.30)] hover:bg-sage/90 transition-colors">
        {saving ? "Adding…" : "Add Topic"}
      </button>
    </div>
  );
}

function AddQuestionModal({ onClose, onAdded }: { onClose: () => void; onAdded: (q: IQQuestion) => void }) {
  const [question, setQuestion] = useState("");
  const [type, setType]         = useState<InterviewType>("HR");
  const [saving, setSaving]     = useState(false);

  async function handleAdd() {
    if (!question.trim()) return;
    setSaving(true);
    const res = await fetch("/api/topics/interview", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, type }) });
    if (res.ok) { onAdded(await res.json()); onClose(); }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-ink/40 font-sans mb-1.5">Question</label>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} autoFocus
          placeholder="e.g. Tell me about a time you led a team through failure."
          className="w-full bg-cream border border-mist rounded-xl px-4 py-3 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink/40 font-sans mb-1.5">Type</label>
        <div className="flex gap-2">
          {(["HR","TECHNICAL","SYSTEM_DESIGN"] as InterviewType[]).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium font-sans transition-all ${type === t ? "bg-ink text-cream" : "bg-mist/60 text-ink/50"}`}>
              {t.replace(/_/g," ")}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleAdd} disabled={!question.trim() || saving}
        className="w-full bg-gold/90 text-white rounded-2xl py-3.5 text-sm font-semibold font-sans disabled:opacity-40 hover:bg-gold transition-colors shadow-[0_2px_12px_rgba(196,163,90,0.25)]">
        {saving ? "Adding…" : "Add Question"}
      </button>
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

interface TopicAnalytics {
  gd: {
    totalSessions: number; practicedTopics: number;
    initiationRate: number; conclusionRate: number; avgGroupSize: number | null;
    scoreTrend: { week: string; avgScore: number; sessions: number }[];
    categoryPerf: { category: string; avgScore: number; sessions: number }[];
  };
  interview: {
    totalAttempts: number; practicedQuestions: number;
    ratingTrend: Record<string, number | string>[];
    typePerf: { type: string; avgRating: number; attempts: number }[];
    mostImproved: { question: string; type: string; first: number; last: number; delta: number }[];
  };
}

function AnalyticsTab() {
  const [data, setData]     = useState<TopicAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/topics/analytics")
      .then((r) => r.json()).then(setData).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[0,1,2,3].map((i) => <Skeleton key={i} className="h-40" rounded="lg" />)}
    </div>
  );

  const hasGDData = (data?.gd.totalSessions ?? 0) > 0;
  const hasIQData = (data?.interview.totalAttempts ?? 0) > 0;

  return (
    <div className="space-y-6 pb-6">

      {/* ── GD Analytics ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-3">GD Performance</p>

        {!hasGDData ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
            <Users size={24} className="text-ink/15 mx-auto mb-2" />
            <p className="text-sm text-ink/30 font-sans">Log GD sessions to see analytics</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* GD stats row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Sessions", value: data!.gd.totalSessions, color: "text-sage" },
                { label: "Topics Practiced", value: data!.gd.practicedTopics, color: "text-ink" },
                { label: "Initiated %", value: `${data!.gd.initiationRate}%`, color: "text-gold" },
                { label: "Concluded %", value: `${data!.gd.conclusionRate}%`, color: "text-violet-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
                  <p className={`font-serif text-xl font-semibold ${color}`}>{value}</p>
                  <p className="text-[10px] text-ink/35 font-sans mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* GD Score trend */}
            {data!.gd.scoreTrend.length > 0 && (
              <ChartWrapper title="Score Trend" subtitle="Weekly average GD score" height={160}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data!.gd.scoreTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 10]} tick={TICK} tickLine={false} axisLine={false} />
                    <Tooltip content={(p) => <WarmTooltip {...p} formatter={(v: number) => `${v}/10`} />} />
                    <Line type="monotone" dataKey="avgScore" name="Avg Score" stroke={PALETTE.sage} strokeWidth={2.5}
                      dot={{ r: 3, fill: PALETTE.sage }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartWrapper>
            )}

            {/* Category performance */}
            {data!.gd.categoryPerf.length > 0 && (
              <ChartWrapper title="Category Performance" subtitle="Avg score & sessions per GD category" height={180}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.gd.categoryPerf} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} domain={[0, 10]} />
                    <YAxis dataKey="category" type="category"
                      tick={{ fontSize: 9, fill: "#8B8075", fontFamily: "var(--font-dm-sans)" }}
                      tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={(p) => <WarmTooltip {...p} formatter={(v: number) => `${v}/10`} />} />
                    <Bar dataKey="avgScore" name="Avg Score" fill={PALETTE.sage} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            )}
          </div>
        )}
      </div>

      {/* ── Interview Analytics ────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-3">Interview Performance</p>

        {!hasIQData ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
            <Mic size={24} className="text-ink/15 mx-auto mb-2" />
            <p className="text-sm text-ink/30 font-sans">Log interview attempts to see analytics</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* IQ stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Attempts", value: data!.interview.totalAttempts, color: "text-gold" },
                { label: "Questions Practiced", value: data!.interview.practicedQuestions, color: "text-ink" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
                  <p className={`font-serif text-xl font-semibold ${color}`}>{value}</p>
                  <p className="text-[10px] text-ink/35 font-sans mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Rating trend by type */}
            {data!.interview.ratingTrend.length > 1 && (
              <ChartWrapper title="Rating Trend" subtitle="Weekly avg self-rating by question type" height={180}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data!.interview.ratingTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 5]} tick={TICK} tickLine={false} axisLine={false} />
                    <Tooltip content={(p) => <WarmTooltip {...p} formatter={(v: number) => `${v}/5 ⭐`} />} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-dm-sans)" }} />
                    {["HR","TECHNICAL","SYSTEM_DESIGN"].map((type, i) => (
                      <Line key={type} type="monotone" dataKey={type}
                        stroke={[PALETTE.gold, PALETTE.sage, "#8B5CF6"][i]}
                        strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartWrapper>
            )}

            {/* Type performance */}
            {data!.interview.typePerf.length > 0 && (
              <ChartWrapper title="Performance by Category" subtitle="Average rating per interview type" height={140}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.interview.typePerf} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="type" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 5]} tick={TICK} tickLine={false} axisLine={false} />
                    <Tooltip content={(p) => <WarmTooltip {...p} formatter={(v: number) => `${v}/5 ⭐`} />} />
                    <Bar dataKey="avgRating" name="Avg Rating" fill={PALETTE.gold} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            )}

            {/* Most improved */}
            {data!.interview.mostImproved.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
                <p className="text-sm font-semibold text-ink font-sans mb-3">Most Improved Questions</p>
                <div className="space-y-3">
                  {data!.interview.mostImproved.map((q, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-sans text-ink leading-snug truncate">{q.question}…</p>
                        <p className="text-[10px] text-ink/35 font-sans mt-0.5">{q.first}/5 → {q.last}/5</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <TrendingUp size={12} className="text-sage" />
                        <span className="text-xs font-mono font-semibold text-sage">+{q.delta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── GD Tab ───────────────────────────────────────────────────────────────────

function GDTab() {
  const [topics, setTopics]         = useState<GDTopic[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<GDTopicCategory | "ALL">("ALL");
  const [search, setSearch]         = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [practicing, setPracticing] = useState<GDTopic | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = filter === "ALL" ? "/api/topics/gd" : `/api/topics/gd?category=${filter}`;
    fetch(url).then((r) => r.json()).then(setTopics).catch(console.error).finally(() => setLoading(false));
  }, [filter]);

  const filtered = topics.filter((t) => !search || t.topic.toLowerCase().includes(search.toLowerCase()));
  const practiced = filtered.filter((t) => t.practiced).length;

  return (
    <div className="relative">
      <FilterPills options={GD_CATS} active={filter} onChange={setFilter} />
      <SearchBar value={search} onChange={setSearch} />
      <StatsRow total={filtered.length} practiced={practiced} />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" rounded="lg" />)}</div>
      ) : (
        <div className="space-y-3 pb-24">
          {filtered.length === 0
            ? <div className="text-center py-12"><BookOpen size={24} className="text-ink/20 mx-auto mb-2" strokeWidth={1.5} /><p className="text-sm text-ink/30 font-sans">No topics found</p></div>
            : filtered.map((t) => (
              <TopicCard key={t.id} topic={t} onPractice={setPracticing}
                onUpdate={(updated) => setTopics((prev) => prev.map((x) => x.id === updated.id ? updated : x))} />
            ))}
        </div>
      )}

      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 bg-sage text-white rounded-full pl-4 pr-5 py-3 shadow-[0_4px_20px_rgba(107,143,113,0.40)] hover:bg-sage/90 transition-colors font-sans text-sm font-semibold">
        <Plus size={16} strokeWidth={2.5} /> Add Topic
      </motion.button>

      <AnimatePresence>
        {showAdd && (
          <SheetModal title="Add GD Topic" onClose={() => setShowAdd(false)}>
            <AddTopicModal onClose={() => setShowAdd(false)} onAdded={(t) => setTopics((prev) => [t, ...prev])} />
          </SheetModal>
        )}
        {practicing && (
          <SheetModal title="Log GD Session" onClose={() => setPracticing(null)}>
            <GDSessionModal topic={practicing} onClose={() => setPracticing(null)}
              onLogged={(updated) => {
                setTopics((prev) => prev.map((x) => x.id === updated.id ? updated : x));
                setPracticing(null);
              }} />
          </SheetModal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Interview Tab ────────────────────────────────────────────────────────────

function InterviewTab() {
  const [questions, setQuestions]   = useState<IQQuestion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<InterviewType | "ALL">("ALL");
  const [search, setSearch]         = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [practicing, setPracticing] = useState<IQQuestion | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = filter === "ALL" ? "/api/topics/interview" : `/api/topics/interview?type=${filter}`;
    fetch(url).then((r) => r.json()).then(setQuestions).catch(console.error).finally(() => setLoading(false));
  }, [filter]);

  const filtered = questions.filter((q) => !search || q.question.toLowerCase().includes(search.toLowerCase()));
  const practiced = filtered.filter((q) => q.practiced).length;

  return (
    <div className="relative">
      <FilterPills options={IQ_TYPES} active={filter} onChange={setFilter} />
      <SearchBar value={search} onChange={setSearch} />
      <StatsRow total={filtered.length} practiced={practiced} />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" rounded="lg" />)}</div>
      ) : (
        <div className="space-y-3 pb-24">
          {filtered.length === 0
            ? <div className="text-center py-12"><Mic size={24} className="text-ink/20 mx-auto mb-2" strokeWidth={1.5} /><p className="text-sm text-ink/30 font-sans">No questions found</p></div>
            : filtered.map((q) => (
              <QuestionCard key={q.id} question={q} onPractice={setPracticing}
                onUpdate={(updated) => setQuestions((prev) => prev.map((x) => x.id === updated.id ? updated : x))} />
            ))}
        </div>
      )}

      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 bg-gold/90 text-white rounded-full pl-4 pr-5 py-3 shadow-[0_4px_20px_rgba(196,163,90,0.35)] hover:bg-gold transition-colors font-sans text-sm font-semibold">
        <Plus size={16} strokeWidth={2.5} /> Add Question
      </motion.button>

      <AnimatePresence>
        {showAdd && (
          <SheetModal title="Add Interview Question" onClose={() => setShowAdd(false)}>
            <AddQuestionModal onClose={() => setShowAdd(false)} onAdded={(q) => setQuestions((prev) => [q, ...prev])} />
          </SheetModal>
        )}
        {practicing && (
          <SheetModal title="Log Attempt" onClose={() => setPracticing(null)}>
            <InterviewAttemptModal question={practicing} onClose={() => setPracticing(null)}
              onLogged={(updated) => {
                setQuestions((prev) => prev.map((x) => x.id === updated.id ? updated : x));
                setPracticing(null);
              }} />
          </SheetModal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "gd" | "interview" | "analytics";

export default function TopicsPage() {
  const [tab, setTab] = useState<Tab>("gd");

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="font-serif text-3xl font-semibold text-ink">Your <em>Bank.</em></h1>
        <p className="text-sm text-ink/40 font-sans mt-1">GD topics, interview questions and your progress curves</p>
      </div>

      <div className="flex gap-1 bg-mist/50 rounded-2xl p-1 mb-5">
        {([
          { key: "gd",        label: "GD Topics"  },
          { key: "interview", label: "Interview Q" },
          { key: "analytics", label: "Analytics"  },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="relative flex-1 py-2.5 text-sm font-medium font-sans rounded-xl"
            style={{ color: tab === key ? "#2D2A26" : "#8B8075" }}>
            {tab === key && (
              <motion.div layoutId="topic-tab"
                className="absolute inset-0 bg-white rounded-xl shadow-[0_1px_4px_rgba(45,42,38,0.10)]"
                transition={{ type: "spring", damping: 20, stiffness: 300 }} />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          {tab === "gd"        && <GDTab />}
          {tab === "interview" && <InterviewTab />}
          {tab === "analytics" && <AnalyticsTab />}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
