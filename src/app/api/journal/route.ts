import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfDay, subDays } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? 90);
  const since = subDays(startOfDay(new Date()), days);

  const entries = await db.journalEntry.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { content, mood, energy } = await req.json();
  if (!content?.trim() || !mood || !energy) {
    return NextResponse.json({ error: "content, mood, and energy are required" }, { status: 400 });
  }
  if (mood < 1 || mood > 5 || energy < 1 || energy > 5) {
    return NextResponse.json({ error: "mood and energy must be 1–5" }, { status: 400 });
  }

  const today = startOfDay(new Date());

  const entry = await db.journalEntry.upsert({
    where: { userId_date: { userId, date: today } },
    update: { content: content.trim(), mood: Number(mood), energy: Number(energy) },
    create: {
      userId,
      date: today,
      content: content.trim(),
      mood:   Number(mood),
      energy: Number(energy),
    },
  });

  return NextResponse.json(entry, { status: 200 });
}
