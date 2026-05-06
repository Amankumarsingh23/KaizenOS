/**
 * Notification trigger endpoint — called by cron jobs:
 *
 * Morning (8 AM):   GET /api/notifications/trigger?type=morning
 * Afternoon (4 PM): GET /api/notifications/trigger?type=afternoon
 * Evening (9 PM):   GET /api/notifications/trigger?type=evening
 * Streak (8 PM):    GET /api/notifications/trigger?type=streak
 *
 * Secure with CRON_SECRET env var for production.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPush } from "@/lib/webpush";
import { startOfDay } from "date-fns";

async function getAllSubscriptions() {
  return db.pushSubscription.findMany({ include: { user: { select: { id: true } } } });
}

async function getUserSubscriptions(userId: string) {
  return db.pushSubscription.findMany({ where: { userId } });
}

export async function GET(req: NextRequest) {
  // Simple CRON auth
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "morning";
  const today = startOfDay(new Date());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  let sent = 0;

  // ── Morning brief ────────────────────────────────────────────────────────────
  if (type === "morning") {
    const subs = await getAllSubscriptions();
    for (const sub of subs) {
      const streaks = await db.streak.findMany({
        where: { userId: sub.userId, currentStreak: { gt: 0 } },
        orderBy: { currentStreak: "desc" },
        take: 3,
      });
      const top = streaks[0];
      const body = top
        ? `${top.currentStreak}-day ${top.category.replace(/_/g," ")} streak active. Keep it alive today! 🔥`
        : "Start your day with a focused session. You've got this!";

      const r = await sendPush(sub, { title: "Good morning ☀️", body, tag: "morning-brief", url: "/" });
      if (r.ok) sent++;
    }
  }

  // ── Afternoon nudge (4 PM — if no sessions today) ─────────────────────────
  if (type === "afternoon") {
    const subs = await getAllSubscriptions();
    for (const sub of subs) {
      const todaySessions = await db.studySession.count({
        where: { userId: sub.userId, startTime: { gte: today, lt: tomorrow } },
      });
      if (todaySessions > 0) continue; // already studied — skip

      const streaks = await db.streak.findMany({
        where: { userId: sub.userId, currentStreak: { gt: 2 } },
        orderBy: { currentStreak: "desc" },
        take: 1,
      });
      const atRisk = streaks[0];
      const body = atRisk
        ? `It's 4 PM and your ${atRisk.currentStreak}-day streak is at risk. 30 minutes now will protect it!`
        : "It's 4 PM and no sessions yet today. A focused hour now can change the trajectory.";

      const r = await sendPush(sub, { title: "Afternoon check-in ⏰", body, tag: "afternoon-nudge", url: "/timer" });
      if (r.ok) sent++;
    }
  }

  // ── Evening report prompt (9 PM) ─────────────────────────────────────────
  if (type === "evening") {
    const subs = await getAllSubscriptions();
    for (const sub of subs) {
      const todayMinutes = await db.studySession.aggregate({
        where: { userId: sub.userId, startTime: { gte: today, lt: tomorrow } },
        _sum: { durationMinutes: true },
      });
      const minutes = todayMinutes._sum.durationMinutes ?? 0;
      const hasReport = await db.dailyReport.findFirst({
        where: { userId: sub.userId, date: { gte: today, lt: tomorrow } },
        select: { id: true },
      });

      if (minutes === 0) continue; // no study at all — skip
      if (hasReport) continue;     // report already generated

      const body = `You studied ${minutes} minutes today. Generate your AI daily report to track your progress!`;
      const r = await sendPush(sub, { title: "Evening reflection 🌙", body, tag: "evening-report", url: "/reports" });
      if (r.ok) sent++;
    }
  }

  // ── Streak warning (8 PM — for streaks active but not yet done today) ──────
  if (type === "streak") {
    const subs = await getAllSubscriptions();
    for (const sub of subs) {
      const atRiskStreaks = await db.streak.findMany({
        where: {
          userId:        sub.userId,
          currentStreak: { gt: 0 },
          lastActivityDate: { lt: today }, // not done today
        },
        orderBy: { currentStreak: "desc" },
        take: 2,
      });

      if (!atRiskStreaks.length) continue;

      const names = atRiskStreaks
        .map((s) => `${s.category.replace(/_/g," ")} (${s.currentStreak}d)`)
        .join(" & ");
      const body = `Your ${names} streak${atRiskStreaks.length > 1 ? "s are" : " is"} about to break — log a session before midnight!`;

      const r = await sendPush(sub, { title: "🔥 Streak warning", body, tag: "streak-warning", url: "/streaks" });
      if (r.ok) sent++;
    }
  }

  return NextResponse.json({ ok: true, type, sent });
}
