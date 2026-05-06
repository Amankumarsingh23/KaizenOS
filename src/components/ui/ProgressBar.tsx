"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;       // 0–100
  max?: number;
  color?: "sage" | "gold" | "terracotta" | "mist";
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

const trackColors = {
  sage:       "bg-sage/15",
  gold:       "bg-gold/15",
  terracotta: "bg-terracotta/15",
  mist:       "bg-mist",
};

const fillColors = {
  sage:       "bg-sage",
  gold:       "bg-gold",
  terracotta: "bg-terracotta",
  mist:       "bg-ink/30",
};

const heights = { xs: "h-1", sm: "h-1.5", md: "h-2" };

export function ProgressBar({
  value,
  max = 100,
  color = "sage",
  size = "sm",
  showLabel = false,
  label,
  className,
  animated = true,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {(showLabel || label) && (
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-ink/50 font-sans">{label}</span>
          <span className="text-xs font-medium text-ink font-mono">
            {value}/{max}
          </span>
        </div>
      )}
      <div className={cn("w-full rounded-full overflow-hidden", trackColors[color], heights[size])}>
        <motion.div
          className={cn("h-full rounded-full", fillColors[color])}
          initial={animated ? { width: 0 } : { width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
        />
      </div>
    </div>
  );
}

// Segmented multi-color bar (for category breakdown)
interface SegmentedBarProps {
  segments: { value: number; color: string; label: string }[];
  className?: string;
}

export function SegmentedBar({ segments, className }: SegmentedBarProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  return (
    <div className={cn("flex h-1.5 rounded-full overflow-hidden gap-0.5", className)}>
      {segments.map((seg) => (
        <motion.div
          key={seg.label}
          className={cn("h-full rounded-full", seg.color)}
          initial={{ width: 0 }}
          animate={{ width: `${(seg.value / total) * 100}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      ))}
    </div>
  );
}
