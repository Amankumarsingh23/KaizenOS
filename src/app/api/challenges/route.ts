import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { startOfWeek, format } from "date-fns";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengedId } = await req.json();
  if (!challengedId || challengedId === userId) {
    return NextResponse.json({ error: "Invalid challenged user" }, { status: 400 });
  }

  // Must be friends
  const friendship = await db.friendship.findFirst({ where: { userId, friendId: challengedId } }).catch(() => null);
  if (!friendship) return NextResponse.json({ error: "Must be friends to challenge" }, { status: 403 });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const challenge = await db.challenge.upsert({
    where: { challengerId_challengedId_weekStart: { challengerId: userId, challengedId, weekStart } },
    update: { status: "PENDING" },
    create: { challengerId: userId, challengedId, weekStart, status: "PENDING" },
    include: {
      challenger: { select: { name: true } },
      challenged: { select: { name: true } },
    },
  });

  return NextResponse.json(challenge, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenges = await db.challenge.findMany({
    where: {
      OR: [{ challengerId: userId }, { challengedId: userId }],
      status: { in: ["PENDING", "ACTIVE"] },
    },
    include: {
      challenger: { select: { id: true, name: true, image: true } },
      challenged: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);

  if (!challenges.length) return NextResponse.json([]);

  // Enrich with weekly XP for both parties
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const enriched = await Promise.all(challenges.map(async (c) => {
    const [cxp, dxp] = await Promise.all([
      db.weeklyXp.findUnique({ where: { userId_weekStart: { userId: c.challengerId, weekStart } }, select: { xp: true } }).catch(() => null),
      db.weeklyXp.findUnique({ where: { userId_weekStart: { userId: c.challengedId, weekStart } }, select: { xp: true } }).catch(() => null),
    ]);
    return {
      ...c,
      challengerXp: cxp?.xp ?? 0,
      challengedXp: dxp?.xp ?? 0,
      isChallenger: c.challengerId === userId,
    };
  }));

  return NextResponse.json(enriched);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId, action } = await req.json(); // action: "accept" | "decline"
  const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.challengedId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.challenge.update({
    where: { id: challengeId },
    data: { status: action === "accept" ? "ACTIVE" : "DECLINED" },
  });

  return NextResponse.json(updated);
}
