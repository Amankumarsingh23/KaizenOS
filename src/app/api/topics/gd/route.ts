import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const topics = await db.gDTopic.findMany({
    where: category ? { category: category as never } : undefined,
    orderBy: [
      { practiced: "asc" },     // unpracticed first
      { practiceCount: "asc" },
      { topic: "asc" },
    ],
  });

  return NextResponse.json(topics);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic, category } = await req.json();
  if (!topic?.trim() || !category) {
    return NextResponse.json({ error: "topic and category are required" }, { status: 400 });
  }

  const created = await db.gDTopic.create({
    data: {
      topic:    topic.trim(),
      category: category as never,
      practiced: false,
      practiceCount: 0,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
