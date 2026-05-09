"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  User, Bell, Calendar, Target, Download, Upload,
  Sun, Moon, Save, CheckCircle2, Eye, EyeOff,
  Code2, Users, Briefcase, FolderOpen, Globe,
  Languages, Mic, BookOpen, Loader2, LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { AppShell }    from "@/components/layout/AppShell";
import { Badge }       from "@/components/ui/Badge";
import { Skeleton }    from "@/components/ui/Skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTheme }    from "@/hooks/useTheme";
import type { Category } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: {
  key: Category;
  label: string;
  Icon: React.ElementType;
  defaultTarget: number;
  unit: string;
}[] = [
  { key: "DSA",             label: "DSA",            Icon: Code2,      defaultTarget: 30,  unit: "problems"  },
  { key: "GD",              label: "Group D.",        Icon: Users,      defaultTarget: 20,  unit: "sessions"  },
  { key: "MOCK_INTERVIEW",  label: "Mock Interview",  Icon: Briefcase,  defaultTarget: 12,  unit: "mocks"     },
  { key: "PROJECT_WORK",    label: "Project Work",    Icon: FolderOpen, defaultTarget: 20,  unit: "sessions"  },
  { key: "CURRENT_AFFAIRS", label: "Curr. Affairs",   Icon: Globe,      defaultTarget: 20,  unit: "sessions"  },
  { key: "JAPANESE",        label: "Japanese",        Icon: Languages,  defaultTarget: 15,  unit: "sessions"  },
  { key: "COMMUNICATION",   label: "Communication",   Icon: Mic,        defaultTarget: 10,  unit: "STAR stories" },
  { key: "READING",         label: "Reading",         Icon: BookOpen,   defaultTarget: 8,   unit: "books"     },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_SCHEDULE: Record<string, Category[]> = {
  "1": ["GD",             "DSA", "CURRENT_AFFAIRS"],
  "2": ["MOCK_INTERVIEW", "DSA"],
  "3": ["DSA",            "GD"],
  "4": ["COMMUNICATION",  "DSA", "GD"],
  "5": ["MOCK_INTERVIEW", "DSA"],
  "6": ["DSA",            "PROJECT_WORK"],
  "0": ["READING",        "JAPANESE", "DSA"],
};

type SaveState = "idle" | "saving" | "saved" | "error";

function useSaveState() {
  const [state, setState] = useState<SaveState>("idle");
  const save = async (fn: () => Promise<void>) => {
    setState("saving");
    try { await fn(); setState("saved"); setTimeout(() => setState("idle"), 2500); }
    catch { setState("error"); setTimeout(() => setState("idle"), 3000); }
  };
  return { state, save };
}

function SaveBtn({ state, label = "Save", onClick }: {
  state: SaveState;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={state === "saving"}
      className="flex items-center gap-1.5 bg-sage text-white rounded-xl px-4 py-2 text-sm font-semibold font-sans disabled:opacity-50 hover:bg-sage/90 transition-colors"
      style={{ boxShadow: "0 2px 8px rgba(107,143,113,0.25)" }}
    >
      {state === "saving" ? <Loader2 size={13} className="animate-spin" /> :
       state === "saved"  ? <CheckCircle2 size={13} /> :
       <Save size={13} />}
      {state === "saved" ? "Saved!" : state === "saving" ? "Saving…" : label}
    </button>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(45,42,38,0.06)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-mist/40">
        <Icon size={15} className="text-sage shrink-0" />
        <p className="text-sm font-semibold text-ink font-sans">{title}</p>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileSection() {
  const { user } = useCurrentUser();
  const [name, setName]       = useState(user?.name ?? "");
  const [github, setGH]       = useState("");
  const [cfHandle, setCF]     = useState("");
  const [lcHandle, setLcHandle] = useState("");
  const [apiKey, setKey]      = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isPublic, setPublic] = useState(false);
  const { state, save }       = useSaveState();

  useEffect(() => {
    if (user?.name) setName(user.name);
    const saved = localStorage.getItem("anthropic-api-key") ?? "";
    setKey(saved);
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.githubUsername) setGH(d.githubUsername);
      if (d.cfHandle)       setCF(d.cfHandle);
      if (d.lcHandle)       setLcHandle(d.lcHandle);
      if (d.isPublic !== undefined) setPublic(d.isPublic);
    }).catch(() => {});
  }, [user]);

  async function handleSave() {
    await save(async () => {
      await fetch("/api/settings", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, githubUsername: github, cfHandle, lcHandle, isPublic }),
      });
      if (apiKey.trim()) localStorage.setItem("anthropic-api-key", apiKey.trim());
    });
  }

  return (
    <SectionCard title="Profile" icon={User}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink/40 font-sans mb-1.5">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink focus:outline-none focus:ring-2 focus:ring-sage/30" />
          </div>
          <div>
            <label className="block text-xs text-ink/40 font-sans mb-1.5">Email</label>
            <input value={user?.email ?? ""} disabled
              className="w-full bg-mist/30 border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink/40 cursor-not-allowed" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-ink/40 font-sans mb-1.5">GitHub username</label>
          <input value={github} onChange={e => setGH(e.target.value)}
            placeholder="e.g. octocat"
            className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30" />
        </div>
        <div>
          <label className="block text-xs text-ink/40 font-sans mb-1.5">
            LeetCode username
            <span className="text-ink/25 ml-1">(for problem stats, streak & difficulty breakdown)</span>
          </label>
          <input value={lcHandle ?? ""} onChange={e => setLcHandle(e.target.value)}
            placeholder="e.g. neal_wu"
            className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30" />
        </div>
        <div>
          <label className="block text-xs text-ink/40 font-sans mb-1.5">
            Codeforces handle
            <span className="text-ink/25 ml-1">(for rating history & contest tracking)</span>
          </label>
          <input value={cfHandle} onChange={e => setCF(e.target.value)}
            placeholder="e.g. tourist"
            className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 text-sm font-sans text-ink placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30" />
        </div>
        <div>
          <label className="block text-xs text-ink/40 font-sans mb-1.5">
            Anthropic API key
            <span className="text-ink/25 ml-1">(stored locally in your browser)</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => setKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-cream border border-mist rounded-xl px-3 py-2.5 pr-10 text-sm font-mono text-ink placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
            <button onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60">
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        {/* Public profile toggle */}
        <div className="flex items-center justify-between bg-cream border border-mist rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-sans font-medium text-ink">Public profile</p>
            <p className="text-[11px] text-ink/40 font-sans mt-0.5">Show your streaks & session count on the leaderboard</p>
          </div>
          <button
            onClick={() => setPublic((v) => !v)}
            className={`w-11 h-6 rounded-full transition-colors relative ${isPublic ? "bg-sage" : "bg-mist"}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="flex items-center justify-between pt-2">
          <SaveBtn state={state} onClick={handleSave} />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-xs text-terracotta/70 hover:text-terracotta font-sans transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Monthly Targets ──────────────────────────────────────────────────────────

function TargetsSection() {
  const [rows, setRows]     = useState(() =>
    CATEGORIES.map(c => ({ category: c.key, targetValue: c.defaultTarget, unit: c.unit, current: 0 }))
  );
  const [loading, setLoading] = useState(true);
  const { state, save }       = useSaveState();
  const now = new Date();

  useEffect(() => {
    fetch("/api/settings/targets").then(r => r.json()).then(d => {
      if (d.targets?.length) {
        setRows(prev => prev.map(r => {
          const match = d.targets.find((t: {category: string; targetValue: number; unit: string; currentValue: number}) => t.category === r.category);
          return match
            ? { ...r, targetValue: match.targetValue, unit: match.unit, current: match.currentValue }
            : r;
        }));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    await save(() => fetch("/api/settings/targets", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ targets: rows }),
    }).then(r => { if (!r.ok) throw new Error(); }));
  }

  return (
    <SectionCard title={`${format(now, "MMMM yyyy")} Targets`} icon={Target}>
      {loading ? (
        <div className="space-y-3">{CATEGORIES.map(c => <Skeleton key={c.key} className="h-12" rounded="lg" />)}</div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {rows.map((row, i) => {
              const meta = CATEGORIES.find(c => c.key === row.category)!;
              const pct = row.targetValue > 0 ? Math.round((row.current / row.targetValue) * 100) : 0;
              return (
                <div key={row.category} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 flex items-center gap-2">
                    <meta.Icon size={14} className="text-ink/40 shrink-0" />
                    <span className="text-xs font-sans text-ink/60 truncate">{meta.label}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="number" min={0} max={999}
                      value={row.targetValue}
                      onChange={e => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, targetValue: Number(e.target.value) } : r))}
                      className="w-20 bg-cream border border-mist rounded-lg px-2 py-1.5 text-sm font-mono text-ink text-center focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                    <input
                      type="text"
                      value={row.unit}
                      onChange={e => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, unit: e.target.value } : r))}
                      className="flex-1 bg-cream border border-mist rounded-lg px-2 py-1.5 text-xs font-sans text-ink focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                  </div>
                  <div className="w-16 text-right shrink-0">
                    <span className="text-[11px] font-mono text-ink/35">{row.current}/{row.targetValue}</span>
                    <div className="h-1 w-full bg-mist rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-sage rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <SaveBtn state={state} onClick={handleSave} />
        </>
      )}
    </SectionCard>
  );
}

// ─── Daily Schedule ───────────────────────────────────────────────────────────

function ScheduleSection() {
  const [schedule, setSchedule] = useState<Record<string, Category[]>>(DEFAULT_SCHEDULE);
  const [loading, setLoading]   = useState(true);
  const { state, save }         = useSaveState();

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.weeklySchedule) {
        try { setSchedule(JSON.parse(d.weeklySchedule)); } catch { /* use default */ }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function toggleCat(dayKey: string, cat: Category) {
    setSchedule(prev => {
      const current = prev[dayKey] ?? [];
      const next = current.includes(cat)
        ? current.filter(c => c !== cat)
        : [...current, cat];
      return { ...prev, [dayKey]: next };
    });
  }

  async function handleSave() {
    await save(() => fetch("/api/settings", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ weeklySchedule: schedule }),
    }).then(r => { if (!r.ok) throw new Error(); }));
  }

  return (
    <SectionCard title="Weekly Schedule" icon={Calendar}>
      {loading ? (
        <div className="space-y-2">{DAY_LABELS.map(d => <Skeleton key={d} className="h-14" rounded="lg" />)}</div>
      ) : (
        <>
          <p className="text-xs text-ink/40 font-sans mb-4">Tap categories to toggle them for each day.</p>
          <div className="space-y-3 mb-4">
            {DAY_LABELS.map((label, i) => {
              const dayKey = String(i === 6 ? 0 : i + 1); // Mon=1...Sun=0
              const selected = schedule[dayKey] ?? [];
              return (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-ink/40 font-sans w-8 pt-1.5 shrink-0">{label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(({ key }) => (
                      <button
                        key={key}
                        onClick={() => toggleCat(dayKey, key)}
                        className={`transition-all ${selected.includes(key) ? "opacity-100" : "opacity-30 hover:opacity-60"}`}
                      >
                        <Badge variant={key} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <SaveBtn state={state} onClick={handleSave} />
        </>
      )}
    </SectionCard>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    notifMorning: true, notifAfternoon: true,
    notifEvening: true, notifStreak: true,
    morningTime: "08:00", eveningTime: "21:00",
  });
  const [loading, setLoading]   = useState(true);
  const { state, save }         = useSaveState();

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      setPrefs({
        notifMorning:   d.notifMorning   ?? true,
        notifAfternoon: d.notifAfternoon ?? true,
        notifEvening:   d.notifEvening   ?? true,
        notifStreak:    d.notifStreak    ?? true,
        morningTime:    d.morningTime    ?? "08:00",
        eveningTime:    d.eveningTime    ?? "21:00",
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleItems = [
    { key: "notifMorning",   label: "Morning brief",     sub: "Daily plan at 8 AM"          },
    { key: "notifAfternoon", label: "Afternoon nudge",   sub: "Reminder at 4 PM if no sessions" },
    { key: "notifEvening",   label: "Evening prompt",    sub: "Daily report reminder"        },
    { key: "notifStreak",    label: "Streak warnings",   sub: "Alert before a streak breaks" },
  ] as const;

  async function handleSave() {
    await save(() => fetch("/api/settings", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(prefs),
    }).then(r => { if (!r.ok) throw new Error(); }));
  }

  return (
    <SectionCard title="Notifications" icon={Bell}>
      {loading ? (
        <div className="space-y-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-12" rounded="lg" />)}</div>
      ) : (
        <>
          <div className="space-y-3 mb-5">
            {toggleItems.map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-mist/30 last:border-0">
                <div>
                  <p className="text-sm font-medium text-ink font-sans">{label}</p>
                  <p className="text-xs text-ink/40 font-sans">{sub}</p>
                </div>
                <button
                  onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                  className={`w-11 h-6 rounded-full transition-colors relative ${prefs[key] ? "bg-sage" : "bg-mist"}`}
                >
                  <motion.div
                    animate={{ x: prefs[key] ? 22 : 2 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Time pickers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-ink/40 font-sans mb-1.5">Morning time</label>
              <input type="time" value={prefs.morningTime}
                onChange={e => setPrefs(p => ({ ...p, morningTime: e.target.value }))}
                className="w-full bg-cream border border-mist rounded-xl px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/40 font-sans mb-1.5">Evening time</label>
              <input type="time" value={prefs.eveningTime}
                onChange={e => setPrefs(p => ({ ...p, eveningTime: e.target.value }))}
                className="w-full bg-cream border border-mist rounded-xl px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>

          <SaveBtn state={state} onClick={handleSave} />
        </>
      )}
    </SectionCard>
  );
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function ThemeSection() {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      key: "light" as const,
      label: "Light",
      sub: "Empaithy cream",
      Icon: Sun,
      preview: {
        bg: "#F5F0E8", card: "#FFFFFF",
        text: "#2D2A26", accent: "#6B8F71",
      },
    },
    {
      key: "dark" as const,
      label: "Dark",
      sub: "Deep charcoal",
      Icon: Moon,
      preview: {
        bg: "#1A1714", card: "#27231E",
        text: "#F0E8DC", accent: "#7FAF86",
      },
    },
  ];

  return (
    <SectionCard title="Theme" icon={Sun}>
      <div className="grid grid-cols-2 gap-3">
        {themes.map(({ key, label, sub, Icon, preview }) => {
          const isActive = theme === key;
          return (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`rounded-2xl overflow-hidden border-2 transition-all ${
                isActive ? "border-sage shadow-[0_2px_12px_rgba(107,143,113,0.25)]" : "border-mist hover:border-mist"
              }`}
            >
              {/* Preview swatch */}
              <div className="h-20 p-3 relative" style={{ background: preview.bg }}>
                <div className="w-full h-full rounded-lg p-2" style={{ background: preview.card }}>
                  <div className="h-2 rounded w-2/3 mb-1.5" style={{ background: preview.text, opacity: 0.6 }} />
                  <div className="h-1.5 rounded w-1/2" style={{ background: preview.text, opacity: 0.3 }} />
                  <div className="absolute bottom-3 right-3 w-6 h-6 rounded-full"
                    style={{ background: preview.accent }} />
                </div>
              </div>
              {/* Label */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-t border-mist/40">
                <Icon size={14} className={isActive ? "text-sage" : "text-ink/40"} />
                <div className="text-left">
                  <p className="text-xs font-semibold text-ink font-sans">{label}</p>
                  <p className="text-[10px] text-ink/35 font-sans">{sub}</p>
                </div>
                {isActive && <CheckCircle2 size={14} className="text-sage ml-auto" />}
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

function DataSection() {
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    window.open("/api/export", "_blank");
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // Validate basic structure
      if (!data.version || !data.exportedAt) {
        setImportStatus("Invalid file — not a KaizenOS export");
        return;
      }
      // For now just count what would be imported
      const counts = {
        sessions: (data.studySessions ?? []).length,
        reports:  (data.dailyReports  ?? []).length,
        journal:  (data.journalEntries ?? []).length,
      };
      setImportStatus(
        `Found ${counts.sessions} sessions, ${counts.reports} reports, ${counts.journal} journal entries. Full import coming soon.`
      );
    } catch {
      setImportStatus("Failed to parse file. Make sure it's a valid KaizenOS export.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <SectionCard title="Data" icon={Download}>
      <div className="space-y-4">
        {/* Export */}
        <div className="flex items-center justify-between p-4 bg-cream rounded-2xl">
          <div>
            <p className="text-sm font-medium text-ink font-sans">Export data</p>
            <p className="text-xs text-ink/40 font-sans">Download all sessions, reports, and journal as JSON</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-ink text-cream rounded-xl px-4 py-2 text-xs font-semibold font-sans hover:bg-ink/90 transition-colors"
          >
            <Download size={12} /> Export
          </button>
        </div>

        {/* Import */}
        <div className="flex items-center justify-between p-4 bg-cream rounded-2xl">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-sm font-medium text-ink font-sans">Import data</p>
            <p className="text-xs text-ink/40 font-sans">Restore from a KaizenOS JSON backup</p>
            {importStatus && (
              <p className="text-xs text-terracotta/80 font-sans mt-1">{importStatus}</p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file" accept=".json"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 border border-mist bg-white text-ink rounded-xl px-4 py-2 text-xs font-semibold font-sans hover:bg-mist/40 transition-colors disabled:opacity-50 shrink-0"
          >
            {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Import
          </button>
        </div>

        <p className="text-[11px] text-ink/25 font-sans leading-relaxed">
          Your data is stored locally in SQLite. Export regularly as a backup.
          Importing merges data with existing records.
        </p>
      </div>
    </SectionCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "profile",       label: "Profile",       Icon: User      },
  { key: "targets",       label: "Targets",       Icon: Target    },
  { key: "schedule",      label: "Schedule",      Icon: Calendar  },
  { key: "notifications", label: "Notifications", Icon: Bell      },
  { key: "theme",         label: "Theme",         Icon: Sun       },
  { key: "data",          label: "Data",          Icon: Download  },
] as const;

type Tab = typeof TABS[number]["key"];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="font-serif text-3xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-ink/40 font-sans mt-1">Customise KaizenOS to match your workflow</p>
      </div>

      {/* Tab row */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 mb-5 scrollbar-none">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium font-sans transition-all ${
              tab === key
                ? "bg-ink text-cream shadow-[0_2px_8px_rgba(45,42,38,0.20)]"
                : "bg-white text-ink/50 border border-mist/60 hover:border-mist"
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {tab === "profile"       && <ProfileSection />}
        {tab === "targets"       && <TargetsSection />}
        {tab === "schedule"      && <ScheduleSection />}
        {tab === "notifications" && <NotificationsSection />}
        {tab === "theme"         && <ThemeSection />}
        {tab === "data"          && <DataSection />}
      </motion.div>
    </AppShell>
  );
}
