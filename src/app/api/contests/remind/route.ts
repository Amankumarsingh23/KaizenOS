/**
 * POST  — set / toggle a reminder for a contest
 * DELETE — remove a reminder
 * GET   — cron endpoint (called daily at 8AM UTC ≈ 1:30PM IST)
 *          fires push notifications for contests starting today
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { sendPush } from "@/lib/webpush";

// ── Set reminder ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contestId, contestName, startTimeMs } = await req.json();
  if (!contestId || !contestName || !startTimeMs) {
    return NextResponse.json({ error: "contestId, contestName, startTimeMs required" }, { status: 400 });
  }

  const startTime = new Date(startTimeMs);
  const remindAt  = new Date(startTimeMs - 60 * 60 * 1000); // 1 hour before

  const reminder = await db.contestReminder.upsert({
    where:  { userId_contestId: { userId, contestId: Number(contestId) } },
    update: { contestName, startTime, remindAt, notified: false },
    create: { userId, contestId: Number(contestId), contestName, startTime, remindAt },
  });

  return NextResponse.json(reminder, { status: 201 });
}

// ── Remove reminder ───────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contestId } = await req.json();
  await db.contestReminder.deleteMany({
    where: { userId, contestId: Number(contestId) },
  });

  return NextResponse.json({ ok: true });
}

// ── Cron: fire push notifications ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now     = new Date();
  const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find all unnotified reminders where remindAt is within the next 24h
  const due = await db.contestReminder.findMany({
    where: { notified: false, remindAt: { lte: inOneDay } },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  let sent = 0;
  for (const reminder of due) {
    const subs = reminder.user.pushSubscriptions;
    if (!subs.length) continue;

    const hoursUntil = Math.round((reminder.startTime.getTime() - now.getTime()) / 3_600_000);
    const timeStr    = hoursUntil > 0 ? `in ${hoursUntil}h` : "soon";

    for (const sub of subs) {
      await sendPush(sub, {
        title: `🏆 CF Contest ${timeStr}`,
        body:  reminder.contestName,
        url:   `https://codeforces.com/contest/${reminder.contestId}`,
        tag:   `cf-${reminder.contestId}`,
      }).catch(() => {});
    }

    await db.contestReminder.update({
      where: { id: reminder.id },
      data:  { notified: true },
    });
    sent++;
  }

  return NextResponse.json({ processed: due.length, notified: sent });
}
