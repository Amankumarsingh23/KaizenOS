import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: topicId } = await params;
  const sessions = await db.gDSession.findMany({
    where: { topicId, userId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: topicId } = await params;
  const topic = await db.gDTopic.findUnique({ where: { id: topicId } });
  if (!topic || topic.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { score, durationMin, groupSize, keyArgument, whatWentWell, whatToImprove, initiated, concluded } = await req.json();

  const gdSession = await db.gDSession.create({
    data: {
      topicId,
      userId,
      score:         score         ? Number(score)         : null,
      durationMin:   durationMin   ? Number(durationMin)   : null,
      groupSize:     groupSize     ? Number(groupSize)      : null,
      keyArgument:   keyArgument?.trim()   ?? null,
      whatWentWell:  whatWentWell?.trim()  ?? null,
      whatToImprove: whatToImprove?.trim() ?? null,
      initiated:     Boolean(initiated),
      concluded:     Boolean(concluded),
    },
  });

  // Update GD topic aggregate stats
  await db.gDTopic.update({
    where: { id: topicId },
    data: {
      practiced:      true,
      practiceCount:  { increment: 1 },
      lastPracticedAt: new Date(),
      bestScore: score
        ? topic.bestScore === null
          ? Number(score)
          : Math.max(topic.bestScore, Number(score))
        : topic.bestScore,
    },
  });

  return NextResponse.json(gdSession, { status: 201 });
}
