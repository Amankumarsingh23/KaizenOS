import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { startOfWeek, subDays } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const since30   = subDays(new Date(), 30);

  // Fetch all users with public profile
  const publicSettings = await db.userSettings.findMany({
    where: { isPublic: true },
    select: { userId: true },
  });
  const publicUserIds = publicSettings.map((s) => s.userId);

  // Always include the current user even if not public
  const userIds = Array.from(new Set([...publicUserIds, userId]));

  const [users, weekSessions, streaks] = await Promise.all([
    db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true },
    }),
    db.studySession.findMany({
      where: { userId: { in: userIds }, startTime: { gte: weekStart } },
      select: { userId: true, durationMinutes: true, category: true },
    }),
    db.streak.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, category: true, currentStreak: true, bestStreak: true },
    }),
  ]);

  const rows = users.map((u) => {
    const userSessions  = weekSessions.filter((s) => s.userId === u.id);
    const userStreaks    = streaks.filter((s) => s.userId === u.id);
    const totalMinutes  = userSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const sessionCount  = userSessions.length;
    const bestStreak    = userStreaks.reduce((max, s) => Math.max(max, s.currentStreak), 0);
    const activeStreaks  = userStreaks.filter((s) => s.currentStreak > 0).length;
    const topStreak     = userStreaks.sort((a, b) => b.currentStreak - a.currentStreak)[0] ?? null;
    const isYou         = u.id === userId;

    return {
      id:          u.id,
      name:        u.name ?? "Anonymous",
      image:       u.image,
      isYou,
      sessionCount,
      totalMinutes,
      bestStreak,
      activeStreaks,
      topStreak:   topStreak ? { category: topStreak.category, days: topStreak.currentStreak } : null,
    };
  }).sort((a, b) => b.totalMinutes - a.totalMinutes || b.sessionCount - a.sessionCount);

  return NextResponse.json(rows);
}
