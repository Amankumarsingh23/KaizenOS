/**
 * Weekly report cron — runs every Sunday at 2 PM UTC (7:30 PM IST)
 * Generates weekly reports for all users who have at least 1 session this week.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });
  }

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  monday.setHours(0, 0, 0, 0);

  // Find users who studied this week
  const activeUsers = await db.studySession.findMany({
    where: { startTime: { gte: monday } },
    select: { userId: true },
    distinct: ["userId"],
  });

  const { generateWeeklyReport } = await import("@/lib/ai/generateWeeklyReport");

  let generated = 0;
  let errors    = 0;

  for (const { userId } of activeUsers) {
    try {
      await generateWeeklyReport(userId, monday);
      generated++;
    } catch (err) {
      console.error(`[weekly-cron] failed for ${userId}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ users: activeUsers.length, generated, errors });
}
