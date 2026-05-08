import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { seedTopicsForUser } from "@/lib/seedTopics";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Seed default topics on first visit
  await seedTopicsForUser(userId);

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const topics = await db.gDTopic.findMany({
    where: { userId, ...(category ? { category: category as never } : {}) },
    orderBy: [
      { practiced: "asc" },
      { practiceCount: "asc" },
      { topic: "asc" },
    ],
  });

  return NextResponse.json(topics);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic, category } = await req.json();
  if (!topic?.trim() || !category) {
    return NextResponse.json({ error: "topic and category are required" }, { status: 400 });
  }

  const created = await db.gDTopic.create({
    data: { userId, topic: topic.trim(), category: category as never, practiced: false, practiceCount: 0 },
  });

  return NextResponse.json(created, { status: 201 });
}
