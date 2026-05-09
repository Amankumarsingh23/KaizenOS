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

  const { id } = await params;
  const report = await db.weeklyReport.findUnique({ where: { id } });

  if (!report || report.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id:        report.id,
    weekStart: report.weekStart,
    createdAt: report.createdAt,
    stats:     JSON.parse(report.stats),
    aiSummary: report.aiSummary,
    strengths: JSON.parse(report.strengths),
    gaps:      JSON.parse(report.gaps),
    nextWeek:  JSON.parse(report.nextWeek),
    motNote:   report.motNote,
  });
}
