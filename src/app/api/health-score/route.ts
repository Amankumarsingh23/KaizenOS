import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { subDays, startOfDay } from "date-fns";

function clamp(v: number) { return Math.min(100, Math.max(0, Math.round(v))); }

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today   = startOfDay(new Date());
  const since30 = subDays(today, 30);
  const since7  = subDays(today, 7);

  const [sessions30, streaks, targets, milestones, projects, gdSessions, attempts, reports30] = await Promise.all([
    db.studySession.findMany({ where: { userId, startTime: { gte: since30 } }, select: { category: true, durationMinutes: true, selfRating: true } }),
    db.streak.findMany({ where: { userId } }),
    db.target.findMany({ where: { userId, month: today.getMonth() + 1, year: today.getFullYear() } }),
    db.milestone.findMany({ where: { userId }, select: { status: true } }),
    db.project.findMany({ where: { userId }, select: { id: true } }),
    db.gDSession.findMany({ where: { userId, date: { gte: since30 } }, select: { score: true } }),
    db.questionAttempt.findMany({ where: { userId }, select: { rating: true } }),
    db.dailyReport.findMany({ where: { userId, date: { gte: since30 } }, select: { overallScore: true } }),
  ]);

  // ── 1. DSA Readiness ──────────────────────────────────────────────────────
  const dsaSessions = sessions30.filter((s) => s.category === "DSA");
  const dsaStreak   = streaks.find((s) => s.category === "DSA");
  const dsaTarget   = targets.find((t) => t.category === "DSA");
  const dsaScore = clamp(
    Math.min(40, dsaSessions.length * 2)                                           // sessions (max 40)
    + Math.min(25, (dsaStreak?.currentStreak ?? 0) * 1.5)                        // streak (max 25)
    + (dsaTarget && dsaTarget.targetValue > 0 ? Math.min(35, (dsaTarget.currentValue / dsaTarget.targetValue) * 35) : 0)  // target (max 35)
  );

  // ── 2. Communication ──────────────────────────────────────────────────────
  const gdCount   = sessions30.filter((s) => s.category === "GD").length;
  const commCount = sessions30.filter((s) => s.category === "COMMUNICATION").length;
  const gdBest    = gdSessions.filter((s) => s.score).reduce((m, s) => Math.max(m, s.score!), 0);
  const commScore = clamp(
    Math.min(40, gdCount * 4)
    + Math.min(25, commCount * 3)
    + Math.min(35, (gdBest / 10) * 35)
  );

  // ── 3. HR Confidence ─────────────────────────────────────────────────────
  const mockCount  = sessions30.filter((s) => s.category === "MOCK_INTERVIEW").length;
  const avgRating  = attempts.length > 0 ? attempts.reduce((s, a) => s + a.rating, 0) / attempts.length : 0;
  const hrScore    = clamp(
    Math.min(30, attempts.length * 1.5)
    + Math.min(40, (avgRating / 5) * 40)
    + Math.min(30, mockCount * 4)
  );

  // ── 4. Project Depth ─────────────────────────────────────────────────────
  const projectSessions = sessions30.filter((s) => s.category === "PROJECT_WORK").length;
  const totalMilestones = milestones.length;
  const doneMilestones  = milestones.filter((m) => m.status === "COMPLETED").length;
  const projectScore    = clamp(
    Math.min(20, projects.length * 7)
    + (totalMilestones > 0 ? Math.min(50, (doneMilestones / totalMilestones) * 50) : 0)
    + Math.min(30, projectSessions * 2)
  );

  // ── 5. Consistency ────────────────────────────────────────────────────────
  const activeStreaks  = streaks.filter((s) => s.currentStreak > 0).length;
  const daysStudied30  = new Set(sessions30.map((s) => s.category + new Date().toDateString())).size; // approx
  const avgDailyScore  = reports30.length > 0 ? reports30.reduce((s, r) => s + r.overallScore, 0) / reports30.length : 0;
  const consistScore   = clamp(
    Math.min(30, activeStreaks * 3.75)
    + Math.min(40, (sessions30.length / 30) * 40)
    + Math.min(30, (avgDailyScore / 10) * 30)
  );

  // ── 6. Knowledge Breadth ────────────────────────────────────────────────
  const categoriesPracticed = new Set(sessions30.map((s) => s.category)).size;
  const breadthBonus = sessions30.filter((s) =>
    ["CURRENT_AFFAIRS","READING","JAPANESE"].includes(s.category)
  ).length;
  const breadthScore = clamp(
    Math.min(60, categoriesPracticed * 8.5)
    + Math.min(40, breadthBonus * 3)
  );

  // ── Overall ──────────────────────────────────────────────────────────────
  const weights = [
    { dim: "DSA",           score: dsaScore,    weight: 0.30, desc: "Problem solving + streak" },
    { dim: "Communication", score: commScore,   weight: 0.20, desc: "GD sessions + confidence" },
    { dim: "HR Confidence", score: hrScore,     weight: 0.20, desc: "Mock interviews + practice" },
    { dim: "Projects",      score: projectScore,weight: 0.15, desc: "Milestone completion" },
    { dim: "Consistency",   score: consistScore,weight: 0.10, desc: "Daily habits + streaks" },
    { dim: "Breadth",       score: breadthScore,weight: 0.05, desc: "Category variety" },
  ];
  const overall = clamp(weights.reduce((sum, w) => sum + w.score * w.weight, 0));
  const weakest = weights.slice().sort((a, b) => a.score - b.score)[0];

  return NextResponse.json({
    overall,
    dimensions: weights.map((w) => ({ dim: w.dim, score: w.score, desc: w.desc })),
    weakestArea: weakest.dim,
    insight: `Your ${weakest.dim} score (${weakest.score}%) is your biggest placement risk — focus here first.`,
    meta: { sessions30: sessions30.length, activeStreaks, avgDailyScore: Math.round(avgDailyScore * 10) / 10 },
  });
}
