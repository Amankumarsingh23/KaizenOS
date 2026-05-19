"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Upload, AlertTriangle, TrendingDown, TrendingUp,
  Minus, Smartphone, Zap, Clock, Lock, CheckCircle2,
  RefreshCw, ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { AppShell }  from "@/components/layout/AppShell";
import { Skeleton }  from "@/components/ui/Skeleton";
import { WarmTooltip, TICK, GRID_PROPS, PALETTE } from "@/components/charts/ChartWrapper";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "upload" | "analytics" | "insights";

interface ParsedReport {
  date: string; totalMins: number; unlockCount: number;
  topApps: { name: string; mins: number; visits: number }[];
  categories: { name: string; mins: number; pct: number }[];
}
interface Analytics {
  summary: {
    totalDays: number; avgScreenTime: number; avgUnlocks: number;
    trend7: "improving" | "worsening" | "stable";
    worstDay: { date: string; mins: number };
    bestDay:  { date: string; mins: number };
  };
  trend:       { date: string; screenMins: number; screenHours: number; unlocks: number }[];
  categoryAvg: { name: string; avgMins: number }[];
  appAvg:      { name: string; avgMins: number; avgVisits: number; totalHours: number }[];
  correlation: { date: string; screenMins: number; studyScore: number }[];
  heatmap:     { date: string; mins: number; dow: number }[];
  prodRatio:   { date: string; pct: number; mins: number }[];
}
interface Insights {
  topKiller:         string;
  correlationInsight: string;
  unlockInsight:     string;
  improvingOrNot:    string;
  actionPlan:        string[];
  motivationalTruth: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minsToHM(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}
function heatColor(mins: number) {
  if (mins === 0)           return "#EDE9E0";
  if (mins < 2 * 60)       return "#B8D4BB"; // green — <2h
  if (mins < 4 * 60)       return "#C4A35A"; // gold  — 2-4h
  if (mins < 6 * 60)       return "#C47D5A"; // terracotta — 4-6h
  return "#C0392B";                           // red — >6h danger
}

const CAT_COLORS = ["#6B8F71","#C4A35A","#C47D5A","#5B8FD4","#8B5CF6","#F43F5E","#06B6D4","#22C55E"];

// ─── Paste Text Helper ────────────────────────────────────────────────────────

function PasteTextEntry({ onParse }: { onParse: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={6}
        placeholder={"Paste the full text from your YourHour PDF here...\n\nExample:\nYourHour\n9h 18m\nUsage\n44 times\nUnlocks\nTop 5 Used Apps\nBrave\nUsage Time: 3 Hours 3 Minutes\nVisits: 66\n..."}
        className="w-full bg-white border border-mist rounded-xl px-3 py-2.5 text-xs font-mono text-ink placeholder:text-ink/20 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none leading-relaxed"
      />
      <button onClick={() => onParse(text)} disabled={text.trim().length < 20}
        className="w-full py-2.5 rounded-xl bg-sage text-white text-sm font-semibold font-sans disabled:opacity-40 hover:bg-sage/90 transition-colors">
        Parse Pasted Text
      </button>
    </div>
  );
}

// ─── Upload Tab ───────────────────────────────────────────────────────────────

function UploadTab({ onSaved }: { onSaved: () => void }) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [stage, setStage]     = useState<"idle" | "parsing" | "preview" | "saving" | "done" | "error">("idle");
  const [preview, setPreview] = useState<ParsedReport | null>(null);
  const [errMsg, setErr]      = useState("");
  const [drag, setDrag]       = useState(false);
  const [saving, setSaving]   = useState(false);

  // Manual entry fallback
  const [manual, setManual]   = useState(false);
  const [mDate, setMDate]     = useState(format(new Date(), "yyyy-MM-dd"));
  const [mScreen, setMScreen] = useState("");
  const [mUnlocks, setMUnlocks] = useState("");

