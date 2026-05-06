import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const reports = await db.dailyReport.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
  });

  return NextResponse.json(
    reports.map((r) => ({
      ...r,
      categoryScores: JSON.parse(r.categoryScores),
    }))
  );
}
