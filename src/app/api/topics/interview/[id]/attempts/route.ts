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

  const { id: questionId } = await params;
  const attempts = await db.questionAttempt.findMany({
    where: { questionId, userId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(attempts);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: questionId } = await params;
  const question = await db.interviewQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rating, notes, whatWentWell, whatToImprove } = await req.json();
  if (!rating || !notes?.trim()) {
    return NextResponse.json({ error: "rating and notes required" }, { status: 400 });
  }

  const attempt = await db.questionAttempt.create({
    data: {
      questionId,
      userId,
      rating:        Number(rating),
      notes:         notes.trim(),
      whatWentWell:  whatWentWell?.trim()  ?? null,
      whatToImprove: whatToImprove?.trim() ?? null,
    },
  });

  // Update question aggregate stats
  await db.interviewQuestion.update({
    where: { id: questionId },
    data: {
      practiced:      true,
      practiceCount:  { increment: 1 },
      lastPracticedAt: new Date(),
    },
  });

  return NextResponse.json(attempt, { status: 201 });
}
