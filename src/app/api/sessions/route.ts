import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

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

  return NextResponse.json(studySession, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 20);

  const sessions = await db.studySession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(sessions);
}
