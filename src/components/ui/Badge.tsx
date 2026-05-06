import { cn } from "@/lib/utils";
import type { Category, GDTopicCategory, InterviewType } from "@/types";

type BadgeVariant = "default" | Category | GDTopicCategory | InterviewType;

const styles: Record<string, string> = {
  default:         "bg-mist text-ink/70",
  // Study categories
  DSA:             "bg-blue-50 text-blue-700 border border-blue-100",
  GD:              "bg-sage/10 text-sage border border-sage/20",
  MOCK_INTERVIEW:  "bg-gold/10 text-amber-700 border border-gold/20",
  PROJECT_WORK:    "bg-purple-50 text-purple-700 border border-purple-100",
  CURRENT_AFFAIRS: "bg-sky-50 text-sky-700 border border-sky-100",
  JAPANESE:        "bg-rose-50 text-rose-700 border border-rose-100",
  COMMUNICATION:   "bg-terracotta/10 text-terracotta border border-terracotta/20",
  READING:         "bg-mist text-ink/60 border border-mist",
  // GD topic categories
  ABSTRACT:        "bg-indigo-50 text-indigo-700 border border-indigo-100",
  BUSINESS:        "bg-amber-50 text-amber-700 border border-amber-100",
  TECHNICAL:       "bg-blue-50 text-blue-700 border border-blue-100",
  ETHICAL:         "bg-orange-50 text-orange-700 border border-orange-100",
  // Interview types
  HR:              "bg-sage/10 text-sage border border-sage/20",
  SYSTEM_DESIGN:   "bg-violet-50 text-violet-700 border border-violet-100",
};

const labels: Record<string, string> = {
  DSA: "DSA", GD: "GD", MOCK_INTERVIEW: "Mock", PROJECT_WORK: "Project",
  CURRENT_AFFAIRS: "Current Affairs", JAPANESE: "Japanese",
  COMMUNICATION: "Communication", READING: "Reading",
  ABSTRACT: "Abstract", BUSINESS: "Business", TECHNICAL: "Technical",
  ETHICAL: "Ethical", HR: "HR", SYSTEM_DESIGN: "System Design",
};

interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  className?: string;
}

export function Badge({ variant = "default", label, className }: BadgeProps) {
  const style = styles[variant] ?? styles.default;
  const text = label ?? labels[variant] ?? variant;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans",
        style,
        className
      )}
    >
      {text}
    </span>
  );
}

export function NewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-sans bg-sage text-white uppercase tracking-wide",
        className
      )}
    >
      New
    </span>
  );
}