  async function handleFile(file: File) {
    setStage("parsing"); setErr("");
    const form = new FormData();
    form.append("pdf", file);
    const res  = await fetch("/api/phone/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === "pdf_extract_failed") {
        setErr("PDF binary extraction failed on server — please use the 'Paste PDF text' option below instead.");
      } else if (data.error === "not_yourhour_pdf") {
        setErr("This doesn't look like a YourHour report. Make sure you're sharing the Daily Report PDF.");
      } else {
        setErr(data.error ?? "Parse failed");
      }
      setStage("error"); return;
    }
    setPreview(data.parsed);
    setStage("preview");
  }

  async function handlePasteText(rawText: string) {
    if (!rawText.trim()) return;
    setStage("parsing"); setErr("");
    const res  = await fetch("/api/phone/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Could not parse"); setStage("error"); return; }
    setPreview(data.parsed);
    setStage("preview");
  }

  async function confirmSave() {
    if (!preview) return;
    setSaving(true);
    const res = await fetch("/api/phone/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preview),
    });
    setSaving(false);
    if (res.ok) { setStage("done"); onSaved(); }
    else { setErr("Save failed"); setStage("error"); }
  }

  async function saveManual() {
    if (!mScreen || !mUnlocks) return;
    setSaving(true);
    const res = await fetch("/api/phone/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: mDate, totalMins: Number(mScreen), unlockCount: Number(mUnlocks), topApps: [], categories: [] }),
    });
    setSaving(false);
    if (res.ok) { setStage("done"); onSaved(); }
    else { setErr("Save failed"); setStage("error"); }
  }

  if (stage === "done") return (
    <div className="text-center py-16">
      <CheckCircle2 size={40} className="text-sage mx-auto mb-3" />
      <p className="font-serif text-xl font-semibold text-ink">Saved!</p>
      <p className="text-sm text-ink/40 font-sans mt-1">Head to Analytics to see your patterns</p>
      <button onClick={() => setStage("idle")} className="mt-4 text-sm text-sage font-sans underline">Upload another</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      {stage !== "preview" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
            drag ? "border-sage bg-sage/5" : "border-mist hover:border-sage/50"
          }`}
        >
          <input ref={inputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {stage === "parsing" ? (
            <div className="space-y-2">
              <RefreshCw size={32} className="text-sage mx-auto animate-spin" />
              <p className="text-sm text-ink/50 font-sans">Parsing your YourHour PDF…</p>
            </div>
          ) : (
            <>
              <Upload size={32} className="text-ink/20 mx-auto mb-3" />
              <p className="font-sans font-semibold text-sm text-ink">Drop your YourHour PDF here</p>
              <p className="text-xs text-ink/35 font-sans mt-1">or click to browse</p>
              <div className="mt-4 flex justify-center gap-2 flex-wrap">
                {["Opens YourHour app", "Daily Report", "Share as PDF", "Drop here"].map((s, i) => (
                  <span key={i} className="text-[10px] bg-mist/60 text-ink/40 font-sans rounded-full px-2.5 py-1">{s}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div className="bg-terracotta/8 border border-terracotta/20 rounded-2xl p-4">
          <p className="text-sm text-terracotta font-sans">{errMsg}</p>
          <button onClick={() => setStage("idle")} className="text-xs text-terracotta underline font-sans mt-2">Try again</button>
        </div>
      )}

      {/* Preview card */}
      {stage === "preview" && preview && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(45,42,38,0.10)]">
          <p className="text-sm font-semibold text-ink font-sans mb-4">Parsed — confirm before saving</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Date",        value: format(new Date(preview.date), "EEE d MMM yyyy") },
              { label: "Screen Time", value: minsToHM(preview.totalMins) },
              { label: "Unlocks",     value: `${preview.unlockCount}×` },
              { label: "Apps found",  value: `${preview.topApps.length}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-cream rounded-xl p-3">
                <p className="text-[10px] text-ink/40 font-sans">{label}</p>
                <p className="text-sm font-semibold text-ink font-sans">{value}</p>
              </div>
            ))}
          </div>
          {preview.topApps.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans mb-2">Top Apps</p>
              {preview.topApps.slice(0, 3).map((a) => (
                <div key={a.name} className="flex items-center justify-between py-1 border-b border-mist/40 last:border-0">
                  <span className="text-xs font-sans text-ink">{a.name}</span>
                  <span className="text-xs font-mono text-ink/50">{minsToHM(a.mins)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStage("idle")} className="flex-1 py-3 rounded-2xl border border-mist text-sm font-sans text-ink/50">Cancel</button>
            <button onClick={confirmSave} disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-sage text-white text-sm font-semibold font-sans disabled:opacity-40 shadow-[0_2px_8px_rgba(107,143,113,0.30)]">
              {"Confirm & Save"}
            </button>
          </div>
        </motion.div>
      )}


      {/* Paste text option */}
      <div>
        <button onClick={() => setManual((v) => !v)}
          className="flex items-center gap-2 text-xs text-sage font-sans font-medium transition-colors">
          <ChevronDown size={12} className={`transition-transform ${manual ? "rotate-180" : ""}`} />
          PDF not working? Paste text or enter manually
        </button>
        <AnimatePresence>
          {manual && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }}
              className="overflow-hidden">
              <div className="bg-mist/20 rounded-2xl p-4 mt-3 space-y-4">
                {/* Paste text */}
                <div>
                  <p className="text-xs font-semibold text-ink/60 font-sans mb-2">Option A — Paste PDF text (recommended)</p>
                  <p className="text-[11px] text-ink/40 font-sans mb-2">Open the PDF → Ctrl+A → Ctrl+C → paste here</p>
                  <PasteTextEntry onParse={handlePasteText} />
                </div>
                <div className="border-t border-mist/40 pt-4">
                  <p className="text-xs font-semibold text-ink/60 font-sans mb-2">Option B — Type numbers manually</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label:"Date", type:"date", value:mDate, set:setMDate },
                      { label:"Screen time (min)", type:"number", value:mScreen, set:setMScreen },
                      { label:"Unlocks", type:"number", value:mUnlocks, set:setMUnlocks },
                    ].map(({ label, type, value, set }) => (
                      <div key={label}>
                        <p className="text-[10px] text-ink/40 font-sans mb-1">{label}</p>
                        <input type={type} value={value} onChange={(e) => set(e.target.value)}
                          className="w-full bg-white border border-mist rounded-xl px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-sage/30" />
                      </div>
                    ))}
                  </div>
                  <button onClick={saveManual} disabled={!mScreen || !mUnlocks || saving}
                    className="w-full mt-2 py-2.5 rounded-xl bg-sage text-white text-sm font-semibold font-sans disabled:opacity-40">
                    Save Manual Entry
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* How-to */}
      <div className="bg-parchment border border-mist/60 rounded-2xl p-4">
        <p className="text-xs font-semibold text-ink/60 font-sans mb-2">How to get the PDF from YourHour</p>
        <ol className="space-y-1">
          {["Open YourHour app", "Tap 'Daily Report'", "Tap the share icon (top right)", "Share as PDF → Files", "Upload here"].map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-ink/40 font-sans">
              <span className="w-4 h-4 rounded-full bg-mist/60 flex items-center justify-center text-[9px] font-semibold text-ink/50 shrink-0 mt-0.5">{i+1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab({ analytics, loading }: { analytics: Analytics | null; loading: boolean }) {
  if (loading) return <div className="space-y-4">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-48" rounded="lg"/>)}</div>;
  if (!analytics) return (
    <div className="text-center py-16">
      <Smartphone size={32} className="text-ink/15 mx-auto mb-3"/>
      <p className="text-sm text-ink/30 font-sans">Upload your first YourHour PDF to see analytics</p>
    </div>
  );

  const { summary, trend, categoryAvg, appAvg, correlation, heatmap, prodRatio } = analytics;
  const TrendIcon = summary.trend7 === "improving" ? TrendingDown : summary.trend7 === "worsening" ? TrendingUp : Minus;
  const trendColor = summary.trend7 === "improving" ? "text-sage" : summary.trend7 === "worsening" ? "text-terracotta" : "text-ink/40";

  // heatmap layout
  const firstDow = heatmap[0]?.dow ?? 0;
  const padded = [...Array(firstDow).fill(null), ...heatmap];
  const weeks: (typeof heatmap[0] | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  return (
    <div className="space-y-5">
      {/* Summary pills */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label:"Avg screen time", value: minsToHM(summary.avgScreenTime), icon:<Clock size={14} className="text-terracotta"/>, color:"text-terracotta" },
          { label:"Avg unlocks/day", value: `${summary.avgUnlocks}×`,        icon:<Smartphone size={14} className="text-gold"/>,     color:"text-gold" },
          { label:"7-day trend",     value: summary.trend7,                  icon:<TrendIcon size={14} className={trendColor}/>,       color:trendColor  },
          { label:"Days tracked",    value: String(summary.totalDays),        icon:<CheckCircle2 size={14} className="text-sage"/>,    color:"text-sage" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(45,42,38,0.06)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-mist/40 flex items-center justify-center shrink-0">{icon}</div>
            <div>
              <p className={`text-base font-serif font-semibold ${color}`}>{value}</p>
              <p className="text-[10px] text-ink/35 font-sans">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Best vs Worst */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-sage/8 border border-sage/20 rounded-2xl p-4">
          <p className="text-[10px] text-sage font-sans font-medium uppercase tracking-widest mb-1">Best day</p>
          <p className="font-serif text-lg font-semibold text-ink">{minsToHM(summary.bestDay.mins)}</p>
          <p className="text-xs text-ink/40 font-sans">{summary.bestDay.date}</p>
        </div>
        <div className="bg-terracotta/8 border border-terracotta/20 rounded-2xl p-4">
          <p className="text-[10px] text-terracotta font-sans font-medium uppercase tracking-widest mb-1">Worst day</p>
          <p className="font-serif text-lg font-semibold text-ink">{minsToHM(summary.worstDay.mins)}</p>
          <p className="text-xs text-ink/40 font-sans">{summary.worstDay.date}</p>
        </div>
      </div>

      {/* Screen time trend */}
      {trend.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <p className="text-sm font-semibold text-ink font-sans mb-1">Screen Time Trend</p>
          <p className="text-[11px] text-ink/35 font-sans mb-4">Daily usage · red zone = danger (6h+)</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trend} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="stGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C47D5A" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#C47D5A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS}/>
              <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
              <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v/60)}h`}/>
              <Tooltip content={(p) => <WarmTooltip {...p} formatter={(v: number) => minsToHM(v)}/>}/>
              <ReferenceLine y={360} stroke="#ef444430" strokeDasharray="4 4" strokeWidth={1.5}/>
              <ReferenceLine y={240} stroke="#f59e0b30" strokeDasharray="4 4" strokeWidth={1.5}/>
              <Area type="monotone" dataKey="screenMins" name="Screen time" stroke={PALETTE.terracotta} fill="url(#stGrad)" strokeWidth={2} dot={{ r:2 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Unlock trend */}
      {trend.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <p className="text-sm font-semibold text-ink font-sans mb-1">Unlock Frequency</p>
          <p className="text-[11px] text-ink/35 font-sans mb-4">Times you picked up your phone per day · 80+ = compulsive territory</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={trend} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <CartesianGrid {...GRID_PROPS}/>
              <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
              <YAxis tick={TICK} tickLine={false} axisLine={false}/>
              <Tooltip content={(p) => <WarmTooltip {...p} formatter={(v: number) => `${v} unlocks`}/>}/>
              <ReferenceLine y={80} stroke="#ef444430" strokeDasharray="4 4"/>
              <Bar dataKey="unlocks" name="Unlocks" radius={[3,3,0,0]}
                fill={PALETTE.gold}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category donut */}
      {categoryAvg.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <p className="text-sm font-semibold text-ink font-sans mb-4">Where Your Time Goes</p>
          <div className="flex gap-4 items-center">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={categoryAvg} dataKey="avgMins" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                  {categoryAvg.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]}/>)}
                </Pie>
                <Tooltip content={(p) => <WarmTooltip {...p} formatter={(v: number) => minsToHM(v)}/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {categoryAvg.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}/>
                  <span className="text-xs font-sans text-ink/60 flex-1">{c.name}</span>
                  <span className="text-[10px] font-mono text-ink/40">{minsToHM(c.avgMins)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* App hall of shame */}
      {appAvg.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <p className="text-sm font-semibold text-ink font-sans mb-1">App Hall of Shame</p>
          <p className="text-[11px] text-ink/35 font-sans mb-4">Average daily usage</p>
          <div className="space-y-2.5">
            {appAvg.slice(0,7).map((app, i) => (
              <div key={app.name}>
                <div className="flex items-center justify-between text-xs font-sans mb-1">
                  <span className="text-ink/60">{i+1}. {app.name}</span>
                  <span className="font-mono text-ink/50">{minsToHM(app.avgMins)}/day</span>
                </div>
                <div className="h-4 bg-mist/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width:0 }}
                    animate={{ width:`${(app.avgMins / appAvg[0].avgMins) * 100}%`}}
                    transition={{ delay: i * 0.05 }}
                    className="h-full rounded-full flex items-center pl-2"
                    style={{ background: i === 0 ? "#C0392B" : i === 1 ? "#C47D5A" : i === 2 ? "#C4A35A" : "#8B8075" }}
                  >
                    <span className="text-[9px] text-white font-semibold">{app.totalHours}h total</span>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phone vs Study score */}
      {correlation.length >= 3 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <p className="text-sm font-semibold text-ink font-sans mb-1">Phone vs Study Score</p>
          <p className="text-[11px] text-ink/35 font-sans mb-4">The correlation you need to see</p>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <CartesianGrid {...GRID_PROPS}/>
              <XAxis dataKey="screenMins" name="Screen time" tick={TICK} tickLine={false} axisLine={false}
                tickFormatter={(v) => `${Math.round(v/60)}h`} label={{ value:"Screen time", position:"insideBottom", offset:-2, style:{fontSize:9,fill:"#8B8075"} }}/>
              <YAxis dataKey="studyScore" name="Study score" domain={[0,100]} tick={TICK} tickLine={false} axisLine={false}/>
              <Tooltip content={(p) => {
                const d = p.payload?.[0]?.payload;
                if (!d) return null;
                return (
                  <div className="bg-white rounded-xl border border-mist/60 p-3 shadow-lg text-left">
                    <p className="text-[10px] text-ink/40 font-sans mb-1">{d.date}</p>
                    <p className="text-xs text-ink font-sans">📱 {minsToHM(d.screenMins)}</p>
                    <p className="text-xs text-ink font-sans">📚 Score: {d.studyScore}/100</p>
                  </div>
                );
              }}/>
              <Scatter data={correlation} fill={PALETTE.sage} opacity={0.8}/>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Productivity ratio */}
      {prodRatio.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <p className="text-sm font-semibold text-ink font-sans mb-1">Productivity Ratio</p>
          <p className="text-[11px] text-ink/35 font-sans mb-4">% of screen time on productive apps · goal: 25%+</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={prodRatio} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6B8F71" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6B8F71" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS}/>
              <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
              <YAxis tick={TICK} tickLine={false} axisLine={false} domain={[0,100]} tickFormatter={(v) => `${v}%`}/>
              <Tooltip content={(p) => <WarmTooltip {...p} formatter={(v: number) => `${v}%`}/>}/>
              <ReferenceLine y={25} stroke="#6B8F7160" strokeDasharray="4 4"/>
              <Area type="monotone" dataKey="pct" name="Productivity" stroke={PALETTE.sage} fill="url(#prodGrad)" strokeWidth={2} dot={{ r:2 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 90-day heatmap */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
        <p className="text-sm font-semibold text-ink font-sans mb-1">Usage Heatmap</p>
        <p className="text-[11px] text-ink/35 font-sans mb-3">Last 90 days · green = under 2h · red = 6h+</p>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1 shrink-0">
              {Array.from({ length: 7 }, (_, di) => {
                const cell = week[di] ?? null;
                return (
                  <div key={di} className="w-3 h-3 rounded-sm"
                    style={{ background: cell ? heatColor(cell.mins) : "#F5F0E8" }}
                    title={cell ? `${cell.date}: ${minsToHM(cell.mins)}` : ""}/>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-ink/30 font-sans">Low</span>
          {["#B8D4BB","#C4A35A","#C47D5A","#C0392B"].map((c) => (
            <div key={c} className="w-3 h-3 rounded-sm" style={{ background: c }}/>
          ))}
          <span className="text-[10px] text-ink/30 font-sans">6h+</span>
        </div>
      </div>
    </div>
  );
}

// ─── Insights Tab ─────────────────────────────────────────────────────────────

function InsightsTab({ logsCount }: { logsCount: number }) {
  const [insights, setInsights]   = useState<Insights | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setLoading(true); setError("");
    const res = await fetch("/api/phone/insights");
    const d   = await res.json();
    if (!res.ok || d.error) { setError(d.error ?? "Failed"); setLoading(false); return; }
    setInsights(d); setGenerated(true); setLoading(false);
  }

  if (logsCount < 3) return (
    <div className="text-center py-16">
      <AlertTriangle size={32} className="text-gold mx-auto mb-3"/>
      <p className="text-sm font-semibold text-ink font-sans">Need 3+ days of data</p>
      <p className="text-xs text-ink/40 font-sans mt-1">Upload more YourHour PDFs to unlock AI insights</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {!generated && (
        <div className="bg-white rounded-2xl p-6 text-center shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <div className="w-12 h-12 rounded-2xl bg-sage/10 flex items-center justify-center mx-auto mb-3">
            <Zap size={22} className="text-sage"/>
          </div>
          <p className="font-serif text-lg font-semibold text-ink mb-1">AI Phone Analysis</p>
          <p className="text-sm text-ink/45 font-sans mb-5">
            Groq will analyse your {logsCount} days of data and tell you exactly what's killing your focus.
          </p>
          {error && <p className="text-xs text-terracotta font-sans mb-3">{error}</p>}
          <button onClick={generate} disabled={loading}
            className="inline-flex items-center gap-2 bg-sage text-white rounded-2xl px-6 py-3 text-sm font-semibold font-sans disabled:opacity-40 shadow-[0_2px_12px_rgba(107,143,113,0.30)] hover:bg-sage/90 transition-colors">
            {loading ? "Analysing…" : "Generate Insights"}
          </button>
        </div>
      )}

      {insights && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-4">
          {/* Top killer */}
          <div className="bg-terracotta/8 border border-terracotta/25 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-terracotta"/>
              <p className="text-xs font-semibold text-terracotta font-sans uppercase tracking-widest">Your #1 Productivity Killer</p>
            </div>
            <p className="text-sm font-sans text-ink/80 leading-relaxed">{insights.topKiller}</p>
          </div>

          {/* Correlation */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
            <p className="text-xs font-semibold text-ink/50 font-sans uppercase tracking-widest mb-2">Phone ↔ Study Score Correlation</p>
            <p className="text-sm font-sans text-ink/80 leading-relaxed">{insights.correlationInsight}</p>
          </div>

          {/* Unlock */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
            <p className="text-xs font-semibold text-ink/50 font-sans uppercase tracking-widest mb-2">Your Unlock Pattern</p>
            <p className="text-sm font-sans text-ink/80 leading-relaxed">{insights.unlockInsight}</p>
          </div>

          {/* Trend */}
          <div className={`rounded-2xl p-5 border ${
            insights.improvingOrNot.toLowerCase().includes("improv") ? "bg-sage/8 border-sage/20" : "bg-gold/8 border-gold/20"
          }`}>
            <p className="text-xs font-semibold font-sans uppercase tracking-widest mb-2" style={{
              color: insights.improvingOrNot.toLowerCase().includes("improv") ? "#6B8F71" : "#C4A35A"
            }}>Progress Assessment</p>
            <p className="text-sm font-sans text-ink/80 leading-relaxed">{insights.improvingOrNot}</p>
          </div>

          {/* Action plan */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={14} className="text-sage"/>
              <p className="text-xs font-semibold text-ink/50 font-sans uppercase tracking-widest">Your Action Plan</p>
            </div>
            <ol className="space-y-2.5">
              {insights.actionPlan.map((action, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-sage/15 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-semibold text-sage">{i+1}</span>
                  </div>
                  <p className="text-sm font-sans text-ink/75 leading-snug">{action}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Motivational truth */}
          <div className="bg-ink rounded-2xl p-5">
            <p className="font-serif text-sm italic text-cream/80 leading-relaxed">"{insights.motivationalTruth}"</p>
          </div>

          <button onClick={() => { setGenerated(false); setInsights(null); }}
            className="w-full py-2.5 text-xs text-ink/30 font-sans hover:text-ink/60 transition-colors">
            Regenerate
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhonePage() {
  const [tab, setTab]           = useState<Tab>("upload");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading]   = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/phone/analytics");
    const d   = await res.json();
    if (res.ok && !d.empty) setAnalytics(d);
    else setAnalytics(null);
    setLoading(false);
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const logsCount = analytics?.summary.totalDays ?? 0;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-ink">Phone <em>Addiction.</em></h1>
        <p className="text-sm text-ink/40 font-sans mt-1">Track it. Face it. Beat it.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-mist/50 rounded-2xl p-1 mb-5">
        {([
          { key:"upload",    label:"📥 Upload"   },
          { key:"analytics", label:"📊 Analytics" },
          { key:"insights",  label:"🧠 Insights"  },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="relative flex-1 py-2.5 text-sm font-medium font-sans rounded-xl"
            style={{ color: tab === key ? "#2D2A26" : "#8B8075" }}>
            {tab === key && (
              <motion.div layoutId="phone-tab"
                className="absolute inset-0 bg-white rounded-xl shadow-[0_1px_4px_rgba(45,42,38,0.10)]"
                transition={{ type:"spring", damping:20, stiffness:300 }}/>
            )}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
          exit={{ opacity:0, y:-4 }} transition={{ duration:0.18 }}>
          {tab === "upload"    && <UploadTab onSaved={loadAnalytics}/>}
          {tab === "analytics" && <AnalyticsTab analytics={analytics} loading={loading}/>}
          {tab === "insights"  && <InsightsTab logsCount={logsCount}/>}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
