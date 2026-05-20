import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { getLeagueTier } from "@/lib/xp";
import { startOfWeek } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  // Get weekly XP for all users who studied this week (public or friend)
  const [myFriends, weeklyXpRows] = await Promise.all([
    db.friendship.findMany({ where: { userId }, select: { friendId: true } }),
    db.weeklyXp.findMany({
      where: { weekStart },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { xp: "desc" },
    }),
  ]);

  const friendIds = new Set([userId, ...myFriends.map((f) => f.friendId)]);

  // My position in global
  const myRow     = weeklyXpRows.find((r) => r.userId === userId);
  const myRank    = weeklyXpRows.findIndex((r) => r.userId === userId) + 1;
  const myWeekXp  = myRow?.xp ?? 0;
  const myTier    = getLeagueTier(myWeekXp);

  // Show top 50 + friends (always show friends even if low rank)
  const top50         = weeklyXpRows.slice(0, 50);
  const friendsInList = weeklyXpRows.filter((r) => friendIds.has(r.userId));
  const combined      = Array.from(new Map([...top50, ...friendsInList].map((r) => [r.userId, r])).values())
    .sort((a, b) => b.xp - a.xp);

  return NextResponse.json({
    myRank,
    myWeekXp,
    myTier,
    totalParticipants: weeklyXpRows.length,
    rows: combined.map((r, i) => ({
      rank:   weeklyXpRows.findIndex((x) => x.userId === r.userId) + 1,
      userId: r.userId,
      name:   r.user.name ?? "Anonymous",
      image:  r.user.image,
      weekXp: r.xp,
      tier:   getLeagueTier(r.xp),
      isYou:  r.userId === userId,
      isFriend: friendIds.has(r.userId),
    })),
  });
}
