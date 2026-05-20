import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { getLevel, getLevelTitle, getLevelProgress, getLeagueTier } from "@/lib/xp";
import { startOfWeek } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [user, settings, weeklyXpRow] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { xp: true, coins: true } }),
    db.userSettings.findUnique({ where: { userId }, select: { streakFreezeCount: true } }),
    db.weeklyXp.findUnique({ where: { userId_weekStart: { userId, weekStart } }, select: { xp: true } }),
  ]);

  const xp      = user?.xp   ?? 0;
  const coins   = user?.coins ?? 0;
  const level   = getLevel(xp);
  const weekXp  = weeklyXpRow?.xp ?? 0;
  const freezes = settings?.streakFreezeCount ?? 0;

  return NextResponse.json({
    xp, coins, level,
    levelTitle:    getLevelTitle(level),
    levelProgress: getLevelProgress(xp),
    weeklyXp:      weekXp,
    streakFreezes: freezes,
    league:        getLeagueTier(weekXp),
  });
}
