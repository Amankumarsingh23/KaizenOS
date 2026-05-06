import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOrCreate(userId: string) {
  return db.userSettings.upsert({
    where:  { userId },
    update: {},
    create: { userId },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const [settings, user] = await Promise.all([
    getOrCreate(userId),
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, image: true } }),
  ]);

  return NextResponse.json({ ...settings, user });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const {
    notifMorning, notifAfternoon, notifEvening, notifStreak,
    morningTime, eveningTime,
    weeklySchedule,
    githubUsername,
    name, // profile update
  } = body;

  const settingsData: Record<string, unknown> = {};
  if (notifMorning   !== undefined) settingsData.notifMorning   = notifMorning;
  if (notifAfternoon !== undefined) settingsData.notifAfternoon = notifAfternoon;
  if (notifEvening   !== undefined) settingsData.notifEvening   = notifEvening;
  if (notifStreak    !== undefined) settingsData.notifStreak    = notifStreak;
  if (morningTime    !== undefined) settingsData.morningTime    = morningTime;
  if (eveningTime    !== undefined) settingsData.eveningTime    = eveningTime;
  if (weeklySchedule !== undefined) settingsData.weeklySchedule = JSON.stringify(weeklySchedule);
  if (githubUsername !== undefined) settingsData.githubUsername = githubUsername;

  const [settings] = await Promise.all([
    db.userSettings.upsert({
      where:  { userId },
      update: settingsData,
      create: { userId, ...settingsData },
    }),
    name !== undefined
      ? db.user.update({ where: { id: userId }, data: { name } })
      : Promise.resolve(),
  ]);

  return NextResponse.json(settings);
}
