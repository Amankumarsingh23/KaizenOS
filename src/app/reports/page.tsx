"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  RefreshCw, ChevronDown, Calendar, Loader2,
} from "lucide-react";
import { AppShell }      from "@/components/layout/AppShell";
import { ScoreCircle }   from "@/components/ui/ScoreCircle";
import { Badge }         from "@/components/ui/Badge";
import { Skeleton }      from "@/components/ui/Skeleton";
import type { Category } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Report {
  id:              string;
  date:            string;
  overallScore:    number;
  categoryScores:  Record<string, number>;
  summary:         string;
  strengths:       string;
  gaps:            string;
  recommendations: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitList(text: string): string[] {
  return text
    .split(/,\s*|\n/)
    .map((s) => s.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

function scoreColor(s: number) {
  if (s >= 7.5) return "#6B8F71";
  if (s >= 5)   return "#C4A35A";
  return "#C47D5A";
}

function scoreMood(s: number) {
  if (s >= 9)   return "Exceptional";
  if (s >= 7.5) return "Strong day";
  if (s >= 6)   return "Decent";
  if (s >= 4)   return "Light";
  return "Rest day";
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({
  report,
  prominent = false,
}: {
  report: Report;
  prominent?: boolean;
}) {
  const [expanded, setExpanded] = useState(prominent);
  const strengths     = splitList(report.strengths);
  const gaps          = splitList(report.gaps);
  const recs          = splitList(report.recommendations);
  const catScores     = Object.entries(report.categoryScores ?? {});
  const dateStr       = format(new Date(report.date), "EEEE, MMMM d");
  const score10       = report.overallScore;         // 0–10
  const score100      = Math.round(score10 * 10);    // for ScoreCircle

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        "bg-white rounded-3xl overflow-hidden",
        prominent
          ? "shadow-[0_8px_40px_rgba(45,42,38,0.14)]"
          : "shadow-[0_2px_12px_rgba(45,42,38,0.07)] border border-mist/60",
      ].join(" ")}
    >
      {/* Gradient top bar */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${scoreColor(score10)}, ${scoreColor(score10)}88)`,
        }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-5 pb-4 cursor-pointer"
        onClick={() => !prominent && setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0 pr-4">
          {prominent && (
            <p className="text-[10px] uppercase tracking-widest text-ink/35 font-sans mb-1">
              Today's Report
            </p>
          )}
          <p className="font-serif text-lg font-semibold text-ink leading-tight">{dateStr}</p>
          <p className="text-xs text-ink/40 font-sans mt-0.5">{scoreMood(score10)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ScoreCircle score={score100} size={prominent ? "md" : "sm"} />
          {!prominent && (
            <ChevronDown
              size={16}
              className="text-ink/30 transition-transform"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
            />
          )}
        </div>
      </div>

      {/* Category score chips */}
      {catScores.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {catScores.map(([cat, score]) => (
            <div key={cat} className="flex items-center gap-1.5 bg-cream rounded-full px-2.5 py-1">
              <Badge variant={cat as Category} />
              <span className="text-xs font-mono font-semibold" style={{ color: scoreColor(score) }}>
                {score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {/* Summary */}
            {report.summary && (
              <div className="px-5 pb-4">
                <div className="border-t border-mist/40 pt-4">
                  <p className="font-serif text-sm italic text-ink/80 leading-relaxed">
                    &ldquo;{report.summary}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Strengths */}
            {strengths.length > 0 && (
              <div className="px-5 pb-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <CheckCircle2 size={13} className="text-sage shrink-0" />
                  <p className="text-[10px] uppercase tracking-widest font-sans font-semibold text-sage">
                    Strengths
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink/70 font-sans">
                      <span className="text-sage/50 mt-0.5 shrink-0">↗</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gaps */}
            {gaps.length > 0 && (
              <div className="px-5 pb-4">
                <div className="bg-terracotta/5 border border-terracotta/15 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <AlertTriangle size={12} className="text-terracotta shrink-0" />
                    <p className="text-[10px] uppercase tracking-widest font-sans font-semibold text-terracotta">
                      Gaps
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {gaps.map((g, i) => (
                      <li key={i} className="text-sm text-terracotta/80 font-sans">{g}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recs.length > 0 && (
              <div className="px-5 pb-5">
                <div className="bg-gold/6 border border-gold/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <ArrowRight size={13} className="text-gold shrink-0" />
                    <p className="text-[10px] uppercase tracking-widest font-sans font-semibold text-amber-700">
                      Tomorrow's Plan
                    </p>
                  </div>
                  <ol className="space-y-2">
                    {recs.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-ink/70 font-sans">
                        <span className="font-mono text-[11px] font-semibold text-gold bg-gold/15 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {r}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Generate Button ──────────────────────────────────────────────────────────

function GeneratePrompt({ onGenerated }: { onGenerated: (r: Report) => void }) {
  const [state, setState] = useState<"idle" | "generating" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const msgs = useRef([
    "Analysing today's sessions…",
    "Reviewing monthly targets…",
    "Checking streak status…",
    "Writing your report…",
  ]);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (state !== "generating") return;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % msgs.current.length), 2500);
    return () => clearInterval(id);
  }, [state]);

  async function handleGenerate() {
    setState("generating");
    setMsgIdx(0);
    try {
      const res = await fetch("/api/reports/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      onGenerated({ ...data, date: new Date().toISOString() });
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  return (
    <div className="bg-white rounded-3xl p-8 text-center shadow-[0_8px_40px_rgba(45,42,38,0.10)]">
      {state === "generating" ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={msgIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-sage/10 flex items-center justify-center mx-auto">
              <Loader2 size={22} className="text-sage animate-spin" />
            </div>
            <div>
              <p className="font-serif text-lg font-semibold text-ink">Generating report…</p>
              <p className="text-sm text-ink/40 font-sans mt-1">{msgs.current[msgIdx]}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <>
          <div className="w-12 h-12 rounded-2xl bg-sage/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={22} className="text-sage" strokeWidth={1.8} />
          </div>
          <p className="font-serif text-xl font-semibold text-ink mb-2">
            No report for today yet
          </p>
          <p className="text-sm text-ink/45 font-sans mb-6">
            Claude will analyse your sessions, streaks, and targets to write a personalised daily report.
          </p>
          {state === "error" && (
            <p className="text-xs text-terracotta font-sans mb-4 bg-terracotta/8 rounded-xl px-3 py-2">
              {errMsg}
            </p>
          )}
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 bg-sage text-white rounded-2xl px-6 py-3 text-sm font-semibold font-sans shadow-[0_4px_16px_rgba(107,143,113,0.35)] hover:bg-sage/90 transition-colors"
          >
            <Sparkles size={15} />
            Generate Today's Report
          </button>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [todayReport, setTodayReport] = useState<Report | null>(null);
  const [history, setHistory]         = useState<Report[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Today's report
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const [todayRes, histRes] = await Promise.all([
          fetch(`/api/reports/${todayStr}`),
          fetch("/api/reports/history"),
        ]);

        if (todayRes.ok) {
          const d = await todayRes.json();
          setTodayReport(d);
        }
        if (histRes.ok) {
          const d = await histRes.json();
          setHistory(d.filter((r: Report) => r.date.slice(0, 10) !== todayStr));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">
            Daily <em>Reports.</em>
          </h1>
          <p className="text-sm text-ink/40 font-sans mt-1">
            AI-powered insight into your learning
          </p>
        </div>
        {todayReport && (
          <button
            onClick={() => setTodayReport(null)}
            className="flex items-center gap-1.5 text-xs text-ink/35 hover:text-ink/60 font-sans mt-1 transition-colors"
          >
            <RefreshCw size={12} />
            Regenerate
          </button>
        )}
      </div>

      {/* Today's report */}
      <div className="mb-6">
        {loading ? (
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_40px_rgba(45,42,38,0.10)]">
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1 mr-6">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-56 mt-3" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="w-20 h-20 shrink-0" rounded="full" />
            </div>
          </div>
        ) : todayReport ? (
          <ReportCard report={todayReport} prominent />
        ) : (
          <GeneratePrompt onGenerated={(r) => setTodayReport(r)} />
        )}
      </div>

      {/* History */}
      {(loading || history.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={13} className="text-ink/30" />
            <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40">
              Past Reports
            </p>
          </div>

          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl px-5 py-4 shadow-[0_2px_12px_rgba(45,42,38,0.07)]">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="w-12 h-12" rounded="full" />
                    </div>
                  </div>
                ))
              : history.map((r) => <ReportCard key={r.id} report={r} />)
            }
          </div>

          {!loading && history.length === 0 && (
            <div className="text-center py-8 text-ink/25">
              <p className="text-sm font-sans">No past reports yet</p>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
