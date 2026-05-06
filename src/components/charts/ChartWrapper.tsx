import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function ChartWrapper({
  title, subtitle, loading, empty, emptyMessage = "No data yet",
  height = 220, className, children, action,
}: ChartWrapperProps) {
  return (
    <div className={cn("bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]", className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-ink font-sans">{title}</p>
          {subtitle && <p className="text-[11px] text-ink/40 font-sans mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-2" style={{ height }}>
          <Skeleton className="h-full w-full" rounded="lg" />
        </div>
      ) : empty ? (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{ height }}
        >
          <div className="w-10 h-10 rounded-2xl bg-mist/50 flex items-center justify-center mb-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 14l4-4 3 3 4-5 3 3" stroke="#E8E2D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-xs text-ink/30 font-sans">{emptyMessage}</p>
          <p className="text-[10px] text-ink/20 font-sans mt-1">Log sessions to see analytics</p>
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </div>
  );
}

// ─── Shared Recharts primitives ───────────────────────────────────────────────

export const TICK = { fontSize: 10, fill: "#8B8075", fontFamily: "var(--font-dm-sans)" } as const;

export const GRID_PROPS = {
  stroke: "#E8E2D8",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const CAT_COLORS: Record<string, string> = {
  DSA:            "#5B8FD4",
  GD:             "#6B8F71",
  MOCK_INTERVIEW: "#C4A35A",
  PROJECT_WORK:   "#8B5CF6",
  CURRENT_AFFAIRS:"#38BDF8",
  JAPANESE:       "#F43F5E",
  COMMUNICATION:  "#C47D5A",
  READING:        "#9B8B7A",
};

export const PALETTE = {
  sage:       "#6B8F71",
  gold:       "#C4A35A",
  terracotta: "#C47D5A",
  mist:       "#E8E2D8",
  ink:        "#2D2A26",
  cream:      "#F5F0E8",
};

// Accept unknown props because Recharts v3 changed the tooltip payload type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WarmTooltip(rawProps: any) {
  const { active, payload, label, formatter } = rawProps as {
    active?: boolean;
    payload?: { color?: string; name?: string; value?: number | string }[];
    label?: string;
    formatter?: (v: number, name: string) => string;
  };
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-mist/60 p-3 shadow-lg text-left">
      {label && <p className="text-[10px] text-ink/40 font-sans mb-2 uppercase tracking-wide">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-ink/50 font-sans">{entry.name}</span>
          <span className="text-ink font-semibold font-mono ml-auto pl-2">
            {formatter && typeof entry.value === "number"
              ? formatter(entry.value, entry.name ?? "")
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
