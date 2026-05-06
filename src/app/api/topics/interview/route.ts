import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const questions = await db.interviewQuestion.findMany({
    where: type ? { type: type as never } : undefined,
    orderBy: [
      { practiced: "asc" },
      { practiceCount: "asc" },
      { question: "asc" },
    ],
  });

  return NextResponse.json(questions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question, type, preparedAnswer } = await req.json();
  if (!question?.trim() || !type) {
    return NextResponse.json({ error: "question and type are required" }, { status: 400 });
  }

  const created = await db.interviewQuestion.create({
    data: {
      question:       question.trim(),
      type:           type as never,
      preparedAnswer: preparedAnswer?.trim() ?? null,
      practiced:      false,
      practiceCount:  0,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
