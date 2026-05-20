import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    category, subcategory, startTime, endTime,
    durationMinutes, notes, selfRating, metadata,
  } = body;

  if (!category || !startTime || !durationMinutes || !notes || !selfRating) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Save the study session
  const studySession = await db.studySession.create({
    data: {
      userId,
      category,
      subcategory: subcategory ?? null,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      durationMinutes: Number(durationMinutes),
      notes,
      selfRating: Number(selfRating),
      metadata: metadata ?? null,
    },
  });

  // Update streak for the category
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingStreak = await db.streak.findUnique({
    where: { userId_category: { userId, category } },
  });

  if (existingStreak) {
    const lastDay = new Date(existingStreak.lastActivityDate);
    lastDay.setHours(0, 0, 0, 0);
    const dayGap = Math.round((today.getTime() - lastDay.getTime()) / 86_400_000);

    const newCurrent =
      dayGap === 0 ? existingStreak.currentStreak :
      dayGap === 1 ? existingStreak.currentStreak + 1 : 1;

    await db.streak.update({
      where: { userId_category: { userId, category } },
      data: {
        currentStreak:    newCurrent,
        bestStreak:       Math.max(existingStreak.bestStreak, newCurrent),
        lastActivityDate: today,
      },
    });
  } else {
    await db.streak.create({
      data: { userId, category, currentStreak: 1, bestStreak: 1, lastActivityDate: today },
    });
  }

  // Increment the current-month Target if one exists
  const now = new Date();
  await db.target.updateMany({
    where: { userId, category, month: now.getMonth() + 1, year: now.getFullYear() },
    data: { currentValue: { increment: 1 } },
  });

  // ── Award XP + Coins synchronously (quick DB write) ──────────────────────
  try {
    const { calculateSessionXP, streakMilestoneBonus } = await import("@/lib/xp");
    const { xp, coins } = calculateSessionXP(studySession);
    await db.user.update({ where: { id: userId }, data: { xp: { increment: xp }, coins: { increment: coins } } });
    // Weekly XP for league
    const { startOfWeek } = await import("date-fns");
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    await db.weeklyXp.upsert({
      where:  { userId_weekStart: { userId, weekStart } },
      update: { xp: { increment: xp } },
      create: { userId, weekStart, xp },
    });
    // Streak milestone bonus
    const streakRow = await db.streak.findUnique({ where: { userId_category: { userId, category } } });
    const bonus = streakMilestoneBonus(streakRow?.currentStreak ?? 0);
    if (bonus) {
      await db.user.update({ where: { id: userId }, data: { xp: { increment: bonus.xp }, coins: { increment: bonus.coins } } });
      await db.weeklyXp.update({ where: { userId_weekStart: { userId, weekStart } }, data: { xp: { increment: bonus.xp } } });
    }
  } catch (err) {
    console.error("[xp] award failed:", err);
  }

  // Use next/server `after` for background tasks after response is sent
  const uid = userId;
  after(async () => {
    // Badge checking
    try {
      const { checkAndAwardBadges } = await import("@/lib/badges");
      const newBadges = await checkAndAwardBadges(uid);
      if (newBadges.length) console.log("[badges] awarded:", newBadges.map((b) => b.id).join(", "));
    } catch (err) { console.error("[badges] check failed:", err); }

    // AI daily report
    if (process.env.GROQ_API_KEY) {
      try {
        const { generateDailyReport } = await import("@/lib/ai/generateDailyReport");
        await generateDailyReport(uid);
      } catch (err: unknown) {
        console.error("[auto-report] failed:", err instanceof Error ? err.message : err);
      }
    }
  });

  return NextResponse.json(studySession, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 20);

  const sessions = await db.studySession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(sessions);
}
