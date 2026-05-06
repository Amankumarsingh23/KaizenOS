import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { date } = await params;

  // Parse YYYY-MM-DD
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  parsed.setHours(0, 0, 0, 0);
  const next = new Date(parsed);
  next.setDate(next.getDate() + 1);

  const report = await db.dailyReport.findFirst({
    where: { userId, date: { gte: parsed, lt: next } },
  });

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...report,
    categoryScores: JSON.parse(report.categoryScores),
  });
}
