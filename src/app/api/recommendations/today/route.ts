import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfDay } from "date-fns";
import { buildRecommendations } from "@/lib/ai/recommendations";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const today    = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todaySessions, targets, streaks, gdTopics] = await Promise.all([
    db.studySession.findMany({
      where: { userId, startTime: { gte: today, lt: tomorrow } },
      orderBy: { startTime: "asc" },
      select: {
        category: true, durationMinutes: true,
        startTime: true, endTime: true,
      },
    }),
    db.target.findMany({
      where: { userId, month: today.getMonth() + 1, year: today.getFullYear() },
    }),
    db.streak.findMany({ where: { userId } }),
    db.gDTopic.findMany({
      orderBy: [{ practiced: "asc" }, { practiceCount: "asc" }],
      take: 50,
    }),
  ]);

  const currentHour = new Date().getHours();

  const recs = buildRecommendations(
    today,
    currentHour,
    targets.map((t) => ({
      category:     t.category,
      targetValue:  t.targetValue,
      currentValue: t.currentValue,
      unit:         t.unit,
    })),
    streaks.map((s) => ({
      category:         s.category,
      currentStreak:    s.currentStreak,
      bestStreak:       s.bestStreak,
      lastActivityDate: s.lastActivityDate,
    })),
    todaySessions.map((s) => ({
      category:        s.category,
      durationMinutes: s.durationMinutes,
      startTime:       s.startTime,
      endTime:         s.endTime,
    })),
    gdTopics.map((t) => ({
      topic:          t.topic,
      category:       t.category,
      practiced:      t.practiced,
      lastPracticedAt: t.lastPracticedAt,
    }))
  );

  return NextResponse.json(recs);
}
