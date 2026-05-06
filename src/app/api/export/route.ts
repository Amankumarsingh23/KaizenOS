import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const [
    user, studySessions, dailyReports, streaks, targets,
    milestones, journalEntries, gdTopics, interviewQuestions,
  ] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, createdAt: true } }),
    db.studySession.findMany({ where: { userId }, orderBy: { startTime: "desc" } }),
    db.dailyReport.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    db.streak.findMany({ where: { userId } }),
    db.target.findMany({ where: { userId } }),
    db.milestone.findMany({ where: { userId } }),
    db.journalEntry.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    db.gDTopic.findMany({ orderBy: { category: "asc" } }),
    db.interviewQuestion.findMany({ orderBy: { type: "asc" } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    version:    "1.0",
    user,
    studySessions,
    dailyReports: dailyReports.map((r) => ({
      ...r,
      categoryScores: JSON.parse(r.categoryScores),
    })),
    streaks,
    targets,
    milestones,
    journalEntries,
    gdTopics,
    interviewQuestions,
  };

  const filename = `kaizenos-export-${format(new Date(), "yyyy-MM-dd")}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
