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

  const question = await db.interviewQuestion.findUnique({ where: { id } });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "practice") {
    const updated = await db.interviewQuestion.update({
      where: { id },
      data: {
        practiced:      true,
        practiceCount:  { increment: 1 },
        lastPracticedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  }

  if (body.action === "updateAnswer") {
    if (typeof body.preparedAnswer !== "string") {
      return NextResponse.json({ error: "preparedAnswer required" }, { status: 400 });
    }
    const updated = await db.interviewQuestion.update({
      where: { id },
      data: { preparedAnswer: body.preparedAnswer.trim() || null },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
