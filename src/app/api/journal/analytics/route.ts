import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { format, startOfDay, subDays, startOfWeek } from "date-fns";

function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const today   = startOfDay(new Date());
  const last30  = subDays(today, 30);
  const wkStart = startOfWeek(today, { weekStartsOn: 1 });
  const lastWk  = subDays(wkStart, 7);

  const [entries, reports] = await Promise.all([
    db.journalEntry.findMany({
      where:   { userId, date: { gte: last30 } },
      orderBy: { date: "asc" },
      select:  { date: true, mood: true, energy: true },
    }),
    db.dailyReport.findMany({
      where:   { userId, date: { gte: last30 } },
      select:  { date: true, overallScore: true },
    }),
  ]);

  // ── Mood trend (30-day array, null for days with no entry) ────────────────

  const moodTrend = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(today, 29 - i);
    const e = entries.find((x) => sameDay(new Date(x.date), d));
    return {
      date:   format(d, "MMM d"),
      mood:   e?.mood   ?? null,
      energy: e?.energy ?? null,
    };
  });

  // ── Weekly averages ───────────────────────────────────────────────────────

  const thisWkEntries  = entries.filter((e) => new Date(e.date) >= wkStart);
  const lastWkEntries  = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= lastWk && d < wkStart;
  });

  const avg = (arr: { mood: number }[]) =>
    arr.length ? Math.round((arr.reduce((s, e) => s + e.mood, 0) / arr.length) * 10) / 10 : null;

  const thisWkAvg = avg(thisWkEntries);
  const lastWkAvg = avg(lastWkEntries);
  const moodDelta = thisWkAvg !== null && lastWkAvg !== null
    ? Math.round((thisWkAvg - lastWkAvg) * 10) / 10 : null;

  // ── Mood / score correlation ───────────────────────────────────────────────

  const goodDates = new Set(
    entries.filter((e) => e.mood >= 4).map((e) => format(new Date(e.date), "yyyy-MM-dd"))
  );
  const goodScores = reports
    .filter((r) => goodDates.has(format(new Date(r.date), "yyyy-MM-dd")))
    .map((r) => r.overallScore);
  const badScores  = reports
    .filter((r) => !goodDates.has(format(new Date(r.date), "yyyy-MM-dd")))
    .map((r) => r.overallScore);

  const avgScore = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null;

  const avgGood = avgScore(goodScores);
  const avgBad  = avgScore(badScores);
  const correlation =
    avgGood !== null && avgBad !== null && avgBad > 0
      ? Math.round(((avgGood - avgBad) / avgBad) * 100) : null;

  // ── Most common mood ──────────────────────────────────────────────────────

  const moodCounts = [1, 2, 3, 4, 5].map((m) => ({
    mood: m,
    count: entries.filter((e) => e.mood === m).length,
  }));
  const dominantMood = [...moodCounts].sort((a, b) => b.count - a.count)[0];

  return NextResponse.json({
    moodTrend,
    thisWkAvg,
    lastWkAvg,
    moodDelta,
    correlation,
    dominantMood: dominantMood?.count > 0 ? dominantMood.mood : null,
    totalEntries: entries.length,
  });
}
