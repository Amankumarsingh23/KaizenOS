"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Plus, FolderOpen, ChevronRight, GitBranch } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MilestoneMeta {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  phase: string | null;
  targetDate: string;
}

interface Project {
  id:          string;
  name:        string;
  description: string;
  color:       string;
  repoUrl:     string | null;
  createdAt:   string;
  milestones:  MilestoneMeta[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function completionPct(milestones: MilestoneMeta[]) {
  if (!milestones.length) return 0;
  const done = milestones.filter((m) => m.status === "COMPLETED").length;
  return Math.round((done / milestones.length) * 100);
}

function dateRange(milestones: MilestoneMeta[]) {
  if (!milestones.length) return "No milestones";
  const dates = milestones.map((m) => new Date(m.targetDate).getTime());
  const earliest = new Date(Math.min(...dates));
  const latest   = new Date(Math.max(...dates));
  return `${format(earliest, "MMM yyyy")} – ${format(latest, "MMM yyyy")}`;
}

function phaseBreakdown(milestones: MilestoneMeta[]) {
  const phases: Record<string, { total: number; done: number }> = {};
  for (const m of milestones) {
    const key = m.phase ?? "Milestones";
    if (!phases[key]) phases[key] = { total: 0, done: 0 };
    phases[key].total++;
    if (m.status === "COMPLETED") phases[key].done++;
  }
  return Object.entries(phases);
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const pct    = completionPct(project.milestones);
  const range  = dateRange(project.milestones);
  const phases = phaseBreakdown(project.milestones);

  const statusColor =
    pct === 100 ? "#6B8F71" :
    pct > 0     ? "#C4A35A" :
                  project.color;

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(45,42,38,0.08)] overflow-hidden cursor-pointer hover:shadow-[0_4px_28px_rgba(45,42,38,0.12)] transition-shadow"
    >
      {/* Color stripe */}
      <div className="h-1.5" style={{ background: statusColor }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-xl font-semibold text-ink leading-tight">
              {project.name}
            </h2>
            <p className="text-xs text-ink/40 font-sans mt-0.5">{range}</p>
            {project.repoUrl && (
              <div className="flex items-center gap-1 mt-1">
                <GitBranch size={10} className="text-ink/25" />
                <span className="text-[10px] text-ink/30 font-mono">{project.repoUrl.split("/")[1] ?? project.repoUrl}</span>
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-serif text-3xl font-semibold" style={{ color: statusColor }}>
              {pct}
            </p>
            <p className="text-[10px] text-ink/30 font-sans leading-none">%</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-ink/55 font-sans leading-relaxed mb-4 line-clamp-2">
          {project.description}
        </p>

        {/* Phase breakdown bars */}
        <div className="space-y-2">
          {phases.map(([phase, { total, done }]) => {
            const phaseShort = phase.replace(/Phase \d+: /, "");
            const phasePct   = total > 0 ? (done / total) * 100 : 0;
            return (
              <div key={phase}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] text-ink/40 font-sans truncate max-w-[200px]">
                    {phaseShort}
                  </p>
                  <p className="text-[11px] font-mono text-ink/40">{done}/{total}</p>
                </div>
                <div className="h-1 rounded-full bg-mist overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: statusColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${phasePct}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end mt-4">
          <span className="flex items-center gap-1 text-xs text-ink/35 font-sans hover:text-ink/60 transition-colors">
            View project <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Add Project Modal ────────────────────────────────────────────────────────

const COLORS = ["#6B8F71","#C4A35A","#C47D5A","#5B8FD4","#8B5CF6","#F43F5E"];

function AddProjectForm({ onCreated }: { onCreated: (p: Project) => void }) {
  const [name, setName]       = useState("");
  const [desc, setDesc]       = useState("");
  const [color, setColor]     = useState(COLORS[0]);
  const [repoUrl, setRepo]    = useState("");
  const [saving, setSaving]   = useState(false);

  async function handle() {
    if (!name.trim()) return;
    setSaving(true);
    // Normalize GitHub URL → owner/repo
    const normalizedRepo = repoUrl
      .replace(/^https?:\/\/(www\.)?github\.com\//, "")
      .replace(/\.git$/, "").replace(/\/$/, "").trim();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc, color, repoUrl: normalizedRepo }),
    });
    const p = await res.json();
    onCreated({ ...p, milestones: [] });
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-ink/40 font-sans mb-1.5">Project Name</label>
        <input
          autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Database Engine"
          className="w-full bg-cream border border-mist rounded-xl px-4 py-3 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30"
        />
      </div>
      <div>
        <label className="block text-xs text-ink/40 font-sans mb-1.5">Description</label>
        <textarea
          value={desc} onChange={(e) => setDesc(e.target.value)}
          placeholder="What are you building?"
          rows={2}
          className="w-full bg-cream border border-mist rounded-xl px-4 py-3 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs text-ink/40 font-sans mb-1.5">
          GitHub Repo <span className="text-ink/25">(optional — owner/repo)</span>
        </label>
        <input
          value={repoUrl} onChange={(e) => setRepo(e.target.value)}
          placeholder="e.g. amankumarsingh23/my-project"
          className="w-full bg-cream border border-mist rounded-xl px-4 py-3 text-sm font-mono text-ink placeholder:text-ink/25 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-sage/30"
        />
      </div>
      <div>
        <label className="block text-xs text-ink/40 font-sans mb-2">Color</label>
        <div className="flex gap-2.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-transform"
              style={{
                background: c,
                transform: color === c ? "scale(1.25)" : "scale(1)",
                boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none",
              }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={handle} disabled={!name.trim() || saving}
        className="w-full bg-sage text-white rounded-2xl py-3.5 text-sm font-semibold font-sans disabled:opacity-40 hover:bg-sage/90 transition-colors"
        style={{ boxShadow: "0 2px 12px rgba(107,143,113,0.30)" }}
      >
        {saving ? "Creating…" : "Create Project"}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Your <em>Projects.</em></h1>
          <p className="text-sm text-ink/40 font-sans mt-1">Long-form work, tracked milestone by milestone</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-sage text-white rounded-full px-4 py-2 text-xs font-semibold font-sans shadow-[0_2px_12px_rgba(107,143,113,0.30)] hover:bg-sage/90 transition-colors mt-1"
        >
          <Plus size={13} strokeWidth={2.5} /> New
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => <Skeleton key={i} className="h-56" rounded="lg" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={32} className="text-ink/15 mx-auto mb-3" strokeWidth={1.2} />
          <p className="text-base font-serif text-ink/30">No projects yet</p>
          <p className="text-xs text-ink/20 font-sans mt-1">Create your first project to track milestones</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => router.push(`/projects/${p.id}`)} />
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]" onClick={() => setShowAdd(false)} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl p-6"
            style={{ boxShadow: "0 -8px 40px rgba(45,42,38,0.16)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-lg font-semibold text-ink">New Project</h3>
              <button onClick={() => setShowAdd(false)} className="text-ink/40 p-1.5 rounded-xl hover:bg-mist/60">✕</button>
            </div>
            <AddProjectForm
              onCreated={(p) => { setProjects((prev) => [...prev, p]); setShowAdd(false); }}
            />
          </motion.div>
        </>
      )}
    </AppShell>
  );
}
