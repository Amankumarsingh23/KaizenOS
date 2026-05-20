import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { getLevel, getLevelTitle, getLevelProgress, getLeagueTier } from "@/lib/xp";
import { ALL_BADGES } from "@/lib/badges";
import { format, subDays, startOfDay, startOfWeek, startOfMonth } from "date-fns";

function parseMeta(raw: string | null) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const viewerId = await getUserId(session);
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const isOwnProfile = code === "me";

  // Find target user
  const targetUser = isOwnProfile
    ? await db.user.findUnique({ where: { id: viewerId }, select: { id: true, name: true, image: true, xp: true, coins: true, createdAt: true } })
    : await db.user.findFirst({
        where: { id: { startsWith: code.toLowerCase() } },
        select: { id: true, name: true, image: true, xp: true, coins: true, createdAt: true },
      });

  if (!targetUser) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const userId   = targetUser.id;
  const isOwn    = userId === viewerId;
  const friendCheck = !isOwn
    ? await db.friendship.findFirst({ where: { userId: viewerId, friendId: userId } })
    : null;
  const isFriend = isOwn || !!friendCheck;
  // Only owner or friends can view full profile
  if (!isFriend) return NextResponse.json({ error: "Not friends" }, { status: 403 });

  const now       = new Date();
  const since90   = subDays(startOfDay(now), 90);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const [allSessions, streaks, earnedBadges, weeklyXpRow, dsaSkills, settings] = await Promise.all([
    db.studySession.findMany({
      where: { userId, startTime: { gte: since90 } },
      select: { category: true, durationMinutes: true, selfRating: true, startTime: true, metadata: true },
      orderBy: { startTime: "asc" },
    }),
    db.streak.findMany({ where: { userId } }),
    db.earnedBadge.findMany({ where: { userId }, select: { badgeId: true, earnedAt: true }, orderBy: { earnedAt: "desc" } }),
    db.weeklyXp.findUnique({ where: { userId_weekStart: { userId, weekStart } }, select: { xp: true } }),
    db.dSASkill.findMany({ where: { userId } }),
    db.userSettings.findUnique({ where: { userId }, select: { streakFreezeCount: true } }),
  ]);

  // ── Core stats ───────────────────────────────────────────────────────────
  const totalSessions = await db.studySession.count({ where: { userId } });
  const totalMinsAll  = await db.studySession.aggregate({ where: { userId }, _sum: { durationMinutes: true } });
  const totalHours    = Math.round((totalMinsAll._sum.durationMinutes ?? 0) / 60 * 10) / 10;
  const reports       = await db.dailyReport.findMany({ where: { userId }, select: { overallScore: true }, orderBy: { date: "desc" }, take: 30 });
  const avgScore      = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + (r.overallScore <= 10 ? r.overallScore * 10 : r.overallScore), 0) / reports.length)
    : null;

  // ── Activity heatmap ─────────────────────────────────────────────────────
  const sessionMap: Record<string, number> = {};
  for (const s of allSessions) {
    const key = format(new Date(s.startTime), "yyyy-MM-dd");
    sessionMap[key] = (sessionMap[key] ?? 0) + 1;
  }
  const heatmap = Array.from({ length: 90 }, (_, i) => {
    const d   = subDays(now, 89 - i);
    const key = format(d, "yyyy-MM-dd");
    const dow = (d.getDay() + 6) % 7;
    return { date: key, count: sessionMap[key] ?? 0, dow };
  });

  // ── Category breakdown this month ────────────────────────────────────────
  const monthSessions = allSessions.filter((s) => new Date(s.startTime) >= monthStart);
  const catMap: Record<string, number> = {};
  for (const s of monthSessions) catMap[s.category] = (catMap[s.category] ?? 0) + s.durationMinutes;
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, mins]) => ({ cat, hours: Math.round(mins / 60 * 10) / 10 }));

  // ── DSA skill map ─────────────────────────────────────────────────────────
  const dsaMap = dsaSkills.map((s) => ({ topic: s.topic, level: s.level }));

  // ── Streaks ──────────────────────────────────────────────────────────────
  const streakData = streaks.map((s) => {
    const diff = Math.floor((now.getTime() - new Date(s.lastActivityDate).setHours(0,0,0,0)) / 86_400_000);
    return {
      category:  s.category,
      current:   s.currentStreak,
      best:      s.bestStreak,
      active:    diff <= 1,
    };
  }).sort((a, b) => (b.active ? 1 : -1) || b.current - a.current);

  // ── Badges ───────────────────────────────────────────────────────────────
  const earnedSet = new Map(earnedBadges.map((b) => [b.badgeId, b.earnedAt]));
  const badges    = ALL_BADGES
    .filter((b) => earnedSet.has(b.id))
    .map((b) => ({ ...b, earnedAt: earnedSet.get(b.id)! }))
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());

  // ── Journey milestones ───────────────────────────────────────────────────
  const milestones: { date: string; label: string }[] = [];
  milestones.push({ date: format(new Date(targetUser.createdAt), "MMM d, yyyy"), label: "Joined KaizenOS 🐣" });

  // First session
  const firstSession = await db.studySession.findFirst({ where: { userId }, orderBy: { startTime: "asc" } });
  if (firstSession) milestones.push({ date: format(new Date(firstSession.startTime), "MMM d, yyyy"), label: "First study session logged 📖" });

  // Badge milestones — show last 5 earned
  const recentBadges = badges.slice(0, 5);
  for (const b of recentBadges) {
    milestones.push({ date: format(new Date(b.earnedAt), "MMM d, yyyy"), label: `Earned "${b.name}" ${b.emoji}` });
  }

  milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ── XP / level ───────────────────────────────────────────────────────────
  const xp      = targetUser.xp;
  const level   = getLevel(xp);
  const weekXp  = weeklyXpRow?.xp ?? 0;

  return NextResponse.json({
    userId,
    name:           targetUser.name ?? "Anonymous",
    image:          targetUser.image,
    code:           userId.slice(0, 8).toUpperCase(),
    isOwn,
    xp, level,
    levelTitle:    getLevelTitle(level),
    levelProgress: getLevelProgress(xp),
    weeklyXp:      weekXp,
    league:        getLeagueTier(weekXp),
    streakFreezes: settings?.streakFreezeCount ?? 0,
    joinedAt:      format(new Date(targetUser.createdAt), "MMMM yyyy"),
    totalSessions, totalHours, avgScore,
    streaks:        streakData,
    heatmap,
    topCategories,
    dsaMap,
    badges,
    milestones,
  });
}
