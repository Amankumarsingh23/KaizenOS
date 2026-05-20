import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toUserId, amount, message } = await req.json();
  if (!toUserId || !amount || amount < 50 || amount > 500) {
    return NextResponse.json({ error: "amount must be 50–500" }, { status: 400 });
  }
  if (toUserId === userId) return NextResponse.json({ error: "Cannot gift yourself" }, { status: 400 });

  // Check friendship (48h+)
  const friendship = await db.friendship.findFirst({
    where: { userId, friendId: toUserId },
  });
  if (!friendship) return NextResponse.json({ error: "Can only gift friends" }, { status: 403 });
  const friendedAt = new Date(friendship.createdAt);
  if (Date.now() - friendedAt.getTime() < 48 * 3_600_000) {
    return NextResponse.json({ error: "Must be friends for 48h before gifting" }, { status: 403 });
  }

  // Check sender has enough coins
  const sender = await db.user.findUnique({ where: { id: userId }, select: { coins: true } });
  if (!sender || sender.coins < amount) {
    return NextResponse.json({ error: `Not enough coins (you have ${sender?.coins ?? 0})` }, { status: 400 });
  }

  // Weekly sent limit: 2000 coins
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekSent = await db.coinTransaction.aggregate({
    where: { fromUserId: userId, createdAt: { gte: weekStart } },
    _sum: { amount: true },
  });
  if ((weekSent._sum.amount ?? 0) + amount > 2000) {
    return NextResponse.json({ error: "Weekly gift limit reached (2000 coins)" }, { status: 400 });
  }

  // Transfer
  await Promise.all([
    db.user.update({ where: { id: userId },   data: { coins: { decrement: amount } } }),
    db.user.update({ where: { id: toUserId }, data: { coins: { increment: amount } } }),
    db.coinTransaction.create({ data: { fromUserId: userId, toUserId, amount, message: message?.slice(0, 50) ?? null } }),
  ]);

  return NextResponse.json({ ok: true, sent: amount }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction") ?? "received";

  const txns = await db.coinTransaction.findMany({
    where: direction === "sent" ? { fromUserId: userId } : { toUserId: userId },
    include: {
      fromUser: { select: { name: true, image: true } },
      toUser:   { select: { name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(txns);
}
