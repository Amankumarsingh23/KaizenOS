import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
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
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings, user] = await Promise.all([
    getOrCreate(userId),
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, image: true } }),
  ]);

  return NextResponse.json({ ...settings, user });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    notifMorning, notifAfternoon, notifEvening, notifStreak,
    morningTime, eveningTime,
    weeklySchedule,
    githubUsername,
    cfHandle,
    lcHandle,
    isPublic,
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
  // Only update string handles if they contain a non-empty value
  // (prevents empty form state on page load from wiping saved values)
  if (githubUsername?.trim()) settingsData.githubUsername = githubUsername.trim();
  if (cfHandle?.trim())       settingsData.cfHandle       = cfHandle.trim();
  if (lcHandle?.trim())       settingsData.lcHandle       = lcHandle.trim();
  if (isPublic       !== undefined) settingsData.isPublic       = Boolean(isPublic);

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
