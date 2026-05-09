import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

// Friend code = first 8 chars of userId (case-insensitive prefix search)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const myCode = userId.slice(0, 8).toUpperCase();

  const friendships = await db.friendship.findMany({
    where: { userId },
    include: { friend: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({
    myCode,
    friends: friendships.map((f) => ({
      id:    f.friend.id,
      name:  f.friend.name ?? "Anonymous",
      image: f.friend.image,
      code:  f.friend.id.slice(0, 8).toUpperCase(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code?.trim() || code.trim().length < 6) {
    return NextResponse.json({ error: "Enter at least 6 characters of the friend code" }, { status: 400 });
  }

  const prefix = code.trim().toLowerCase();

  // Find user whose ID starts with this code
  const friend = await db.user.findFirst({
    where: { id: { startsWith: prefix } },
    select: { id: true, name: true, image: true },
  });

  if (!friend) return NextResponse.json({ error: "No user found with that code" }, { status: 404 });
  if (friend.id === userId) return NextResponse.json({ error: "That's your own code!" }, { status: 400 });

  // Check if already friends
  const existing = await db.friendship.findUnique({
    where: { userId_friendId: { userId, friendId: friend.id } },
  });
  if (existing) return NextResponse.json({ error: "Already added" }, { status: 409 });

  await db.friendship.create({ data: { userId, friendId: friend.id } });

  return NextResponse.json({
    id:    friend.id,
    name:  friend.name ?? "Anonymous",
    image: friend.image,
    code:  friend.id.slice(0, 8).toUpperCase(),
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friendId } = await req.json();
  await db.friendship.deleteMany({ where: { userId, friendId } });
  return NextResponse.json({ ok: true });
}
