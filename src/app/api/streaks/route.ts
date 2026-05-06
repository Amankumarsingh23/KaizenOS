import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  format, startOfDay, startOfWeek, subDays, differenceInDays, getDay,
} from "date-fns";

const CATEGORIES = [
  "DSA","GD","MOCK_INTERVIEW","PROJECT_WORK",
  "CURRENT_AFFAIRS","JAPANESE","COMMUNICATION","READING",
] as const;

const MILESTONE_THRESHOLDS = [3, 7, 14, 21, 30, 60, 90, 180, 365];

type Status = "active" | "pending" | "broken";

function streakStatus(lastActivityDate: Date, today: Date): Status {
  const diff = differenceInDays(startOfDay(today), startOfDay(new Date(lastActivityDate)));
  if (diff === 0) return "active";
  if (diff === 1) return "pending";
  return "broken";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const now       = new Date();
  const today     = startOfDay(now);
  const yearStart = subDays(today, 364);

  // Align year heatmap to Monday boundary
  const heatStart = startOfWeek(yearStart, { weekStartsOn: 1 });

  const [dbStreaks, yearSessions, firstSession] = await Promise.all([
    db.streak.findMany({ where: { userId } }),
    db.studySession.findMany({
      where: { userId, startTime: { gte: heatStart } },
      orderBy: { startTime: "asc" },
      select: {
        id: true, category: true, durationMinutes: true,
        selfRating: true, notes: true, startTime: true,
      },
    }),
    db.studySession.findFirst({
      where: { userId },
      orderBy: { startTime: "asc" },
      select: { startTime: true },
    }),
  ]);

  // ── Streaks ────────────────────────────────────────────────────────────────

  const streaks = CATEGORIES.map((cat) => {
    const s = dbStreaks.find((x) => x.category === cat);
    const current = s?.currentStreak ?? 0;
    const best    = s?.bestStreak    ?? 0;
    const last    = s ? new Date(s.lastActivityDate) : new Date(0);
    return {
      category: cat,
      currentStreak: current,
      bestStreak: best,
      lastActivityDate: s ? format(last, "yyyy-MM-dd") : null,
      status: s ? streakStatus(last, today) : ("broken" as Status),
    };
  });

  // ── Year heatmap ───────────────────────────────────────────────────────────

  // Group sessions by date
  const dayMap: Record<string, {
    count: number;
    sessions: { id: string; category: string; durationMinutes: number; selfRating: number; notes: string; startTime: string }[];
  }> = {};

  for (const s of yearSessions) {
    const key = format(new Date(s.startTime), "yyyy-MM-dd");
    if (!dayMap[key]) dayMap[key] = { count: 0, sessions: [] };
    dayMap[key].count++;
    dayMap[key].sessions.push({ ...s, startTime: new Date(s.startTime).toISOString() });
  }

  // Build 7×N grid (aligned to Monday)
  const heatmapDays: {
    date: string;
    count: number;
    dow: number; // 0=Mon…6=Sun
    sessions: typeof dayMap[string]["sessions"];
  }[] = [];

  const cursor = new Date(heatStart);
  while (cursor <= today) {
    const key = format(cursor, "yyyy-MM-dd");
    const dow = (getDay(cursor) + 6) % 7;
    const inRange = cursor >= yearStart;
    heatmapDays.push({
      date: key,
      count: inRange ? (dayMap[key]?.count ?? 0) : -1, // -1 = padding
      dow,
      sessions: inRange ? (dayMap[key]?.sessions ?? []) : [],
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── Consistency score ──────────────────────────────────────────────────────

  const startDate  = firstSession ? startOfDay(new Date(firstSession.startTime)) : today;
  const totalDays  = differenceInDays(today, startDate) + 1;
  const activeDays = new Set(
    yearSessions
      .filter((s) => new Date(s.startTime) >= startDate)
      .map((s) => format(new Date(s.startTime), "yyyy-MM-dd"))
  ).size;
  const consistencyScore = totalDays > 0 ? activeDays / totalDays : 0;

  // ── Milestones ─────────────────────────────────────────────────────────────

  const milestones = streaks
    .filter((s) => s.bestStreak > 0 || s.currentStreak > 0)
    .map((s) => {
      const achieved = MILESTONE_THRESHOLDS.filter((t) => s.bestStreak >= t);
      const next     = MILESTONE_THRESHOLDS.find((t) => t > s.currentStreak) ?? null;
      return {
        category:      s.category,
        currentStreak: s.currentStreak,
        bestStreak:    s.bestStreak,
        nextMilestone: next,
        daysAway:      next !== null ? next - s.currentStreak : 0,
        achieved,
        status:        s.status,
      };
    })
    .sort((a, b) => a.daysAway - b.daysAway);

  // ── Category breakdown ─────────────────────────────────────────────────────

  const last84 = subDays(today, 83);
  const categoryBreakdown = CATEGORIES.map((cat) => {
    const all    = yearSessions.filter((s) => s.category === cat);
    const recent = all.filter((s) => new Date(s.startTime) >= last84);

    // Mini heatmap (last 12 weeks = 84 days)
    const miniMap: Record<string, number> = {};
    for (const s of recent) {
      const k = format(new Date(s.startTime), "yyyy-MM-dd");
      miniMap[k] = (miniMap[k] ?? 0) + 1;
    }
    const miniHeatmap = Array.from({ length: 84 }, (_, i) => {
      const d   = subDays(today, 83 - i);
      const key = format(d, "yyyy-MM-dd");
      return { date: key, count: miniMap[key] ?? 0, dow: (getDay(d) + 6) % 7 };
    });

    const totalMinutes = all.reduce((s, r) => s + r.durationMinutes, 0);
    return {
      category:      cat,
      totalSessions: all.length,
      totalMinutes,
      avgDuration:   all.length > 0 ? Math.round(totalMinutes / all.length) : 0,
      miniHeatmap,
    };
  }).filter((c) => c.totalSessions > 0);

  return NextResponse.json({
    streaks,
    heatmapDays,
    consistency: {
      score: Math.round(consistencyScore * 100),
      activeDays,
      totalDays,
      startDate: format(startDate, "MMM d, yyyy"),
    },
    milestones,
    categoryBreakdown,
  });
}
