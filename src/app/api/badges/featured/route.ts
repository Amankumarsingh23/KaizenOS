import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

/** GET — returns the user's current featured badge IDs */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.userSettings.findUnique({ where: { userId }, select: { featuredBadges: true } });
  const featured: string[] = JSON.parse(settings?.featuredBadges ?? "[]");
  return NextResponse.json(featured);
}

/** PATCH — toggle a badge as featured (max 3). Send { badgeId }. */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { badgeId } = await req.json();
  if (!badgeId) return NextResponse.json({ error: "badgeId required" }, { status: 400 });

  // Must be earned
  const earned = await db.earnedBadge.findUnique({ where: { userId_badgeId: { userId, badgeId } } });
  if (!earned) return NextResponse.json({ error: "Badge not earned" }, { status: 403 });

  const settings = await db.userSettings.upsert({
    where: { userId }, update: {}, create: { userId },
    select: { featuredBadges: true },
  });
  let featured: string[] = JSON.parse(settings.featuredBadges ?? "[]");

  if (featured.includes(badgeId)) {
    featured = featured.filter((id) => id !== badgeId); // unpin
  } else {
    if (featured.length >= 3) featured.shift(); // drop oldest to make room
    featured.push(badgeId); // pin
  }

  await db.userSettings.update({
    where: { userId },
    data: { featuredBadges: JSON.stringify(featured) },
  });

  return NextResponse.json(featured);
}
