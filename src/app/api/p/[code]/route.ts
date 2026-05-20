/** Public profile API — no authentication required.
 *  Returns a curated portfolio-safe subset of the user's data. */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLevel, getLevelTitle, getLeagueTier } from "@/lib/xp";
import { ALL_BADGES } from "@/lib/badges";
import { format, subDays, startOfDay, startOfWeek } from "date-fns";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const user = await db.user.findFirst({
    where: { id: { startsWith: code.toLowerCase() } },
    select: { id: true, name: true, image: true, xp: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId    = user.id;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const since90   = subDays(startOfDay(new Date()), 90);

  const [
    totalSessions, totalMinsRow, streaks, earnedBadges, dsaSkills,
    weeklyXpRow, settings, reports,
  ] = await Promise.all([
    db.studySession.count({ where: { userId } }),
    db.studySession.aggregate({ where: { userId }, _sum: { durationMinutes: true } }),
    db.streak.findMany({ where: { userId } }),
    db.earnedBadge.findMany({ where: { userId }, select: { badgeId: true, earnedAt: true }, orderBy: { earnedAt: "desc" } }),
    db.dSASkill.findMany({ where: { userId, level: { gte: 3 } } }), // only Strong + Mastered
    db.weeklyXp.findUnique({ where: { userId_weekStart: { userId, weekStart } }, select: { xp: true } }),
    db.userSettings.findUnique({ where: { userId }, select: { featuredBadges: true } }),
    db.dailyReport.findMany({ where: { userId }, select: { overallScore: true }, take: 30, orderBy: { date: "desc" } }),
  ]);

  // Activity heatmap (90 days)
  const allSessions = await db.studySession.findMany({
    where: { userId, startTime: { gte: since90 } },
    select: { startTime: true, category: true, durationMinutes: true },
  });
  const dayMap: Record<string, number> = {};
  for (const s of allSessions) {
    const k = format(new Date(s.startTime), "yyyy-MM-dd");
    dayMap[k] = (dayMap[k] ?? 0) + 1;
  }
  const heatmap = Array.from({ length: 90 }, (_, i) => {
    const d   = subDays(new Date(), 89 - i);
    const key = format(d, "yyyy-MM-dd");
    const dow = (d.getDay() + 6) % 7;
    return { date: key, count: dayMap[key] ?? 0, dow };
  });

  // Best active streaks
  const bestStreaks = streaks
    .filter((s) => s.currentStreak > 0 || s.bestStreak >= 7)
    .map((s) => {
      const diff = Math.floor((Date.now() - new Date(s.lastActivityDate).getTime()) / 86_400_000);
      return { category: s.category, current: s.currentStreak, best: s.bestStreak, active: diff <= 1 };
    })
    .sort((a, b) => (b.active ? 1 : -1) || b.current - a.current)
    .slice(0, 4);

  // Featured + top earned badges
  const earnedSet     = new Map(earnedBadges.map((b) => [b.badgeId, b.earnedAt]));
  const featuredIds: string[] = JSON.parse(settings?.featuredBadges ?? "[]");
  const featuredBadges = featuredIds
    .map((id) => ALL_BADGES.find((b) => b.id === id))
    .filter(Boolean)
    .map((b) => ({ id: b!.id, name: b!.name, emoji: b!.emoji, rarity: b!.rarity }));

  const topBadges = ALL_BADGES
    .filter((b) => earnedSet.has(b.id))
    .sort((a, b) => {
      const r: Record<string, number> = { legendary:4, epic:3, rare:2, common:1 };
      return (r[b.rarity] ?? 0) - (r[a.rarity] ?? 0);
    })
    .slice(0, 12)
    .map((b) => ({ id: b.id, name: b.name, emoji: b.emoji, rarity: b.rarity }));

  // Categories this month
  const catMap: Record<string, number> = {};
  for (const s of allSessions) catMap[s.category] = (catMap[s.category] ?? 0) + s.durationMinutes;
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([cat, mins]) => ({ cat, hours: Math.round(mins / 60 * 10) / 10 }));

  const xp        = user.xp;
  const level     = getLevel(xp);
  const weekXp    = weeklyXpRow?.xp ?? 0;
  const totalHours = Math.round((totalMinsRow._sum.durationMinutes ?? 0) / 60 * 10) / 10;
  const avgScore   = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + (r.overallScore <= 10 ? r.overallScore * 10 : r.overallScore), 0) / reports.length)
    : null;
  const activeDays90 = Object.keys(dayMap).length;

  return NextResponse.json({
    name:          user.name ?? "Anonymous",
    image:         user.image,
    code:          userId.slice(0, 8).toUpperCase(),
    joinedAt:      format(new Date(user.createdAt), "MMMM yyyy"),
    xp, level,
    levelTitle:    getLevelTitle(level),
    weeklyXp:      weekXp,
    league:        getLeagueTier(weekXp),
    totalSessions, totalHours, avgScore,
    activeDays90,
    earnedBadgesCount: earnedBadges.length,
    bestStreaks,
    featuredBadges,
    topBadges,
    topCategories,
    dsaStrengths:  dsaSkills.map((s) => ({ topic: s.topic, level: s.level })),
    heatmap,
  });
}
