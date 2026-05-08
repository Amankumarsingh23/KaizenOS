import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import type { Category } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Monday of the week containing `d`. */
function startOfWeek(d: Date) {
  const r = startOfDay(d);
  const dow = r.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  r.setDate(r.getDate() + diff);
  return r;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now       = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd   = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const month       = now.getMonth() + 1;
  const year        = now.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();

  const [weekSessions, targets, journalEntries] = await Promise.all([
    db.studySession.findMany({
      where:   { userId, startTime: { gte: weekStart, lt: weekEnd } },
      orderBy: { startTime: "asc" },
    }),
    db.target.findMany({
      where: { userId, month, year },
    }),
    db.journalEntry.findMany({
      where:   { userId, date: { gte: weekStart, lt: weekEnd } },
      orderBy: { date: "asc" },
    }),
  ]);

  // ── Per-category aggregation ──────────────────────────────────────────────

  const sessionsByCategory: Record<string, { count: number; minutes: number }> = {};
  for (const s of weekSessions) {
    if (!sessionsByCategory[s.category]) {
      sessionsByCategory[s.category] = { count: 0, minutes: 0 };
    }
    sessionsByCategory[s.category].count++;
    sessionsByCategory[s.category].minutes += s.durationMinutes;
  }

  // ── Hit / gap analysis ────────────────────────────────────────────────────
  // Expected weekly share = 7 / daysInMonth of the monthly target

  const weeklyFraction = 7 / daysInMonth;

  const hitCategories: Category[] = [];
  const gapCategories: { category: Category; needed: number; unit: string }[] = [];

  for (const t of targets) {
    const expected = Math.max(1, Math.ceil(t.targetValue * weeklyFraction));
    const actual   = sessionsByCategory[t.category]?.count ?? 0;
    if (actual >= expected) {
      hitCategories.push(t.category as Category);
    } else {
      gapCategories.push({
        category: t.category as Category,
        needed:   expected - actual,
        unit:     t.unit,
      });
    }
  }

  // Sort gaps by how far behind (most behind first)
  gapCategories.sort((a, b) => b.needed - a.needed);

  // ── Mood trend ────────────────────────────────────────────────────────────

  const moodTrend = journalEntries.map((j) => ({
    date:   j.date.toISOString(),
    mood:   j.mood,
    energy: j.energy,
  }));

  const avgMood   = moodTrend.length ? moodTrend.reduce((s, j) => s + j.mood,   0) / moodTrend.length : null;
  const avgEnergy = moodTrend.length ? moodTrend.reduce((s, j) => s + j.energy, 0) / moodTrend.length : null;

  // ── Daily breakdown (for mini bar chart) ─────────────────────────────────

  const dailyMinutes: { day: string; minutes: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dayStr = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i];
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const mins = weekSessions
      .filter((s) => new Date(s.startTime) >= d && new Date(s.startTime) < next)
      .reduce((a, s) => a + s.durationMinutes, 0);
    dailyMinutes.push({ day: dayStr, minutes: mins });
  }

  return NextResponse.json({
    weekRange:          { start: weekStart.toISOString(), end: weekEnd.toISOString() },
    totalSessions:      weekSessions.length,
    totalMinutes:       weekSessions.reduce((a, s) => a + s.durationMinutes, 0),
    sessionsByCategory,
    hitCategories,
    gapCategories,
    moodTrend,
    avgMood,
    avgEnergy,
    dailyMinutes,
  });
}
