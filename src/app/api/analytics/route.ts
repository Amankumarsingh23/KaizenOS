import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, getHours, getDay } from "date-fns";

const CATEGORIES = [
  "DSA","GD","MOCK_INTERVIEW","PROJECT_WORK",
  "CURRENT_AFFAIRS","JAPANESE","COMMUNICATION","READING",
] as const;

function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const now       = new Date();
  const today     = startOfDay(now);
  const last90    = subDays(today, 90);
  const last30    = subDays(today, 30);
  const wkStart   = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const lastWkStart = subDays(wkStart, 7);
  const monthStart  = startOfMonth(today);

  const [sessions90, reports30, targets] = await Promise.all([
    db.studySession.findMany({
      where: { userId, startTime: { gte: last90 } },
      orderBy: { startTime: "asc" },
    }),
    db.dailyReport.findMany({
      where: { userId, date: { gte: last30 } },
      orderBy: { date: "asc" },
    }),
    db.target.findMany({
      where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
    }),
  ]);

  // ── OVERVIEW ──────────────────────────────────────────────────────────────

  // 1. Score trend (30 days)
  const scoreTrend = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(today, 29 - i);
    const r = reports30.find((rep) => sameDay(new Date(rep.date), d));
    return { date: format(d, "MMM d"), score: r ? r.overallScore : null };
  });
  const validScores = reports30.map((r) => r.overallScore);
  const avgScore = validScores.length
    ? Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length)
    : null;

  // 2. Activity distribution
  const distMap: Record<string, { minutes: number; sessions: number }> = {};
  for (const s of sessions90) {
    if (!distMap[s.category]) distMap[s.category] = { minutes: 0, sessions: 0 };
    distMap[s.category].minutes  += s.durationMinutes;
    distMap[s.category].sessions += 1;
  }
  const activityDistribution = Object.entries(distMap).map(([category, v]) => ({
    category, ...v,
  }));

  // 3. Radar — % of monthly target achieved
  const radarData = CATEGORIES.map((cat) => {
    const t = targets.find((x) => x.category === cat);
    const value = t && t.targetValue > 0
      ? Math.min(100, Math.round((t.currentValue / t.targetValue) * 100))
      : 0;
    return { category: cat, value };
  });

  // 4. Heatmap — session count per day (90 days)
  const heatMap: Record<string, number> = {};
  for (const s of sessions90) {
    const k = format(new Date(s.startTime), "yyyy-MM-dd");
    heatMap[k] = (heatMap[k] ?? 0) + 1;
  }
  const heatmapData = Array.from({ length: 90 }, (_, i) => {
    const d = subDays(today, 89 - i);
    const key = format(d, "yyyy-MM-dd");
    const dow = (getDay(d) + 6) % 7; // 0=Mon…6=Sun
    return { date: key, count: heatMap[key] ?? 0, dow };
  });

  // 5. Category progress
  const categoryProgress = targets.map((t) => ({
    category: t.category, current: t.currentValue,
    target: t.targetValue, unit: t.unit,
  }));

  // ── WEEKLY ────────────────────────────────────────────────────────────────

  function weekBreakdown(from: Date, to: Date) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      if (d > to) return null;
      const daySessions = sessions90.filter((s) => sameDay(new Date(s.startTime), d));
      const row: Record<string, number | string> = { day: format(d, "EEE") };
      for (const cat of CATEGORIES) {
        row[cat] = daySessions
          .filter((s) => s.category === cat)
          .reduce((a, s) => a + s.durationMinutes, 0);
      }
      row.total = daySessions.reduce((a, s) => a + s.durationMinutes, 0);
      return row;
    }).filter(Boolean);
    return days;
  }

  const thisWeek = weekBreakdown(wkStart, now);
  const lastWeek = weekBreakdown(lastWkStart, subDays(wkStart, 1));

  const thisTotal = thisWeek.reduce((a, d) => a + Number(d!.total), 0);
  const lastTotal = lastWeek.reduce((a, d) => a + Number(d!.total), 0);

  const allDaysWithData = [...thisWeek, ...lastWeek].filter(
    (d) => Number(d!.total) > 0
  );
  const bestDay  = allDaysWithData.sort((a, b) => Number(b!.total) - Number(a!.total))[0] ?? null;
  const worstDay = allDaysWithData.sort((a, b) => Number(a!.total) - Number(b!.total))[0] ?? null;

  // ── MONTHLY ───────────────────────────────────────────────────────────────

  const targetsVsActual = targets.map((t) => ({
    category: t.category.replace(/_/g, " "),
    target: t.targetValue,
    actual: t.currentValue,
  }));

  // Running totals for key categories this month
  const monthSessions = sessions90.filter((s) => new Date(s.startTime) >= monthStart);
  const dom = now.getDate();
  const cumulative = Array.from({ length: dom }, (_, i) => {
    const d = new Date(monthStart);
    d.setDate(i + 1);
    const soFar = monthSessions.filter((s) => new Date(s.startTime) <= d);
    return {
      date: format(d, "d"),
      DSA:            soFar.filter((s) => s.category === "DSA").length,
      GD:             soFar.filter((s) => s.category === "GD").length,
      MOCK_INTERVIEW: soFar.filter((s) => s.category === "MOCK_INTERVIEW").length,
    };
  });

  // ── TRENDS ────────────────────────────────────────────────────────────────

  // Weekly rolling avg of session duration & rating (last 12 weeks)
  const durationTrend: { week: string; avgMinutes: number; avgRating: number }[] = [];
  for (let w = 11; w >= 0; w--) {
    const from = subDays(today, w * 7 + 6);
    const to   = subDays(today, w * 7);
    const ws   = sessions90.filter((s) => {
      const d = new Date(s.startTime);
      return d >= from && d <= to;
    });
    if (!ws.length) continue;
    durationTrend.push({
      week: format(to, "MMM d"),
      avgMinutes: Math.round(ws.reduce((a, s) => a + s.durationMinutes, 0) / ws.length),
      avgRating:  Math.round((ws.reduce((a, s) => a + s.selfRating, 0) / ws.length) * 10) / 10,
    });
  }

  // Time-of-day distribution (all 90 days, grouped by hour)
  const hourMap: Record<number, number> = {};
  for (const s of sessions90) {
    const h = getHours(new Date(s.startTime));
    hourMap[h] = (hourMap[h] ?? 0) + 1;
  }
  const timeOfDay = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`,
    count: hourMap[h] ?? 0,
  }));

  return NextResponse.json({
    overview: { scoreTrend, avgScore, activityDistribution, radarData, heatmapData, categoryProgress },
    weekly:   { thisWeek, lastWeek, thisTotal, lastTotal, bestDay, worstDay },
    monthly:  { targetsVsActual, cumulative },
    trends:   { durationTrend, timeOfDay },
  });
}
