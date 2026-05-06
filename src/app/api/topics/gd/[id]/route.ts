import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const topic = await db.gDTopic.findUnique({ where: { id } });
  if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "practice") {
    const score = body.score ? Number(body.score) : null;
    const updated = await db.gDTopic.update({
      where: { id },
      data: {
        practiced:      true,
        practiceCount:  { increment: 1 },
        lastPracticedAt: new Date(),
        bestScore:
          score !== null
            ? topic.bestScore === null
              ? score
              : Math.max(topic.bestScore, score)
            : topic.bestScore,
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
