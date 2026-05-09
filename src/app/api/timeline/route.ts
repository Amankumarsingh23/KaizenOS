import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { format, startOfMonth, subMonths } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now      = new Date();
  const since6Mo = startOfMonth(subMonths(now, 5));

  const [allSessions, allStreaks, allReports, allMilestones, allJournal] = await Promise.all([
    db.studySession.findMany({
      where: { userId, startTime: { gte: since6Mo } },
      select: { startTime: true, category: true, durationMinutes: true, selfRating: true },
      orderBy: { startTime: "asc" },
    }),
    db.streak.findMany({ where: { userId }, select: { category: true, bestStreak: true, currentStreak: true } }),
    db.dailyReport.findMany({
      where: { userId, date: { gte: since6Mo } },
      select: { date: true, overallScore: true, summary: true },
      orderBy: { date: "asc" },
    }),
    db.milestone.findMany({
      where: { userId, status: "COMPLETED" },
      select: { completedDate: true, title: true, projectName: true },
    }),
    db.journalEntry.findMany({
      where: { userId, date: { gte: since6Mo } },
      select: { date: true, mood: true, energy: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const totalSessions = await db.studySession.count({ where: { userId } });

  // Build month summaries
  const months: {
    month: string; label: string;
    sessions: number; minutes: number; activeDays: number;
    avgMood: number | null; avgScore: number | null;
    topCategory: string | null;
    milestones: string[];
    achievements: string[];
  }[] = [];

  for (let i = 5; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    const end   = startOfMonth(subMonths(now, i - 1));
    const monthKey = format(start, "yyyy-MM");
    const label    = format(start, "MMMM yyyy");

    const ms = allSessions.filter((s) => new Date(s.startTime) >= start && new Date(s.startTime) < end);
    const rs = allReports.filter((r) => new Date(r.date) >= start && new Date(r.date) < end);
    const js = allJournal.filter((j) => new Date(j.date) >= start && new Date(j.date) < end);
    const completedMilestones = allMilestones.filter((m) =>
      m.completedDate && new Date(m.completedDate) >= start && new Date(m.completedDate) < end
    );

    if (ms.length === 0 && rs.length === 0) continue;

    const activeDays = new Set(ms.map((s) => format(new Date(s.startTime), "yyyy-MM-dd"))).size;
    const minutes    = ms.reduce((sum, s) => sum + s.durationMinutes, 0);
    const avgMood    = js.length > 0 ? Math.round((js.reduce((sum, j) => sum + j.mood, 0) / js.length) * 10) / 10 : null;
    const avgScore   = rs.length > 0 ? Math.round((rs.reduce((sum, r) => sum + r.overallScore, 0) / rs.length) * 10) / 10 : null;

    const catCounts: Record<string, number> = {};
    for (const s of ms) catCounts[s.category] = (catCounts[s.category] ?? 0) + 1;
    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Auto-detect achievements
    const achievements: string[] = [];
    const running30 = allSessions.filter((s) => new Date(s.startTime) < end);
    const totalBefore = allSessions.filter((s) => new Date(s.startTime) < start).length;
    const totalNow    = totalBefore + ms.length;
    for (const checkpoint of [25, 50, 100, 200, 300, 500]) {
      if (totalBefore < checkpoint && totalNow >= checkpoint) {
        achievements.push(`🎯 Crossed ${checkpoint} total sessions`);
      }
    }
    if (ms.length >= 25) achievements.push("🔥 25+ sessions in one month");
    if (activeDays >= 20) achievements.push("📅 Active 20+ days this month");
    if (avgScore && avgScore >= 8) achievements.push("⭐ Avg daily score above 8.0");
    const bestDSAStreak = allStreaks.find((s) => s.category === "DSA");
    if (bestDSAStreak && bestDSAStreak.bestStreak >= 7 && i === 0) achievements.push(`🏆 ${bestDSAStreak.bestStreak}-day DSA streak`);

    months.push({
      month: monthKey,
      label,
      sessions: ms.length,
      minutes,
      activeDays,
      avgMood,
      avgScore,
      topCategory,
      milestones: completedMilestones.map((m) => m.title),
      achievements,
    });
  }

  return NextResponse.json({
    months: months.reverse(),
    totalSessions,
    overallBestStreak: allStreaks.reduce((m, s) => Math.max(m, s.bestStreak), 0),
    categoriesExplored: new Set(allSessions.map((s) => s.category)).size,
  });
}
