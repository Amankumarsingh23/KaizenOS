import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { format, subDays, startOfDay } from "date-fns";

function weekKey(d: Date) {
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return format(mon, "MMM d");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since90 = subDays(startOfDay(new Date()), 90);

  const [gdSessions, attempts, gdTopics, questions] = await Promise.all([
    db.gDSession.findMany({
      where: { userId, date: { gte: since90 } },
      include: { topic: { select: { category: true, topic: true } } },
      orderBy: { date: "asc" },
    }),
    db.questionAttempt.findMany({
      where: { userId, date: { gte: since90 } },
      include: { question: { select: { type: true, question: true } } },
      orderBy: { date: "asc" },
    }),
    db.gDTopic.findMany({
      where: { userId, practiced: true },
      include: { sessions: { where: { userId } } },
    }),
    db.interviewQuestion.findMany({
      where: { userId, practiced: true },
      include: { attempts: { where: { userId } } },
    }),
  ]);

  // ── GD: weekly score trend ─────────────────────────────────────────────────
  const gdWeekMap: Record<string, { total: number; count: number }> = {};
  for (const s of gdSessions) {
    if (!s.score) continue;
    const k = weekKey(new Date(s.date));
    if (!gdWeekMap[k]) gdWeekMap[k] = { total: 0, count: 0 };
    gdWeekMap[k].total += s.score;
    gdWeekMap[k].count++;
  }
  const gdScoreTrend = Object.entries(gdWeekMap).map(([week, { total, count }]) => ({
    week,
    avgScore: Math.round((total / count) * 10) / 10,
    sessions: count,
  }));

  // ── GD: category performance ───────────────────────────────────────────────
  const catMap: Record<string, { total: number; count: number; sessions: number }> = {};
  for (const s of gdSessions) {
    const cat = s.topic.category;
    if (!catMap[cat]) catMap[cat] = { total: 0, count: 0, sessions: 0 };
    catMap[cat].sessions++;
    if (s.score) { catMap[cat].total += s.score; catMap[cat].count++; }
  }
  const gdCategoryPerf = Object.entries(catMap).map(([category, { total, count, sessions }]) => ({
    category: category.replace(/_/g, " "),
    avgScore: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    sessions,
  })).sort((a, b) => b.sessions - a.sessions);

  // ── GD: initiation & conclusion rates ────────────────────────────────────
  const gdTotal = gdSessions.length;
  const initiated = gdSessions.filter((s) => s.initiated).length;
  const concluded = gdSessions.filter((s) => s.concluded).length;
  const avgGroupSize = gdSessions.filter((s) => s.groupSize).length > 0
    ? Math.round(gdSessions.reduce((sum, s) => sum + (s.groupSize ?? 0), 0) /
        gdSessions.filter((s) => s.groupSize).length * 10) / 10
    : null;

  // ── Interview: weekly rating trend by type ────────────────────────────────
  const iqWeekMap: Record<string, Record<string, { total: number; count: number }>> = {};
  for (const a of attempts) {
    const k = weekKey(new Date(a.date));
    const t = a.question.type;
    if (!iqWeekMap[k]) iqWeekMap[k] = {};
    if (!iqWeekMap[k][t]) iqWeekMap[k][t] = { total: 0, count: 0 };
    iqWeekMap[k][t].total += a.rating;
    iqWeekMap[k][t].count++;
  }
  const iqRatingTrend = Object.entries(iqWeekMap).map(([week, types]) => {
    const row: Record<string, number | string> = { week };
    for (const [type, { total, count }] of Object.entries(types)) {
      row[type] = Math.round((total / count) * 10) / 10;
    }
    return row;
  });

  // ── Interview: type performance ───────────────────────────────────────────
  const typeMap: Record<string, { total: number; count: number; attempts: number }> = {};
  for (const a of attempts) {
    const t = a.question.type;
    if (!typeMap[t]) typeMap[t] = { total: 0, count: 0, attempts: 0 };
    typeMap[t].total += a.rating;
    typeMap[t].count++;
    typeMap[t].attempts++;
  }
  const iqTypePerf = Object.entries(typeMap).map(([type, { total, count, attempts }]) => ({
    type,
    avgRating: Math.round((total / count) * 10) / 10,
    attempts,
  }));

  // ── Most improved questions (first attempt vs latest) ─────────────────────
  const improved = questions
    .filter((q) => q.attempts.length >= 2)
    .map((q) => {
      const sorted = [...q.attempts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const first = sorted[0].rating;
      const last  = sorted[sorted.length - 1].rating;
      return { question: q.question.slice(0, 60), type: q.type, first, last, delta: last - first };
    })
    .filter((q) => q.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);

  // ── Summary ───────────────────────────────────────────────────────────────
  const gdPracticedTopics = gdTopics.filter((t) => t.sessions.length > 0).length;
  const iqPracticedQs     = questions.filter((q) => q.attempts.length > 0).length;

  return NextResponse.json({
    gd: {
      totalSessions: gdTotal,
      practicedTopics: gdPracticedTopics,
      initiationRate: gdTotal > 0 ? Math.round((initiated / gdTotal) * 100) : 0,
      conclusionRate: gdTotal > 0 ? Math.round((concluded / gdTotal) * 100) : 0,
      avgGroupSize,
      scoreTrend: gdScoreTrend,
      categoryPerf: gdCategoryPerf,
    },
    interview: {
      totalAttempts: attempts.length,
      practicedQuestions: iqPracticedQs,
      ratingTrend: iqRatingTrend,
      typePerf: iqTypePerf,
      mostImproved: improved,
    },
  });
}
