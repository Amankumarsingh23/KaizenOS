"use client";

import { motion } from "framer-motion";

import type { ReactElement } from "react";

type EmptyType =
  | "sessions" | "streaks" | "reports" | "journal"
  | "topics"   | "projects" | "analytics" | "generic";

// ─── SVG illustrations ────────────────────────────────────────────────────────

const ILLUS: Record<EmptyType, () => ReactElement> = {
  sessions: () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity="0.06" />
      <circle cx="48" cy="48" r="30" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 4" opacity="0.25" />
      <path d="M38 33v30l26-15L38 33z" fill="currentColor" opacity="0.2" />
      <circle cx="48" cy="48" r="4" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  streaks: () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity="0.06" />
      <path d="M48 20c0 0 14 16 14 28a14 14 0 01-28 0c0-6 4-11 7-14-1 5 2 9 7 9s8-4 8-9c0-5-8-14-8-14z"
        fill="currentColor" opacity="0.18" />
      <path d="M48 52c0 4-2.5 6-5 6s-5-2-5-6c0-4 5-10 5-10s5 6 5 10z"
        fill="currentColor" opacity="0.3" />
    </svg>
  ),
  reports: () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity="0.06" />
      <rect x="28" y="22" width="40" height="52" rx="6" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <line x1="36" y1="38" x2="60" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      <line x1="36" y1="48" x2="54" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <path d="M36 60l6-8 5 6 4-5 6 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
    </svg>
  ),
  journal: () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity="0.06" />
      <rect x="26" y="24" width="36" height="48" rx="4" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <rect x="22" y="28" width="8" height="40" rx="2" fill="currentColor" opacity="0.12" />
      <line x1="34" y1="40" x2="54" y2="40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      <line x1="34" y1="48" x2="54" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <line x1="34" y1="56" x2="46" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
    </svg>
  ),
  topics: () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity="0.06" />
      <path d="M24 36c0-4 4-8 8-8h32c4 0 8 4 8 8v20c0 4-4 8-8 8H44l-12 8V64h-4c-4 0-4-4-4-8V36z"
        stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <circle cx="38" cy="46" r="3" fill="currentColor" opacity="0.25" />
      <circle cx="48" cy="46" r="3" fill="currentColor" opacity="0.25" />
      <circle cx="58" cy="46" r="3" fill="currentColor" opacity="0.25" />
    </svg>
  ),
  projects: () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity="0.06" />
      <path d="M20 40v28c0 4 4 6 6 6h44c4 0 6-2 6-6V40H20z" stroke="currentColor" strokeWidth="2.5" opacity="0.2" fill="currentColor" fillOpacity="0.04" />
      <path d="M20 40l4-10c1-2 3-4 6-4h16l4 14H20z" stroke="currentColor" strokeWidth="2" opacity="0.18" fill="currentColor" fillOpacity="0.06" />
      <line x1="32" y1="56" x2="64" y2="56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="32" y1="64" x2="52" y2="64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
    </svg>
  ),
  analytics: () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity="0.06" />
      <rect x="24" y="56" width="10" height="20" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="38" y="44" width="10" height="32" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="52" y="32" width="10" height="44" rx="2" fill="currentColor" opacity="0.25" />
      <rect x="66" y="50" width="10" height="26" rx="2" fill="currentColor" opacity="0.15" />
      <path d="M29 52l14-14 14 8 14-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
    </svg>
  ),
  generic: () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity="0.06" />
      <circle cx="48" cy="48" r="20" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M48 36v12l8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
    </svg>
  ),
};

const MESSAGES: Record<EmptyType, { title: string; body: string }> = {
  sessions:  { title: "No sessions yet",              body: "Your first session starts your first streak." },
  streaks:   { title: "No streaks yet",               body: "Log one session per day to build a streak." },
  reports:   { title: "No report for today",          body: "Complete a session then generate your AI report." },
  journal:   { title: "Start your journal",           body: "A quiet reflection at the end of each day compounds over time." },
  topics:    { title: "No topics found",              body: "Add a GD topic or switch the filter." },
  projects:  { title: "No projects yet",              body: "Track your long-form work milestone by milestone." },
  analytics: { title: "Not enough data yet",          body: "Keep logging sessions — patterns emerge within a week." },
  generic:   { title: "Nothing here yet",             body: "Data will appear as you start using the app." },
};

interface EmptyStateProps {
  type?: EmptyType;
  title?: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  type = "generic",
  title,
  body,
  action,
  className,
}: EmptyStateProps) {
  const Illus   = ILLUS[type];
  const message = MESSAGES[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center py-10 px-6 text-center ${className ?? ""}`}
    >
      <motion.div
        className="text-ink mb-4"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 18 }}
      >
        <Illus />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="font-serif text-lg font-semibold text-ink mb-1.5">
          {title ?? message.title}
        </p>
        <p className="text-sm text-ink/45 font-sans leading-relaxed max-w-xs">
          {body ?? message.body}
        </p>
      </motion.div>

      {action && (
        <motion.button
          onClick={action.onClick}
          whileTap={{ scale: 0.96 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-5 flex items-center gap-2 bg-sage text-white rounded-2xl px-5 py-2.5 text-sm font-semibold font-sans hover:bg-sage/90 transition-colors"
          style={{ boxShadow: "0 2px 12px rgba(107,143,113,0.30)" }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
