import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
