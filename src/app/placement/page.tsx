"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Plus, X, ChevronDown, Briefcase,
  TrendingUp, CheckCircle2, XCircle, Clock,
  Building2, Trash2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, LineChart, Line, CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Card }     from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { WarmTooltip, TICK, GRID_PROPS, PALETTE } from "@/components/charts/ChartWrapper";

// ─── Types ────────────────────────────────────────────────────────────────────

type CompanyStatus =
  | "APPLIED" | "OA_RECEIVED" | "OA_SUBMITTED"
  | "INTERVIEW_R1" | "INTERVIEW_R2" | "INTERVIEW_R3" | "HR_ROUND"
  | "OFFER_RECEIVED" | "REJECTED" | "WITHDRAWN";

type RoundType    = "OA" | "HR" | "TECHNICAL" | "SYSTEM_DESIGN" | "MANAGERIAL" | "CASE_STUDY";
type RoundOutcome = "CLEARED" | "REJECTED" | "PENDING";

interface Round {
  id: string; type: RoundType; date: string | null;
  duration: number | null; outcome: RoundOutcome; notes: string | null;
}
interface Company {
  id: string; name: string; role: string; source: string | null;
  appliedDate: string; status: CompanyStatus; ctc: string | null;
  resumeLabel: string | null; notes: string | null; rounds: Round[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<CompanyStatus, string> = {
  APPLIED: "Applied", OA_RECEIVED: "OA Received", OA_SUBMITTED: "OA Done",
  INTERVIEW_R1: "Round 1", INTERVIEW_R2: "Round 2", INTERVIEW_R3: "Round 3",
  HR_ROUND: "HR Round", OFFER_RECEIVED: "Offer", REJECTED: "Rejected", WITHDRAWN: "Withdrawn",
};
const STATUS_COLOR: Record<CompanyStatus, string> = {
  APPLIED: "bg-blue-100 text-blue-700", OA_RECEIVED: "bg-amber-100 text-amber-700",
  OA_SUBMITTED: "bg-amber-100 text-amber-700", INTERVIEW_R1: "bg-violet-100 text-violet-700",
  INTERVIEW_R2: "bg-violet-100 text-violet-700", INTERVIEW_R3: "bg-violet-100 text-violet-700",
  HR_ROUND: "bg-sky-100 text-sky-700", OFFER_RECEIVED: "bg-sage/15 text-sage",
  REJECTED: "bg-terracotta/10 text-terracotta", WITHDRAWN: "bg-mist text-ink/40",
};
const OUTCOME_ICON: Record<RoundOutcome, React.ReactNode> = {
  CLEARED: <CheckCircle2 size={12} className="text-sage" />,
  REJECTED: <XCircle     size={12} className="text-terracotta" />,
  PENDING:  <Clock       size={12} className="text-gold" />,
};
const STATUSES = Object.keys(STATUS_LABELS) as CompanyStatus[];
const ROUND_TYPES: RoundType[] = ["OA","HR","TECHNICAL","SYSTEM_DESIGN","MANAGERIAL","CASE_STUDY"];

// ─── Add Company Modal ────────────────────────────────────────────────────────

function AddCompanyModal({ onClose, onAdded }: { onClose: () => void; onAdded: (c: Company) => void }) {
  const [name, setName]           = useState("");
  const [role, setRole]           = useState("");
  const [source, setSource]       = useState("");
  const [appliedDate, setDate]    = useState(format(new Date(), "yyyy-MM-dd"));
  const [ctc, setCtc]             = useState("");
  const [resumeLabel, setResume]  = useState("");
  const [saving, setSaving]       = useState(false);

  async function submit() {
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, source, appliedDate, ctc, resumeLabel }),
    });
    if (res.ok) { onAdded(await res.json()); onClose(); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/30 backdrop-blur-sm">
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:24 }}
        className="w-full max-w-md bg-parchment rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl font-semibold text-ink">Add Company</h2>
          <button onClick={onClose}><X size={18} className="text-ink/40" /></button>
        </div>
        <div className="space-y-3">
          {[
            { label: "Company name *", value: name,        setter: setName,   placeholder: "Google, Flipkart…" },
            { label: "Role *",         value: role,        setter: setRole,   placeholder: "SDE-1, Data Analyst…" },
            { label: "Source",         value: source,      setter: setSource, placeholder: "LinkedIn, Referral, Campus…" },
            { label: "Expected CTC",   value: ctc,         setter: setCtc,    placeholder: "12 LPA, 50k/mo…" },
            { label: "Resume Applied", value: resumeLabel, setter: setResume, placeholder: "Resume_SDE_v3, ML_Resume_Jan…" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-1">{label}</p>
              <input
                value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
                className="w-full bg-white border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          ))}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-1">Applied date *</p>
            <input type="date" value={appliedDate} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-mist text-sm font-sans text-ink/50">Cancel</button>
          <button onClick={submit} disabled={!name.trim() || !role.trim() || saving}
            className="flex-1 py-3 rounded-2xl bg-ink text-cream text-sm font-semibold font-sans disabled:opacity-40">
            {saving ? "Adding…" : "Add Company"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Company Card ─────────────────────────────────────────────────────────────

function CompanyCard({ company, onUpdate, onDelete }: {
  company: Company;
  onUpdate: (c: Company) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [addingRound, setAdding]  = useState(false);
  const [roundType, setRoundType] = useState<RoundType>("TECHNICAL");
  const [roundDate, setRoundDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [roundNotes, setRoundNotes] = useState("");
  const [deleting, setDeleting]   = useState(false);

  async function updateStatus(status: CompanyStatus) {
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) onUpdate(await res.json());
  }

  async function addRound() {
    const res = await fetch(`/api/companies/${company.id}/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: roundType, date: roundDate, notes: roundNotes }),
    });
    if (res.ok) {
      const updated = await fetch(`/api/companies/${company.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      // Refresh by re-fetching
      const all = await fetch("/api/companies").then((r) => r.json());
      const fresh = all.find((c: Company) => c.id === company.id);
      if (fresh) onUpdate(fresh);
      setAdding(false); setRoundNotes("");
    }
  }

  async function updateRound(roundId: string, outcome: RoundOutcome) {
    await fetch(`/api/companies/${company.id}/rounds`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, outcome }),
    });
    const all = await fetch("/api/companies").then((r) => r.json());
    const fresh = all.find((c: Company) => c.id === company.id);
    if (fresh) onUpdate(fresh);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
    if (res.ok) onDelete(company.id);
    setDeleting(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(45,42,38,0.06)] overflow-hidden">
      {/* Header */}
      <button onClick={() => setExpanded((e) => !e)} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-mist/60 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 size={16} className="text-ink/40" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-sans font-semibold text-sm text-ink">{company.name}</p>
              <span className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[company.status]}`}>
                {STATUS_LABELS[company.status]}
              </span>
            </div>
            <p className="text-xs text-ink/40 font-sans mt-0.5">
              {company.role}{company.source ? ` · ${company.source}` : ""}
              {company.resumeLabel && <span className="ml-1 text-[10px] bg-mist/80 text-ink/40 rounded px-1.5 py-0.5 font-mono">{company.resumeLabel}</span>}
            </p>
            <p className="text-[10px] text-ink/30 font-sans mt-0.5">
              Applied {format(parseISO(company.appliedDate.slice(0, 10)), "d MMM yyyy")}
              {company.rounds.length > 0 && ` · ${company.rounds.length} round${company.rounds.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <ChevronDown size={14} className={`text-ink/25 mt-1 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-mist/40">
            <div className="p-4 space-y-4">

              {/* Status selector */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-2">Update Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button key={s} onClick={() => updateStatus(s)}
                      className={`text-[10px] font-sans font-medium px-2.5 py-1 rounded-full border transition-all ${
                        company.status === s ? STATUS_COLOR[s] + " border-transparent" : "border-mist text-ink/40 hover:border-ink/20"
                      }`}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rounds */}
              {company.rounds.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-2">Interview Rounds</p>
                  <div className="space-y-2">
                    {company.rounds.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 bg-mist/30 rounded-xl px-3 py-2">
                        {OUTCOME_ICON[r.outcome]}
                        <span className="text-xs font-sans font-medium text-ink flex-1">{r.type.replace(/_/g, " ")}</span>
                        {r.date && <span className="text-[10px] text-ink/35 font-sans">{format(parseISO(r.date.slice(0,10)), "d MMM")}</span>}
                        <div className="flex gap-1">
                          {(["CLEARED","REJECTED","PENDING"] as RoundOutcome[]).map((o) => (
                            <button key={o} onClick={() => updateRound(r.id, o)}
                              className={`text-[9px] font-sans px-1.5 py-0.5 rounded-full border transition-all ${
                                r.outcome === o ? (o === "CLEARED" ? "bg-sage/15 text-sage border-sage/30" : o === "REJECTED" ? "bg-terracotta/10 text-terracotta border-terracotta/20" : "bg-gold/10 text-amber-700 border-gold/20") : "border-mist text-ink/30"
                              }`}>{o[0] + o.slice(1).toLowerCase()}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add round */}
              {!addingRound ? (
                <button onClick={() => setAdding(true)}
                  className="flex items-center gap-1.5 text-xs text-sage font-sans hover:text-sage/80">
                  <Plus size={13} /> Add Round
                </button>
              ) : (
                <div className="bg-mist/20 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <select value={roundType} onChange={(e) => setRoundType(e.target.value as RoundType)}
                      className="flex-1 bg-white border border-mist rounded-lg px-2 py-1.5 text-xs font-sans text-ink focus:outline-none">
                      {ROUND_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
                    </select>
                    <input type="date" value={roundDate} onChange={(e) => setRoundDate(e.target.value)}
                      className="flex-1 bg-white border border-mist rounded-lg px-2 py-1.5 text-xs font-sans text-ink focus:outline-none" />
                  </div>
                  <input value={roundNotes} onChange={(e) => setRoundNotes(e.target.value)} placeholder="Notes (optional)"
                    className="w-full bg-white border border-mist rounded-lg px-2 py-1.5 text-xs font-sans text-ink focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setAdding(false)} className="flex-1 py-1.5 rounded-lg border border-mist text-xs text-ink/40 font-sans">Cancel</button>
                    <button onClick={addRound} className="flex-1 py-1.5 rounded-lg bg-sage text-white text-xs font-semibold font-sans">Add</button>
                  </div>
                </div>
              )}

              {/* Delete */}
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1 text-[11px] text-terracotta/60 hover:text-terracotta font-sans transition-colors">
                <Trash2 size={11} /> {deleting ? "Deleting…" : "Remove company"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────

interface Analytics {
  summary:    { total: number; active: number; offers: number; rejected: number; offerRate: number };
  funnel:     { stage: string; count: number }[];
  byStatus:   { status: string; count: number }[];
  bySource:   { source: string; total: number; offers: number; rate: number }[];
  timeline:   { week: string; count: number }[];
  roundStats: { type: string; total: number; cleared: number; rate: number }[];
}

function AnalyticsPanel({ analytics, loading }: { analytics: Analytics | null; loading: boolean }) {
  if (loading) return <Skeleton className="h-48 w-full" rounded="lg" />;
  if (!analytics || analytics.summary.total === 0) return null;

  const { summary, funnel, bySource, timeline, roundStats } = analytics;

  return (
    <div className="space-y-4 mb-6">
      {/* Summary pills */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Applied",  value: summary.total,     color: "text-ink"        },
          { label: "Active",   value: summary.active,    color: "text-blue-600"   },
          { label: "Offers",   value: summary.offers,    color: "text-sage"       },
          { label: "Hit Rate", value: `${summary.offerRate}%`, color: "text-gold" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
            <p className={`font-serif text-xl font-semibold ${color}`}>{value}</p>
            <p className="text-[10px] text-ink/35 font-sans mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <Card>
        <p className="text-sm font-semibold text-ink font-sans mb-4">Application Funnel</p>
        <div className="space-y-2">
          {funnel.map((f, i) => (
            <div key={f.stage}>
              <div className="flex items-center justify-between text-xs font-sans mb-1">
                <span className="text-ink/60">{f.stage}</span>
                <span className="font-mono font-medium text-ink">{f.count}</span>
              </div>
              <div className="h-6 bg-mist/40 rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${funnel[0].count > 0 ? (f.count / funnel[0].count) * 100 : 0}%` }}
                  transition={{ delay: i * 0.1 }}
                  className="h-full rounded-lg"
                  style={{ background: i === 0 ? PALETTE.sage : i === 1 ? PALETTE.gold : i === 2 ? "#8B5CF6" : "#22C55E" }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Timeline */}
      {timeline.length > 1 && (
        <Card>
          <p className="text-sm font-semibold text-ink font-sans mb-4">Applications over Time</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={(p) => <WarmTooltip {...p} formatter={(v: number) => `${v} apps`} />} />
              <Line type="monotone" dataKey="count" stroke={PALETTE.sage} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Round conversion rates */}
      {roundStats.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-ink font-sans mb-4">Round Conversion Rates</p>
          <div className="space-y-2">
            {roundStats.map((r) => (
              <div key={r.type} className="flex items-center gap-3">
                <span className="text-xs font-sans text-ink/60 w-28 shrink-0">{r.type.replace(/_/g," ")}</span>
                <div className="flex-1 h-4 bg-mist/40 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.rate}%` }}
                    className="h-full rounded-full bg-sage"
                  />
                </div>
                <span className="text-xs font-mono font-semibold text-ink w-12 text-right">{r.rate}% ({r.cleared}/{r.total})</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* By source */}
      {bySource.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-ink font-sans mb-4">Applications by Source</p>
          <ResponsiveContainer width="100%" height={Math.max(100, bySource.length * 36)}>
            <BarChart data={bySource} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis dataKey="source" type="category"
                tick={{ fontSize: 10, fill: "#8B8075", fontFamily: "var(--font-dm-sans)" }}
                tickLine={false} axisLine={false} width={70} />
              <Tooltip content={(p) => <WarmTooltip {...p} />} />
              <Bar dataKey="total"  name="Applied" fill={PALETTE.mist} radius={[0,4,4,0]} />
              <Bar dataKey="offers" name="Offers"  fill={PALETTE.sage} radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlacementPage() {
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [analytics, setAnalytics]     = useState<Analytics | null>(null);
  const [loading, setLoading]         = useState(true);
  const [analyticsLoading, setAL]     = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [filter, setFilter]           = useState<CompanyStatus | "ALL">("ALL");

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json()).then(setCompanies).catch(console.error)
      .finally(() => setLoading(false));
    fetch("/api/placement/analytics")
      .then((r) => r.json()).then(setAnalytics).catch(console.error)
      .finally(() => setAL(false));
  }, []);

  function refreshAnalytics() {
    fetch("/api/placement/analytics").then((r) => r.json()).then(setAnalytics).catch(console.error);
  }

  const filtered = filter === "ALL"
    ? companies
    : companies.filter((c) => c.status === filter);

  const activeStatuses = Array.from(new Set(companies.map((c) => c.status)));

  return (
    <AppShell>
      <AnimatePresence>
        {showAdd && (
          <AddCompanyModal
            onClose={() => setShowAdd(false)}
            onAdded={(c) => { setCompanies((prev) => [c, ...prev]); refreshAnalytics(); }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Placement <em>Pipeline.</em></h1>
          <p className="text-sm text-ink/40 font-sans mt-1">Track every application and round</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-ink text-cream rounded-2xl px-4 py-2.5 text-sm font-semibold font-sans shadow-[0_2px_12px_rgba(45,42,38,0.20)] hover:bg-ink/90 transition-colors">
          <Plus size={15} /> Add
        </button>
      </div>

      {/* Analytics */}
      <AnalyticsPanel analytics={analytics} loading={analyticsLoading} />

      {/* Filter chips */}
      {companies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 scrollbar-none">
          <button onClick={() => setFilter("ALL")}
            className={`shrink-0 text-xs font-sans px-3 py-1.5 rounded-full border transition-all ${filter === "ALL" ? "bg-ink text-cream border-transparent" : "border-mist text-ink/50"}`}>
            All ({companies.length})
          </button>
          {activeStatuses.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`shrink-0 text-xs font-sans px-3 py-1.5 rounded-full border transition-all ${filter === s ? STATUS_COLOR[s] + " border-transparent" : "border-mist text-ink/50"}`}>
              {STATUS_LABELS[s]} ({companies.filter((c) => c.status === s).length})
            </button>
          ))}
        </div>
      )}

      {/* Company list */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map((i) => <Skeleton key={i} className="h-20" rounded="lg" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-mist/50 flex items-center justify-center mx-auto mb-3">
            <Briefcase size={24} className="text-ink/20" />
          </div>
          <p className="text-sm text-ink/40 font-sans">No applications yet</p>
          <p className="text-xs text-ink/25 font-sans mt-1">Add your first company to start tracking</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-4 flex items-center gap-2 bg-ink text-cream rounded-2xl px-4 py-2.5 text-sm font-semibold font-sans mx-auto">
            <Plus size={15} /> Add Company
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((c) => (
              <motion.div key={c.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}>
                <CompanyCard
                  company={c}
                  onUpdate={(updated) => {
                    setCompanies((prev) => prev.map((x) => x.id === updated.id ? updated : x));
                    refreshAnalytics();
                  }}
                  onDelete={(id) => {
                    setCompanies((prev) => prev.filter((x) => x.id !== id));
                    refreshAnalytics();
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </AppShell>
  );
}
