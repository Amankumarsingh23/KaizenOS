import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { ALL_BADGES } from "@/lib/badges";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const earned = await db.earnedBadge.findMany({
    where: { userId },
    select: { badgeId: true, earnedAt: true },
  });
  const earnedMap = new Map(earned.map((b) => [b.badgeId, b.earnedAt]));

  return NextResponse.json(
    ALL_BADGES.map((b) => ({
      ...b,
      earned:   earnedMap.has(b.id),
      earnedAt: earnedMap.get(b.id) ?? null,
    }))
  );
}
