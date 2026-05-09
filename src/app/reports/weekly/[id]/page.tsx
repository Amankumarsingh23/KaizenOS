"use client";

import { use, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Target, Flame, Zap,
  Star, Clock, Download, ArrowLeft, Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { WeeklyStats } from "@/lib/ai/generateWeeklyReport";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Report {
  id:        string;
  weekStart: string;
  createdAt: string;
  stats:     WeeklyStats;
  aiSummary: string;
  strengths: string[];
  gaps:      string[];
  nextWeek:  string[];
  motNote:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 8) return "#6B8F71";
  if (s >= 6) return "#C4A35A";
  return "#C47D5A";
}
function hours(min: number) {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

// ─── Print styles injected inline ────────────────────────────────────────────
// We use a <style> tag so print mode is controlled independently of Tailwind

const PRINT_STYLES = `
  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
    .print-break { page-break-before: always; }
    @page { margin: 18mm 16mm; size: A4; }
  }
  @media screen {
    .print-only { display: none; }
  }
`;

// ─── Report Page ──────────────────────────────────────────────────────────────

export default function WeeklyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();
  const [report, setReport]   = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,  setError]    = useState("");

  useEffect(() => {
    fetch(`/api/reports/weekly/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject("Not found"))
      .then(setReport)
      .catch(() => setError("Report not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <Loader2 size={24} className="text-sage animate-spin" />
    </div>
  );

  if (error || !report) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="text-ink/40 font-sans">{error || "Report not found"}</p>
    </div>
  );

  const { stats } = report;
  const weekLabel  = `${format(parseISO(report.weekStart), "MMM d")} – ${format(new Date(new Date(report.weekStart).getTime() + 6 * 86_400_000), "MMM d, yyyy")}`;

  // Split AI narrative into paragraphs
  const paragraphs = report.aiSummary.split(/\n+/).filter(Boolean);

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  return (
    <>
      <style>{PRINT_STYLES}</style>

      {/* Screen toolbar */}
      <div className="no-print sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-mist/60 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink font-sans">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-ink text-cream rounded-xl px-4 py-2 text-sm font-semibold font-sans hover:bg-ink/90 transition-colors shadow-[0_2px_8px_rgba(45,42,38,0.20)]"
        >
          <Download size={14} /> Download PDF
        </button>
      </div>

      {/* Report content */}
      <div className="max-w-[720px] mx-auto px-6 py-10 bg-white min-h-screen" id="report-content">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-ink/10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-sage flex items-center justify-center">
                <Zap size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="font-serif text-lg font-semibold text-ink">KaizenOS</span>
            </div>
            <h1 className="font-serif text-3xl font-semibold text-ink leading-tight">
              Weekly Performance Report
            </h1>
            <p className="text-ink/50 font-sans text-sm mt-1">
              {weekLabel} · {stats.userName}
            </p>
          </div>
          <div className="text-right">
            {stats.avgDailyScore && (
              <div>
                <p className="font-serif text-4xl font-bold" style={{ color: scoreColor(stats.avgDailyScore) }}>
                  {stats.avgDailyScore}
                </p>
                <p className="text-xs text-ink/40 font-sans">/10 avg score</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Summary stats row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Sessions",    value: stats.totalSessions,           icon: <Target size={16} className="text-sage" />    },
            { label: "Study Time",  value: hours(stats.totalMinutes),     icon: <Clock size={16} className="text-gold" />     },
            { label: "Active Days", value: `${stats.activeDays}/7`,       icon: <Flame size={16} className="text-terracotta" />},
            { label: "Consistency", value: `${stats.consistency}%`,       icon: <Star size={16} className="text-violet-500" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="border border-mist rounded-2xl p-4 text-center">
              <div className="flex justify-center mb-2">{icon}</div>
              <p className="font-serif text-2xl font-semibold text-ink">{value}</p>
              <p className="text-[10px] text-ink/40 font-sans uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* vs last week */}
        {(stats.vsLastWeek.sessions !== 0 || stats.vsLastWeek.minutes !== 0) && (
          <p className="text-xs text-ink/40 font-sans mb-8 text-center">
            vs last week: {stats.vsLastWeek.sessions >= 0 ? "+" : ""}{stats.vsLastWeek.sessions} sessions,
            {" "}{stats.vsLastWeek.minutes >= 0 ? "+" : ""}{Math.round(stats.vsLastWeek.minutes / 60 * 10) / 10}h
          </p>
        )}

        {/* ── AI Narrative ────────────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="font-serif text-xl font-semibold text-ink mb-4 flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-sage inline-block" />
            AI Weekly Analysis
          </h2>
          <div className="space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-ink/80 font-sans text-sm leading-relaxed">{p}</p>
            ))}
          </div>
        </section>

        {/* ── Strengths & Gaps ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <section>
            <h2 className="font-serif text-lg font-semibold text-ink mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-sage" />
              This Week's Wins
            </h2>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sage mt-2 shrink-0" />
                  <p className="text-sm font-sans text-ink/75 leading-snug">{s}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold text-ink mb-3 flex items-center gap-2">
              <XCircle size={16} className="text-terracotta" />
              Gaps to Address
            </h2>
            <ul className="space-y-2">
              {report.gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-terracotta mt-2 shrink-0" />
                  <p className="text-sm font-sans text-ink/75 leading-snug">{g}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ── Category Breakdown ──────────────────────────────────────────── */}
        {stats.categories.length > 0 && (
          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold text-ink mb-4 flex items-center gap-2">
              <span className="w-1 h-6 rounded-full bg-gold inline-block" />
              Category Breakdown
            </h2>
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-mist">
                  <th className="text-left text-[10px] uppercase tracking-widest text-ink/40 pb-2 font-medium">Category</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-ink/40 pb-2 font-medium">Sessions</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-ink/40 pb-2 font-medium">Time</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-ink/40 pb-2 font-medium">Target %</th>
                </tr>
              </thead>
              <tbody>
                {stats.categories.map((c) => {
                  const pct = c.target ? Math.round(((c.current ?? c.sessions) / c.target) * 100) : null;
                  return (
                    <tr key={c.cat} className="border-b border-mist/40 last:border-0">
                      <td className="py-2.5 text-ink font-medium">{c.cat.replace(/_/g, " ")}</td>
                      <td className="py-2.5 text-right text-ink/60">{c.sessions}</td>
                      <td className="py-2.5 text-right text-ink/60 font-mono">{hours(c.minutes)}</td>
                      <td className="py-2.5 text-right">
                        {pct !== null ? (
                          <span className={`font-mono font-semibold ${pct >= 100 ? "text-sage" : pct >= 50 ? "text-gold" : "text-terracotta"}`}>
                            {pct}%
                          </span>
                        ) : <span className="text-ink/25">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* ── Streak Status ───────────────────────────────────────────────── */}
        {stats.streaks.filter((s) => s.current > 0).length > 0 && (
          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold text-ink mb-4 flex items-center gap-2">
              <span className="w-1 h-6 rounded-full bg-terracotta inline-block" />
              Active Streaks
            </h2>
            <div className="flex flex-wrap gap-3">
              {stats.streaks.filter((s) => s.current > 0).map((s) => (
                <div key={s.cat} className="flex items-center gap-2 border border-mist rounded-xl px-3 py-2">
                  <Flame size={14} className="text-gold" />
                  <span className="text-sm font-sans text-ink">{s.cat.replace(/_/g, " ")}</span>
                  <span className="font-mono text-sm font-bold text-ink">{s.current}d</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── GD & Interview ─────────────────────────────────────────────── */}
        {(stats.gd.sessions > 0 || stats.interview.attempts > 0) && (
          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold text-ink mb-4 flex items-center gap-2">
              <span className="w-1 h-6 rounded-full bg-violet-500 inline-block" />
              GD & Interview Performance
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {stats.gd.sessions > 0 && (
                <div className="border border-mist rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-2">Group Discussion</p>
                  <p className="font-serif text-2xl font-semibold text-ink">{stats.gd.sessions} sessions</p>
                  {stats.gd.avgScore && <p className="text-sm text-sage font-sans mt-1">Avg score: {stats.gd.avgScore}/10</p>}
                  <p className="text-xs text-ink/40 font-sans mt-1">
                    Initiated {stats.gd.initiated}× · Concluded {stats.gd.concluded}×
                  </p>
                </div>
              )}
              {stats.interview.attempts > 0 && (
                <div className="border border-mist rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-2">Interview Practice</p>
                  <p className="font-serif text-2xl font-semibold text-ink">{stats.interview.attempts} attempts</p>
                  {stats.interview.avgRating && <p className="text-sm text-gold font-sans mt-1">Avg rating: {stats.interview.avgRating}/5</p>}
                  {stats.interview.topType && <p className="text-xs text-ink/40 font-sans mt-1">Focus: {stats.interview.topType}</p>}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Next Week Plan ──────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="font-serif text-xl font-semibold text-ink mb-4 flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-blue-500 inline-block" />
            Next Week Game Plan
          </h2>
          <div className="space-y-2.5">
            {report.nextWeek.map((plan, i) => {
              // Try to extract day label from "Monday: ..." format
              const match = plan.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Weekend|Sunday)[:\s]+(.*)/i);
              const day    = match ? match[1] : DAYS[i] ?? `Day ${i + 1}`;
              const action = match ? match[2] : plan;
              return (
                <div key={i} className="flex items-start gap-3 p-3 border border-mist/60 rounded-xl">
                  <div className="w-20 shrink-0">
                    <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans font-medium">{day}</p>
                  </div>
                  <p className="text-sm font-sans text-ink/75 leading-snug flex-1">{action}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Motivational close ──────────────────────────────────────────── */}
        <div className="border-t-2 border-ink/10 pt-6 mb-8">
          <blockquote className="font-serif text-lg italic text-ink/70 text-center leading-relaxed">
            "{report.motNote}"
          </blockquote>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-[10px] text-ink/25 font-sans border-t border-mist/40 pt-4">
          <span>KaizenOS · Continuous improvement, one session at a time.</span>
          <span>Generated {format(parseISO(report.createdAt), "d MMM yyyy, h:mm a")}</span>
        </div>
      </div>
    </>
  );
}
