import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { startOfWeek } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  // Get my added friends
  const friendships = await db.friendship.findMany({
    where: { userId },
    select: { friendId: true },
  });
  const friendIds = friendships.map((f) => f.friendId);
  const userIds   = [userId, ...friendIds];

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
    const s  = weekSessions.filter((s) => s.userId === u.id);
    const st = streaks.filter((x) => x.userId === u.id);
    const topStreak = [...st].sort((a, b) => b.currentStreak - a.currentStreak)[0] ?? null;
    return {
      id:           u.id,
      name:         u.name ?? "Anonymous",
      image:        u.image,
      code:         u.id.slice(0, 8).toUpperCase(),
      isYou:        u.id === userId,
      sessionCount: s.length,
      totalMinutes: s.reduce((sum, x) => sum + x.durationMinutes, 0),
      activeStreaks: st.filter((x) => x.currentStreak > 0).length,
      topStreak:    topStreak?.currentStreak > 0
        ? { category: topStreak.category, days: topStreak.currentStreak } : null,
    };
  }).sort((a, b) => b.totalMinutes - a.totalMinutes || b.sessionCount - a.sessionCount);

  return NextResponse.json({ rows, myCode: userId.slice(0, 8).toUpperCase() });
}
