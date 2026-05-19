import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { startOfDay, subDays } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, mood, energy, screenTimeMins, pickupCount, weightKg, sleepHours, proteinGrams } = await req.json();
  if (!content?.trim() || !mood || !energy) {
    return NextResponse.json({ error: "content, mood, and energy are required" }, { status: 400 });
  }
  if (mood < 1 || mood > 5 || energy < 1 || energy > 5) {
    return NextResponse.json({ error: "mood and energy must be 1–5" }, { status: 400 });
  }

  const today = startOfDay(new Date());
  const extras = {
    screenTimeMins: screenTimeMins != null ? Number(screenTimeMins) : null,
    pickupCount:    pickupCount    != null ? Number(pickupCount)    : null,
    weightKg:       weightKg       != null ? Number(weightKg)       : null,
    sleepHours:     sleepHours     != null ? Number(sleepHours)     : null,
    proteinGrams:   proteinGrams   != null ? Number(proteinGrams)   : null,
  };

  const entry = await db.journalEntry.upsert({
    where: { userId_date: { userId, date: today } },
    update: { content: content.trim(), mood: Number(mood), energy: Number(energy), ...extras },
    create: { userId, date: today, content: content.trim(), mood: Number(mood), energy: Number(energy), ...extras },
  });

  return NextResponse.json(entry, { status: 200 });
}
