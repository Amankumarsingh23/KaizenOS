import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { startOfWeek, subWeeks } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await db.weeklyReport.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
    take: 12,
    select: { id: true, weekStart: true, createdAt: true, stats: true, motNote: true },
  });

  return NextResponse.json(reports.map((r) => {
    const s = JSON.parse(r.stats);
    return {
      id:           r.id,
      weekStart:    r.weekStart,
      createdAt:    r.createdAt,
      totalSessions: s.totalSessions,
      totalMinutes:  s.totalMinutes,
      avgDailyScore: s.avgDailyScore,
      consistency:   s.consistency,
      motNote:       r.motNote,
    };
  }));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  // Allow requesting a specific past week (for testing)
  const weeksAgo  = Number(body.weeksAgo ?? 0);
  const monday    = startOfWeek(subWeeks(new Date(), weeksAgo), { weekStartsOn: 1 });
  monday.setHours(0, 0, 0, 0);

  try {
    const { generateWeeklyReport } = await import("@/lib/ai/generateWeeklyReport");
    const report = await generateWeeklyReport(userId, monday);
    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Report generation failed";
    console.error("[weekly-report]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
