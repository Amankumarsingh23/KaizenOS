import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
  shimmer?: boolean;
  style?: React.CSSProperties;
}

const rounds = { sm: "rounded-lg", md: "rounded-xl", lg: "rounded-2xl", full: "rounded-full" };

export function Skeleton({ className, rounded = "lg", shimmer = true, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        shimmer ? "skeleton-shimmer" : "bg-mist/70 animate-pulse",
        rounds[rounded],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

export function ScoreCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1 mr-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32 mt-2" />
          <Skeleton className="h-3 w-24 mt-1" />
        </div>
        <Skeleton className="w-20 h-20 shrink-0" rounded="full" />
      </div>
    </div>
  );
}

export function SessionRowSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3">
      <Skeleton className="w-10 h-3 shrink-0 mt-1" />
      <div className="flex flex-col items-center gap-1 pt-1">
        <Skeleton className="w-2.5 h-2.5" rounded="full" />
        <Skeleton className="w-0.5 h-10" />
      </div>
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function StreakChipSkeleton() {
  return <Skeleton className="h-[76px] w-[76px] shrink-0" rounded="lg" />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)] space-y-3">
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2 w-3/4" rounded="full" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,42,38,0.06)]"
      style={{ height: height + 64 }}
    >
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="w-full" rounded="lg"
        style={{ height } as React.CSSProperties} />
    </div>
  );
}
