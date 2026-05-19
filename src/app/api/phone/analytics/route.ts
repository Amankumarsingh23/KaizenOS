import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { format, subDays, startOfDay } from "date-fns";

const normaliseScore = (s: number) => s <= 10 ? s * 10 : s;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since30 = subDays(startOfDay(new Date()), 30);
  const since90 = subDays(startOfDay(new Date()), 90);

  const [logs, reports] = await Promise.all([
    db.phoneUsageLog.findMany({
      where: { userId, date: { gte: since90 } },
      orderBy: { date: "asc" },
    }),
    db.dailyReport.findMany({
      where: { userId, date: { gte: since90 } },
      orderBy: { date: "asc" },
      select: { date: true, overallScore: true },
    }),
  ]);

  if (!logs.length) return NextResponse.json({ empty: true });

  const parse = (s: string) => { try { return JSON.parse(s); } catch { return []; } };

  // ── 30-day trend ──────────────────────────────────────────────────────────
  const trend = logs.filter((l) => new Date(l.date) >= since30).map((l) => ({
    date:        format(new Date(l.date), "MMM d"),
    screenMins:  l.totalMins,
    screenHours: Math.round(l.totalMins / 60 * 10) / 10,
    unlocks:     l.unlockCount,
  }));

  // ── Category averages ─────────────────────────────────────────────────────
  const catMap: Record<string, { totalMins: number; days: number }> = {};
  for (const log of logs) {
    for (const cat of parse(log.categories) as { name: string; mins: number; pct: number }[]) {
      if (!catMap[cat.name]) catMap[cat.name] = { totalMins: 0, days: 0 };
      catMap[cat.name].totalMins += cat.mins;
      catMap[cat.name].days++;
    }
  }
  const categoryAvg = Object.entries(catMap)
    .map(([name, { totalMins, days }]) => ({ name, avgMins: Math.round(totalMins / days) }))
    .sort((a, b) => b.avgMins - a.avgMins);

  // ── App averages ──────────────────────────────────────────────────────────
  const appMap: Record<string, { totalMins: number; totalVisits: number; days: number }> = {};
  for (const log of logs) {
    for (const app of parse(log.topApps) as { name: string; mins: number; visits: number }[]) {
      if (!appMap[app.name]) appMap[app.name] = { totalMins: 0, totalVisits: 0, days: 0 };
      appMap[app.name].totalMins   += app.mins;
      appMap[app.name].totalVisits += app.visits;
      appMap[app.name].days++;
    }
  }
  const appAvg = Object.entries(appMap)
    .map(([name, { totalMins, totalVisits, days }]) => ({
      name,
      avgMins:   Math.round(totalMins   / days),
      avgVisits: Math.round(totalVisits / days),
      totalHours: Math.round(totalMins  / 60 * 10) / 10,
    }))
    .sort((a, b) => b.avgMins - a.avgMins)
    .slice(0, 10);

  // ── Phone vs Study correlation ────────────────────────────────────────────
  const reportMap = new Map(reports.map((r) => [format(new Date(r.date), "yyyy-MM-dd"), r.overallScore]));
  const correlation = logs
    .map((l) => {
      const dateKey = format(new Date(l.date), "yyyy-MM-dd");
      const score   = reportMap.get(dateKey);
      return score != null
        ? { date: format(new Date(l.date), "MMM d"), screenMins: l.totalMins, studyScore: normaliseScore(score) }
        : null;
    })
    .filter(Boolean) as { date: string; screenMins: number; studyScore: number }[];

  // ── Weekly heatmap ────────────────────────────────────────────────────────
  const logDateMap = new Map(logs.map((l) => [format(new Date(l.date), "yyyy-MM-dd"), l.totalMins]));
  const heatmap = Array.from({ length: 90 }, (_, i) => {
    const d   = subDays(new Date(), 89 - i);
    const key = format(d, "yyyy-MM-dd");
    const dow = (d.getDay() + 6) % 7;
    return { date: key, mins: logDateMap.get(key) ?? 0, dow };
  });

  // ── Productivity ratio trend ──────────────────────────────────────────────
  const prodRatio = logs.filter((l) => new Date(l.date) >= since30).map((l) => {
    const cats = parse(l.categories) as { name: string; mins: number }[];
    const prod  = cats.find((c) => /productivity/i.test(c.name))?.mins ?? 0;
    return {
      date:  format(new Date(l.date), "MMM d"),
      pct:   l.totalMins > 0 ? Math.round((prod / l.totalMins) * 100) : 0,
      mins:  prod,
    };
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const recent7 = logs.slice(-7);
  const prev7   = logs.slice(-14, -7);
  const avgRecent = recent7.reduce((s, l) => s + l.totalMins, 0) / (recent7.length || 1);
  const avgPrev   = prev7.reduce((s, l) => s + l.totalMins, 0) / (prev7.length || 1);

  const avgScreenTime   = Math.round(logs.reduce((s, l) => s + l.totalMins, 0) / logs.length);
  const avgUnlocks      = Math.round(logs.reduce((s, l) => s + l.unlockCount, 0) / logs.length);
  const worstDay        = [...logs].sort((a, b) => b.totalMins - a.totalMins)[0];
  const bestDay         = [...logs].sort((a, b) => a.totalMins - b.totalMins)[0];
  const trend7: "improving" | "worsening" | "stable" =
    avgRecent < avgPrev - 20 ? "improving" : avgRecent > avgPrev + 20 ? "worsening" : "stable";

  return NextResponse.json({
    summary: {
      totalDays: logs.length,
      avgScreenTime,
      avgUnlocks,
      trend7,
      worstDay: { date: format(new Date(worstDay.date), "EEE d MMM"), mins: worstDay.totalMins },
      bestDay:  { date: format(new Date(bestDay.date),  "EEE d MMM"), mins: bestDay.totalMins  },
    },
    trend,
    categoryAvg,
    appAvg,
    correlation,
    heatmap,
    prodRatio,
  });
}
