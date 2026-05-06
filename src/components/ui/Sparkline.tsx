"use client";

import { motion } from "framer-motion";

interface SparklineProps {
  data: (number | null)[];
  width?: number;
  height?: number;
  max?: number;
  color?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 32,
  max = 100,
  color = "#6B8F71",
}: SparklineProps) {
  const n = data.length;
  if (n < 2) return <div style={{ width, height }} />;

  // Build SVG path segments — skip nulls (lift pen)
  type Pt = { x: number; y: number };
  const segments: Pt[][] = [];
  let current: Pt[] = [];

  data.forEach((v, i) => {
    if (v === null) {
      if (current.length) { segments.push(current); current = []; }
      return;
    }
    const x = (i / (n - 1)) * width;
    const y = height - Math.max(0, Math.min(1, v / max)) * height;
    current.push({ x, y });
  });
  if (current.length) segments.push(current);

  const toD = (pts: Pt[]) =>
    pts.reduce((d, p, i) => d + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), "");

  const allPts = segments.flat();

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
    >
      {/* Guide lines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={0} y1={height * (1 - f)}
          x2={width} y2={height * (1 - f)}
          stroke="#E8E2D8" strokeWidth="0.5"
        />
      ))}

      {/* Path segments */}
      {segments.map((pts, si) => (
        <motion.path
          key={si}
          d={toD(pts)}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        />
      ))}

      {/* Dots */}
      {allPts.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x} cy={p.y} r="2"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6 + i * 0.05 }}
        />
      ))}

      {/* Today dot (last point) — larger */}
      {allPts.length > 0 && (() => {
        const last = allPts[allPts.length - 1];
        return (
          <motion.circle
            cx={last.x} cy={last.y} r="3"
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9 }}
          />
        );
      })()}
    </svg>
  );
}
