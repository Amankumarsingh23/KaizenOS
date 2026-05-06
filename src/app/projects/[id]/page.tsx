"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import {
  CheckCircle2, Circle, Clock, ChevronLeft, Plus,
  Edit3, X, Timer, Trash2, ArrowRight,
} from "lucide-react";
import { AppShell }    from "@/components/layout/AppShell";
import { Badge }       from "@/components/ui/Badge";
import { Skeleton }    from "@/components/ui/Skeleton";
import { ScoreCircle } from "@/components/ui/ScoreCircle";

// ─── Types ────────────────────────────────────────────────────────────────────

type MStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

interface Milestone {
  id:            string;
  phase:         string | null;
  title:         string;
  description:   string;
  startDate:     string | null;
  targetDate:    string;
  completedDate: string | null;
  status:        MStatus;
  displayOrder:  number;
}

interface StudySession {
  id:              string;
  category:        string;
  durationMinutes: number;
  notes:           string;
  selfRating:      number;
  startTime:       string;
}

interface Project {
  id:             string;
  name:           string;
  description:    string;
  color:          string;
  milestones:     Milestone[];
  recentSessions: StudySession[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusIcon(s: MStatus, color: string) {
  if (s === "COMPLETED")  return <CheckCircle2 size={16} style={{ color }} className="shrink-0" />;
  if (s === "IN_PROGRESS") return <Clock size={16} style={{ color: "#C4A35A" }} className="shrink-0 animate-pulse" />;
  return <Circle size={16} className="text-mist shrink-0" />;
}

function pct(milestones: Milestone[]) {
  if (!milestones.length) return 0;
  return Math.round((milestones.filter((m) => m.status === "COMPLETED").length / milestones.length) * 100);
}

function groupByPhase(milestones: Milestone[]) {
  const groups: Record<string, Milestone[]> = {};
  for (const m of milestones) {
    const key = m.phase ?? "Milestones";
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  return Object.entries(groups);
}

// ─── Gantt Chart ─────────────────────────────────────────────────────────────

function GanttChart({ milestones, color }: { milestones: Milestone[]; color: string }) {
  const phases = groupByPhase(milestones);
  if (!phases.length) return null;

  const allDates = milestones.flatMap((m) => [
    m.startDate ? new Date(m.startDate) : new Date(m.targetDate),
    new Date(m.targetDate),
  ]);
  const min  = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const max  = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const span = Math.max(1, differenceInDays(max, min));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
      <p className="text-sm font-semibold text-ink font-sans mb-4">Timeline</p>

      {/* Month labels */}
      <div className="flex text-[9px] text-ink/30 font-sans mb-2 ml-28">
        {Array.from({ length: Math.ceil(span / 28) }, (_, i) => {
          const d = new Date(min);
          d.setDate(d.getDate() + i * 28);
          return (
            <div key={i} className="flex-1 truncate">{format(d, "MMM")}</div>
          );
        })}
      </div>

      <div className="space-y-3">
        {phases.map(([phase, phaseMilestones]) => {
          const phaseShort  = phase.replace(/Phase \d+: /, "");
          const phaseStart  = phaseMilestones[0].startDate
            ? new Date(phaseMilestones[0].startDate)
            : new Date(phaseMilestones[0].targetDate);
          const phaseEnd    = new Date(phaseMilestones[phaseMilestones.length - 1].targetDate);
          const done        = phaseMilestones.filter((m) => m.status === "COMPLETED").length;
          const total       = phaseMilestones.length;
          const leftPct     = (differenceInDays(phaseStart, min) / span) * 100;
          const widthPct    = Math.max(4, (differenceInDays(phaseEnd, phaseStart) / span) * 100);
          const fillPct     = total > 0 ? (done / total) * 100 : 0;
          const isActive    = phaseMilestones.some((m) => m.status === "IN_PROGRESS");
          const isDone      = done === total;

          return (
            <div key={phase} className="flex items-center gap-3">
              <p className="text-[10px] text-ink/40 font-sans w-24 shrink-0 truncate text-right">
                {phaseShort}
              </p>
              <div className="flex-1 relative h-5">
                {/* Track */}
                <div
                  className="absolute top-0 h-full rounded-full bg-mist/60 overflow-hidden"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  {/* Fill */}
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: isDone ? color : isActive ? "#C4A35A" : `${color}60`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${fillPct}%` }}
                    transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
                {/* Label */}
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-[9px] font-mono text-ink/30 pointer-events-none"
                  style={{ left: `calc(${leftPct + widthPct}% + 4px)` }}
                >
                  {done}/{total}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Milestone Row ────────────────────────────────────────────────────────────

function MilestoneRow({
  m, color, projectId, onUpdated, onDeleted,
}: {
  m: Milestone;
  color: string;
  projectId: string;
  onUpdated: (updated: Milestone) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing]   = useState(false);
  const [title, setTitle]       = useState(m.title);
  const [desc, setDesc]         = useState(m.description);
  const [status, setStatus]     = useState<MStatus>(m.status);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localM, setLocalM]     = useState(m);

  const STATUS_CYCLE: MStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];
  const NEXT_STATUS: Record<MStatus, MStatus> = {
    PENDING: "IN_PROGRESS", IN_PROGRESS: "COMPLETED", COMPLETED: "PENDING",
  };

  async function cycleStatus() {
    const next = NEXT_STATUS[localM.status];
    const res  = await fetch(`/api/projects/${projectId}/milestones/${localM.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const updated = await res.json();
    setLocalM(updated);
    onUpdated(updated);
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/milestones/${localM.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc }),
    });
    const updated = await res.json();
    setLocalM(updated);
    onUpdated(updated);
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/projects/${projectId}/milestones/${localM.id}`, { method: "DELETE" });
    onDeleted(localM.id);
  }

  const overdue = localM.status !== "COMPLETED" && new Date(localM.targetDate) < new Date();

  return (
    <motion.div layout className="flex items-start gap-3 py-3.5 border-b border-mist/40 last:border-0">
      {/* Status toggle */}
      <button onClick={cycleStatus} className="mt-0.5 shrink-0">
        {statusIcon(localM.status, color)}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full bg-cream border border-mist rounded-xl px-3 py-2 text-sm font-sans text-ink focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full bg-cream border border-mist rounded-xl px-3 py-2 text-xs font-sans text-ink resize-none focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 bg-sage text-white rounded-xl py-1.5 text-xs font-semibold font-sans disabled:opacity-40">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setTitle(localM.title); setDesc(localM.description); setEditing(false); }}
                className="px-3 py-1.5 rounded-xl bg-mist/60 text-ink/50 text-xs font-sans">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className={`text-sm font-sans leading-snug ${
              localM.status === "COMPLETED" ? "line-through text-ink/35" : "text-ink"
            }`}>
              {localM.title}
            </p>
            {localM.description && (
              <p className="text-xs text-ink/40 font-sans mt-0.5 leading-relaxed">{localM.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-sans ${overdue ? "text-terracotta" : "text-ink/30"}`}>
                {overdue ? "⚠ " : ""}{format(new Date(localM.targetDate), "d MMM yyyy")}
              </span>
              {localM.completedDate && (
                <span className="text-[10px] text-sage font-sans">
                  ✓ {format(new Date(localM.completedDate), "d MMM")}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {!editing && (
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-mist/60 text-ink/25 hover:text-ink/60 transition-colors">
            <Edit3 size={12} />
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-terracotta/10 text-ink/20 hover:text-terracotta transition-colors disabled:opacity-40">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Add Milestone form ───────────────────────────────────────────────────────

function AddMilestoneInline({ projectId, phase, onAdded }: {
  projectId: string;
  phase: string;
  onAdded: (m: Milestone) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [title, setTitle]   = useState("");
  const [desc, setDesc]     = useState("");
  const [date, setDate]     = useState("");
  const [saving, setSaving] = useState(false);

  async function handle() {
    if (!title.trim() || !date) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc, phase, targetDate: date }),
    });
    const created = await res.json();
    onAdded(created);
    setTitle(""); setDesc(""); setDate(""); setOpen(false);
    setSaving(false);
  }

  return (
    <div className="mt-2">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-ink/30 hover:text-ink/60 font-sans transition-colors py-1"
        >
          <Plus size={12} /> Add milestone
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2 border-t border-mist/30 pt-3 mt-1"
        >
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Milestone title"
            className="w-full bg-cream border border-mist rounded-xl px-3 py-2 text-sm font-sans text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 placeholder:text-ink/25" />
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date"
            className="w-full bg-cream border border-mist rounded-xl px-3 py-2 text-sm font-sans text-ink focus:outline-none focus:ring-2 focus:ring-sage/30" />
          <div className="flex gap-2">
            <button onClick={handle} disabled={!title.trim() || !date || saving}
              className="flex-1 bg-sage text-white rounded-xl py-2 text-xs font-semibold font-sans disabled:opacity-40">
              {saving ? "Adding…" : "Add"}
            </button>
            <button onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-xl bg-mist/60 text-ink/50 text-xs font-sans">
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then(setProject)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  function handleUpdated(updated: Milestone) {
    setProject((p) => p ? {
      ...p,
      milestones: p.milestones.map((m) => m.id === updated.id ? updated : m),
    } : p);
  }

  function handleDeleted(mId: string) {
    setProject((p) => p ? { ...p, milestones: p.milestones.filter((m) => m.id !== mId) } : p);
  }

  function handleAdded(m: Milestone) {
    setProject((p) => p ? { ...p, milestones: [...p.milestones, m] } : p);
  }

  if (loading) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <Skeleton className="h-48 mb-4" rounded="lg" />
        <Skeleton className="h-64" rounded="lg" />
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="text-center py-16">
          <p className="text-ink/40 font-sans">Project not found</p>
          <button onClick={() => router.push("/projects")} className="text-sage text-sm font-sans mt-2">
            ← Back to projects
          </button>
        </div>
      </AppShell>
    );
  }

  const completion  = pct(project.milestones);
  const phases      = groupByPhase(project.milestones);
  const currentPhase = phases.find(([, ms]) => ms.some((m) => m.status === "IN_PROGRESS"))?.[0]
    ?? phases.find(([, ms]) => ms.some((m) => m.status === "PENDING"))?.[0];

  return (
    <AppShell>
      {/* Back */}
      <button
        onClick={() => router.push("/projects")}
        className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-ink/70 font-sans mb-5 transition-colors"
      >
        <ChevronLeft size={14} /> Projects
      </button>

      {/* Header */}
      <div
        className="rounded-3xl p-6 mb-5 text-white"
        style={{ background: `linear-gradient(135deg, ${project.color}, ${project.color}CC)` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl font-semibold leading-tight mb-2">
              {project.name}
            </h1>
            <p className="text-sm opacity-80 leading-relaxed">{project.description}</p>
            {currentPhase && (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                <ArrowRight size={11} />
                <span className="text-xs font-medium">
                  {currentPhase.replace(/Phase \d+: /, "")}
                </span>
              </div>
            )}
          </div>
          <ScoreCircle score={completion} size="md" label="done" />
        </div>
      </div>

      {/* Gantt */}
      <div className="mb-5">
        <GanttChart milestones={project.milestones} color={project.color} />
      </div>

      {/* Milestone Timeline */}
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-4">
          Milestone Timeline
        </p>

        <div className="space-y-4">
          {phases.map(([phase, phaseMilestones]) => {
            const done  = phaseMilestones.filter((m) => m.status === "COMPLETED").length;
            const total = phaseMilestones.length;
            const allDone = done === total;
            const hasActive = phaseMilestones.some((m) => m.status === "IN_PROGRESS");

            return (
              <div key={phase} className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(45,42,38,0.06)] overflow-hidden">
                {/* Phase header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-mist/40">
                  <div className="flex items-center gap-2.5">
                    {allDone ? (
                      <CheckCircle2 size={14} style={{ color: project.color }} />
                    ) : hasActive ? (
                      <Clock size={14} className="text-gold animate-pulse" />
                    ) : (
                      <Circle size={14} className="text-mist" />
                    )}
                    <p className="text-sm font-semibold text-ink font-sans">{phase}</p>
                  </div>
                  <span className="text-xs font-mono text-ink/35">{done}/{total}</span>
                </div>

                {/* Milestones */}
                <div className="px-5">
                  {phaseMilestones.map((m) => (
                    <MilestoneRow
                      key={m.id} m={m} color={project.color}
                      projectId={project.id}
                      onUpdated={handleUpdated}
                      onDeleted={handleDeleted}
                    />
                  ))}
                  <AddMilestoneInline projectId={project.id} phase={phase} onAdded={handleAdded} />
                  <div className="py-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent project sessions */}
      {project.recentSessions.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-widest font-sans font-medium text-ink/40 mb-3">
            Recent Activity
          </p>
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(45,42,38,0.06)] divide-y divide-mist/40">
            {project.recentSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-7 h-7 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Timer size={13} className="text-violet-500" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-sans text-ink leading-none">
                    {s.notes === "—" ? "Project Work" : s.notes.slice(0, 60)}
                  </p>
                  <p className="text-[11px] text-ink/35 font-sans mt-0.5">
                    {s.durationMinutes} min · {format(new Date(s.startTime), "d MMM")}
                  </p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: i < s.selfRating ? "#C4A35A" : "#E8E2D8" }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
