"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Plus, Play, CheckCircle2, Edit3, ChevronDown,
  X, Search, BookOpen, Star, Mic,
} from "lucide-react";
import { AppShell }  from "@/components/layout/AppShell";
import { Badge }     from "@/components/ui/Badge";
import { Skeleton }  from "@/components/ui/Skeleton";
import { useTimer }  from "@/context/TimerContext";
import type { GDTopicCategory, InterviewType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GDTopic {
  id:              string;
  category:        GDTopicCategory;
  topic:           string;
  practiced:       boolean;
  practiceCount:   number;
  lastPracticedAt: string | null;
  bestScore:       number | null;
}

interface IQQuestion {
  id:              string;
  type:            InterviewType;
  question:        string;
  preparedAnswer:  string | null;
  practiced:       boolean;
  practiceCount:   number;
  lastPracticedAt: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GD_CATS: { key: GDTopicCategory | "ALL"; label: string }[] = [
  { key: "ALL",           label: "All"            },
  { key: "ABSTRACT",      label: "Abstract"       },
  { key: "CURRENT_AFFAIRS",label:"Curr. Affairs"  },
  { key: "BUSINESS",      label: "Business"       },
  { key: "TECHNICAL",     label: "Technical"      },
  { key: "ETHICAL",       label: "Ethical"        },
];

const IQ_TYPES: { key: InterviewType | "ALL"; label: string }[] = [
  { key: "ALL",           label: "All"            },
  { key: "HR",            label: "HR"             },
  { key: "TECHNICAL",     label: "Technical"      },
  { key: "SYSTEM_DESIGN", label: "System Design"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "Never";
  try { return format(parseISO(d.slice(0, 10)), "d MMM"); }
  catch { return "—"; }
}

// ─── Filter Pills ─────────────────────────────────────────────────────────────

function FilterPills<T extends string>({
  options, active, onChange,
}: {
  options: { key: T; label: string }[];
  active: T;
  onChange: (k: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none mb-4">
      {options.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <motion.button
            key={key}
            onClick={() => onChange(key)}
            whileTap={{ scale: 0.95 }}
            className={[
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium font-sans transition-all",
              isActive
                ? "bg-ink text-cream shadow-[0_2px_8px_rgba(45,42,38,0.20)]"
                : "bg-white text-ink/50 border border-mist/60 hover:border-mist",
            ].join(" ")}
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative mb-4">
      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search…"
        className="w-full bg-white border border-mist/60 rounded-2xl pl-9 pr-4 py-2.5 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 transition-colors"
      />
    </div>
  );
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function StatsRow({ total, practiced }: { total: number; practiced: number }) {
  const pct = total > 0 ? Math.round((practiced / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4 mb-4">
      <p className="text-xs text-ink/40 font-sans">{total} topics</p>
      <div className="flex items-center gap-1.5">
        <div className="w-20 h-1.5 rounded-full bg-mist overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-sage"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
        <span className="text-xs text-ink/40 font-sans">{pct}% done</span>
      </div>
    </div>
  );
}

// ─── GD Topic Card ────────────────────────────────────────────────────────────

function TopicCard({
  topic, onPractice, onMarkPracticed,
}: {
  topic: GDTopic;
  onPractice: (t: GDTopic) => void;
  onMarkPracticed: (id: string) => void;
}) {
  const [marking, setMarking] = useState(false);
  const [localPracticed, setLocalPracticed] = useState(topic.practiced);

  async function handleMark() {
    setMarking(true);
    try {
      await fetch(`/api/topics/gd/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "practice" }),
      });
      setLocalPracticed(true);
      onMarkPracticed(topic.id);
    } finally {
      setMarking(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)] border border-transparent"
      style={!localPracticed ? { borderColor: "rgba(107,143,113,0.15)" } : {}}
    >
      {/* Topic + dot */}
      <div className="flex items-start gap-2.5 mb-3">
        {!localPracticed && (
          <div className="w-2 h-2 rounded-full bg-sage mt-1.5 shrink-0 animate-pulse" />
        )}
        {localPracticed && (
          <CheckCircle2 size={14} className="text-sage/50 mt-1 shrink-0" />
        )}
        <p className="text-sm font-sans text-ink leading-snug">{topic.topic}</p>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Badge variant={topic.category as GDTopicCategory} />
        {topic.practiced && (
          <>
            <span className="text-[11px] text-ink/35 font-sans">
              {topic.practiceCount}× · {fmtDate(topic.lastPracticedAt)}
            </span>
            {topic.bestScore !== null && (
              <span className="flex items-center gap-0.5 text-[11px] text-gold font-sans ml-auto">
                <Star size={10} fill="currentColor" />
                {topic.bestScore}/10
              </span>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onPractice(topic)}
          className="flex items-center gap-1.5 bg-sage text-white rounded-xl px-3 py-1.5 text-xs font-semibold font-sans hover:bg-sage/90 transition-colors shadow-[0_1px_4px_rgba(107,143,113,0.30)]"
        >
          <Play size={11} fill="currentColor" strokeWidth={0} />
          Practice
        </button>
        {!localPracticed && (
          <button
            onClick={handleMark}
            disabled={marking}
            className="flex items-center gap-1.5 bg-mist/60 border border-mist text-ink/60 rounded-xl px-3 py-1.5 text-xs font-medium font-sans hover:bg-mist transition-colors disabled:opacity-40"
          >
            <CheckCircle2 size={11} />
            {marking ? "Saving…" : "Mark done"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Interview Question Card ──────────────────────────────────────────────────

function QuestionCard({
  question, onPractice,
}: {
  question: IQQuestion;
  onPractice: (q: IQQuestion) => void;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [editing, setEditing]     = useState(false);
  const [answer, setAnswer]       = useState(question.preparedAnswer ?? "");
  const [saving, setSaving]       = useState(false);
  const [marking, setMarking]     = useState(false);
  const [localQ, setLocalQ]       = useState(question);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function handleSaveAnswer() {
    setSaving(true);
    try {
      const res = await fetch(`/api/topics/interview/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateAnswer", preparedAnswer: answer }),
      });
      const updated = await res.json();
      setLocalQ(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleMark() {
    setMarking(true);
    try {
      const res = await fetch(`/api/topics/interview/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "practice" }),
      });
      const updated = await res.json();
      setLocalQ(updated);
    } finally {
      setMarking(false);
    }
  }

  const hasAnswer = !!localQ.preparedAnswer;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)]"
    >
      {/* Question + expand toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-2 mb-2">
          {!localQ.practiced ? (
            <div className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0 animate-pulse" />
          ) : (
            <CheckCircle2 size={14} className="text-sage/50 mt-1 shrink-0" />
          )}
          <p className="text-sm font-sans text-ink leading-snug flex-1">{localQ.question}</p>
          <ChevronDown
            size={14}
            className="text-ink/25 mt-0.5 shrink-0 transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
          />
        </div>
      </button>

      {/* Meta */}
      <div className="flex items-center gap-2 mb-3 ml-4">
        <Badge variant={localQ.type} />
        {localQ.practiced && (
          <span className="text-[11px] text-ink/35 font-sans">
            {localQ.practiceCount}× · {fmtDate(localQ.lastPracticedAt)}
          </span>
        )}
        {hasAnswer && (
          <span className="text-[11px] text-sage font-sans ml-auto flex items-center gap-1">
            <CheckCircle2 size={10} /> Answer ready
          </span>
        )}
      </div>

      {/* Expandable: answer section */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-mist/40 pt-3 mb-3 ml-4">
              {editing ? (
                <div className="space-y-2">
                  <textarea
                    ref={textRef}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your prepared answer using the STAR method…"
                    rows={5}
                    className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none leading-relaxed"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveAnswer}
                      disabled={saving}
                      className="flex-1 bg-sage text-white rounded-xl py-2 text-xs font-semibold font-sans hover:bg-sage/90 disabled:opacity-40 transition-colors"
                    >
                      {saving ? "Saving…" : "Save answer"}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setAnswer(localQ.preparedAnswer ?? ""); }}
                      className="px-3 py-2 rounded-xl bg-mist/60 text-ink/50 text-xs font-sans"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {hasAnswer ? (
                    <p className="text-sm font-sans text-ink/65 leading-relaxed mb-2 whitespace-pre-wrap">
                      {localQ.preparedAnswer}
                    </p>
                  ) : (
                    <p className="text-xs text-ink/30 font-sans italic mb-2">
                      No prepared answer yet — write one using the STAR method.
                    </p>
                  )}
                  <button
                    onClick={() => { setEditing(true); setTimeout(() => textRef.current?.focus(), 50); }}
                    className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-ink/70 font-sans transition-colors"
                  >
                    <Edit3 size={11} />
                    {hasAnswer ? "Edit answer" : "Add answer"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-2 ml-4">
        <button
          onClick={() => onPractice(localQ)}
          className="flex items-center gap-1.5 bg-gold/90 text-white rounded-xl px-3 py-1.5 text-xs font-semibold font-sans hover:bg-gold transition-colors shadow-[0_1px_4px_rgba(196,163,90,0.30)]"
        >
          <Mic size={11} strokeWidth={2} />
          Practice
        </button>
        {!localQ.practiced && (
          <button
            onClick={handleMark}
            disabled={marking}
            className="flex items-center gap-1.5 bg-mist/60 border border-mist text-ink/50 rounded-xl px-3 py-1.5 text-xs font-medium font-sans hover:bg-mist transition-colors disabled:opacity-40"
          >
            <CheckCircle2 size={11} />
            {marking ? "Saving…" : "Mark done"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Add Modal (shared shell) ─────────────────────────────────────────────────

function AddModal({
  title, onClose, children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl p-6"
        style={{ boxShadow: "0 -8px 40px rgba(45,42,38,0.16)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-mist/60 text-ink/40">
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </>
  );
}

// ─── Add GD Topic modal ───────────────────────────────────────────────────────

function AddTopicModal({ onClose, onAdded }: {
  onClose: () => void;
  onAdded: (t: GDTopic) => void;
}) {
  const [topic, setTopic]       = useState("");
  const [category, setCategory] = useState<GDTopicCategory>("ABSTRACT");
  const [saving, setSaving]     = useState(false);

  async function handleAdd() {
    if (!topic.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/topics/gd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, category }),
      });
      const created = await res.json();
      onAdded(created);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-ink/40 font-sans mb-1.5">Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. AI regulation — India lead or follow?"
          autoFocus
          className="w-full bg-cream border border-mist rounded-xl px-4 py-3 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink/40 font-sans mb-1.5">Category</label>
        <div className="flex flex-wrap gap-2">
          {(["ABSTRACT","CURRENT_AFFAIRS","BUSINESS","TECHNICAL","ETHICAL"] as GDTopicCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium font-sans transition-all ${
                category === c ? "bg-ink text-cream" : "bg-mist/60 text-ink/50"
              }`}
            >
              {c.replace(/_/g," ")}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={handleAdd}
        disabled={!topic.trim() || saving}
        className="w-full bg-sage text-white rounded-2xl py-3.5 text-sm font-semibold font-sans disabled:opacity-40 shadow-[0_2px_12px_rgba(107,143,113,0.30)] hover:bg-sage/90 transition-colors"
      >
        {saving ? "Adding…" : "Add Topic"}
      </button>
    </div>
  );
}

// ─── Add Interview Question modal ─────────────────────────────────────────────

function AddQuestionModal({ onClose, onAdded }: {
  onClose: () => void;
  onAdded: (q: IQQuestion) => void;
}) {
  const [question, setQuestion] = useState("");
  const [type, setType]         = useState<InterviewType>("HR");
  const [saving, setSaving]     = useState(false);

  async function handleAdd() {
    if (!question.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/topics/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, type }),
      });
      const created = await res.json();
      onAdded(created);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-ink/40 font-sans mb-1.5">Question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Tell me about a time you led a team through failure."
          rows={3}
          autoFocus
          className="w-full bg-cream border border-mist rounded-xl px-4 py-3 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink/40 font-sans mb-1.5">Type</label>
        <div className="flex gap-2">
          {(["HR","TECHNICAL","SYSTEM_DESIGN"] as InterviewType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium font-sans transition-all ${
                type === t ? "bg-ink text-cream" : "bg-mist/60 text-ink/50"
              }`}
            >
              {t.replace(/_/g," ")}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={handleAdd}
        disabled={!question.trim() || saving}
        className="w-full bg-gold/90 text-white rounded-2xl py-3.5 text-sm font-semibold font-sans disabled:opacity-40 hover:bg-gold transition-colors shadow-[0_2px_12px_rgba(196,163,90,0.25)]"
      >
        {saving ? "Adding…" : "Add Question"}
      </button>
    </div>
  );
}

// ─── GD Tab ───────────────────────────────────────────────────────────────────

function GDTab() {
  const router = useRouter();
  const { status, selectCategory } = useTimer();

  const [topics, setTopics]             = useState<GDTopic[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<GDTopicCategory | "ALL">("ALL");
  const [search, setSearch]             = useState("");
  const [showAdd, setShowAdd]           = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = filter === "ALL"
      ? "/api/topics/gd"
      : `/api/topics/gd?category=${filter}`;
    fetch(url)
      .then((r) => r.json())
      .then(setTopics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  function handlePractice(topic: GDTopic) {
    if (status === "idle") selectCategory("GD");
    sessionStorage.setItem("timer-topic-hint", topic.topic);
    router.push("/timer");
  }

  function handleMarkPracticed(id: string) {
    setTopics((prev) =>
      prev.map((t) => t.id === id ? { ...t, practiced: true, practiceCount: t.practiceCount + 1 } : t)
    );
  }

  const filtered = topics.filter((t) =>
    !search || t.topic.toLowerCase().includes(search.toLowerCase())
  );
  const practiced = filtered.filter((t) => t.practiced).length;

  return (
    <div className="relative">
      <FilterPills options={GD_CATS} active={filter} onChange={setFilter} />
      <SearchBar value={search} onChange={setSearch} />
      <StatsRow total={filtered.length} practiced={practiced} />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" rounded="lg" />)}
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={24} className="text-ink/20 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-ink/30 font-sans">No topics found</p>
            </div>
          ) : (
            filtered.map((t) => (
              <TopicCard
                key={t.id} topic={t}
                onPractice={handlePractice}
                onMarkPracticed={handleMarkPracticed}
              />
            ))
          )}
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 bg-sage text-white rounded-full pl-4 pr-5 py-3 shadow-[0_4px_20px_rgba(107,143,113,0.40)] hover:bg-sage/90 transition-colors font-sans text-sm font-semibold"
      >
        <Plus size={16} strokeWidth={2.5} />
        Add Topic
      </motion.button>

      <AnimatePresence>
        {showAdd && (
          <AddModal title="Add GD Topic" onClose={() => setShowAdd(false)}>
            <AddTopicModal
              onClose={() => setShowAdd(false)}
              onAdded={(t) => setTopics((prev) => [t, ...prev])}
            />
          </AddModal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Interview Tab ────────────────────────────────────────────────────────────

function InterviewTab() {
  const router = useRouter();
  const { status, selectCategory } = useTimer();

  const [questions, setQuestions]       = useState<IQQuestion[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<InterviewType | "ALL">("ALL");
  const [search, setSearch]             = useState("");
  const [showAdd, setShowAdd]           = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = filter === "ALL"
      ? "/api/topics/interview"
      : `/api/topics/interview?type=${filter}`;
    fetch(url)
      .then((r) => r.json())
      .then(setQuestions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  function handlePractice(q: IQQuestion) {
    if (status === "idle") selectCategory("MOCK_INTERVIEW");
    sessionStorage.setItem("timer-topic-hint", q.question);
    router.push("/timer");
  }

  const filtered = questions.filter((q) =>
    !search || q.question.toLowerCase().includes(search.toLowerCase())
  );
  const practiced = filtered.filter((q) => q.practiced).length;

  return (
    <div className="relative">
      <FilterPills options={IQ_TYPES} active={filter} onChange={setFilter} />
      <SearchBar value={search} onChange={setSearch} />
      <StatsRow total={filtered.length} practiced={practiced} />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" rounded="lg" />)}
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Mic size={24} className="text-ink/20 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-ink/30 font-sans">No questions found</p>
            </div>
          ) : (
            filtered.map((q) => (
              <QuestionCard key={q.id} question={q} onPractice={handlePractice} />
            ))
          )}
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 bg-gold/90 text-white rounded-full pl-4 pr-5 py-3 shadow-[0_4px_20px_rgba(196,163,90,0.35)] hover:bg-gold transition-colors font-sans text-sm font-semibold"
      >
        <Plus size={16} strokeWidth={2.5} />
        Add Question
      </motion.button>

      <AnimatePresence>
        {showAdd && (
          <AddModal title="Add Interview Question" onClose={() => setShowAdd(false)}>
            <AddQuestionModal
              onClose={() => setShowAdd(false)}
              onAdded={(q) => setQuestions((prev) => [q, ...prev])}
            />
          </AddModal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "gd" | "interview";

export default function TopicsPage() {
  const [tab, setTab] = useState<Tab>("gd");

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-serif text-3xl font-semibold text-ink">
          Your <em>Bank.</em>
        </h1>
        <p className="text-sm text-ink/40 font-sans mt-1">
          GD topics and interview questions — all in one place
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-mist/50 rounded-2xl p-1 mb-5">
        {([
          { key: "gd",        label: "GD Topics"  },
          { key: "interview", label: "Interview Q" },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="relative flex-1 py-2.5 text-sm font-medium font-sans rounded-xl"
            style={{ color: tab === key ? "#2D2A26" : "#8B8075" }}
          >
            {tab === key && (
              <motion.div
                layoutId="topic-tab"
                className="absolute inset-0 bg-white rounded-xl shadow-[0_1px_4px_rgba(45,42,38,0.10)]"
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "gd"        && <GDTab />}
          {tab === "interview" && <InterviewTab />}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
