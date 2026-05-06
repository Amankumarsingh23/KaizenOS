"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreCircleProps {
  score: number;   // 0–100
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  animate?: boolean;
}

const DIM = {
  sm: { width: 56,  cx: 28, cy: 28, r: 22, sw: 3, fs: 11 },
  md: { width: 80,  cx: 40, cy: 40, r: 32, sw: 4, fs: 16 },
  lg: { width: 112, cx: 56, cy: 56, r: 46, sw: 5, fs: 22 },
};

function useCountUp(target: number, durationMs = 1200) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from  = 0;

    const tick = (now: number) => {
      const elapsed  = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased    = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);

  return display;
}

function scoreColor(pct: number) {
  if (pct >= 70) return "#6B8F71";
  if (pct >= 40) return "#C4A35A";
  return "#C47D5A";
}

export function ScoreCircle({
  score,
  size = "md",
  label,
  className,
  animate: doAnimate = true,
}: ScoreCircleProps) {
  const d    = DIM[size];
  const pct  = Math.min(100, Math.max(0, score));
  const circ = 2 * Math.PI * d.r;
  const off  = circ - (pct / 100) * circ;
  const col  = scoreColor(pct);

  // Count-up for the text inside
  const displayed = doAnimate ? useCountUp(Math.round(pct)) : Math.round(pct);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <svg width={d.width} height={d.width} viewBox={`0 0 ${d.width} ${d.width}`}>
        {/* Track */}
        <circle cx={d.cx} cy={d.cy} r={d.r}
          fill="none" stroke="var(--color-mist)" strokeWidth={d.sw} />

        {/* Animated progress ring */}
        <motion.circle
          cx={d.cx} cy={d.cy} r={d.r}
          fill="none"
          stroke={col}
          strokeWidth={d.sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
          transform={`rotate(-90 ${d.cx} ${d.cy})`}
        />

        {/* Count-up number */}
        <text
          x={d.cx}
          y={d.cy + d.fs * 0.38}
          textAnchor="middle"
          fontSize={d.fs}
          fontFamily="var(--font-newsreader)"
          fontWeight="600"
          fill="var(--color-ink)"
        >
          {displayed}
        </text>
      </svg>

      {label && (
        <span className="text-[10px] text-ink/45 font-sans font-medium uppercase tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
}
