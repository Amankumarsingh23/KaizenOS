import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import type { Streak, Target } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Fill a [D-6 … today] array with scores (null where no report). */
function buildLast7(reports: { date: Date; overallScore: number }[]): (number | null)[] {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const target = startOfDay(addDays(today, i - 6));
    const r = reports.find((rep) => startOfDay(new Date(rep.date)).getTime() === target.getTime());
    return r ? Math.round(r.overallScore * 10) : null; // AI uses 0-10, display as 0-100
  });
}

/** Choose the most urgent coaching nudge. */
function generateNudge(streaks: Streak[], targets: Target[], today: Date): string | null {
  const tod = startOfDay(today);

  // 1. Dormant category (no activity in 2+ days)
  const dormant = streaks
    .filter((s) => {
      const last = startOfDay(new Date(s.lastActivityDate));
      return Math.floor((tod.getTime() - last.getTime()) / 86_400_000) >= 2;
    })
    .sort((a, b) => new Date(a.lastActivityDate).getTime() - new Date(b.lastActivityDate).getTime());

  if (dormant.length) {
    const s = dormant[0];
    const days = Math.floor(
      (tod.getTime() - startOfDay(new Date(s.lastActivityDate)).getTime()) / 86_400_000
    );
    const label = s.category.replace(/_/g, " ").toLowerCase();
    return `You haven't practiced ${label} in ${days} day${days > 1 ? "s" : ""}`;
  }

  // 2. Target behind schedule
  const dom = tod.getDate();
  const daysInMonth = new Date(tod.getFullYear(), tod.getMonth() + 1, 0).getDate();
  const expected = dom / daysInMonth;

  const behind = targets
    .filter((t) => t.targetValue > 0 && t.currentValue / t.targetValue < expected - 0.1)
    .sort((a, b) => a.currentValue / a.targetValue - b.currentValue / b.targetValue);

  if (behind.length) {
    const t = behind[0];
    const gap = t.targetValue - t.currentValue;
    const label = t.category.replace(/_/g, " ");
    return `${gap} ${t.unit} behind your ${label} target this month`;
  }

  // 3. Positive message
  if (streaks.length && streaks.every((s) => s.currentStreak > 0)) {
    return "All streaks alive — keep the momentum going! 🔥";
  }

  return null;
}

/** Today's recommended focus based on which categories are most behind. */
function buildRecommendation(targets: Target[], today: Date): string | null {
  const dom = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const expected = dom / daysInMonth;

  const sorted = targets
    .filter((t) => t.targetValue > 0)
    .map((t) => ({ ...t, gap: expected - t.currentValue / t.targetValue }))
    .filter((t) => t.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  if (!sorted.length) return null;

  const focus = sorted
    .slice(0, 2)
    .map((t) => t.category.replace(/_/g, " "))
    .join(" + ");

  return `Today's focus: ${focus}`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const today  = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const [todaySessions, streaks, monthlyTargets, dailyReport, last7Reports] =
    await Promise.all([
      db.studySession.findMany({
        where: { userId, startTime: { gte: today, lt: tomorrow } },
        orderBy: { startTime: "desc" },
      }),
      db.streak.findMany({ where: { userId }, orderBy: { currentStreak: "desc" } }),
      db.target.findMany({
        where: { userId, month: today.getMonth() + 1, year: today.getFullYear() },
      }),
      db.dailyReport.findFirst({
        where: { userId, date: { gte: today, lt: tomorrow } },
      }),
      db.dailyReport.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 7,
      }),
    ]);

  return NextResponse.json({
    todaySessions,
    streaks,
    monthlyTargets,
    dailyReport,
    last7Scores:    buildLast7(last7Reports),
    nudge:          generateNudge(streaks as Streak[], monthlyTargets as Target[], today),
    recommendation: buildRecommendation(monthlyTargets as Target[], today),
  });
}
