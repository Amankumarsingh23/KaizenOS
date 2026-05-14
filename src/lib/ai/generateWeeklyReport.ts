import { groq } from "@/lib/ai";
import { db }   from "@/lib/db";
import { format, startOfWeek, subDays, differenceInDays } from "date-fns";

const MODEL = "llama-3.3-70b-versatile";

/** Cleans LLM output so JSON.parse can handle it reliably */
function cleanJson(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/im, "")   // strip opening fence
    .replace(/```\s*$/im, "")            // strip closing fence
    .trim()
    .replace(/\n/g, "\\n")              // escape raw newlines inside strings
    .replace(/\r/g, "\\r")              // escape carriage returns
    .replace(/\t/g, "\\t");             // escape tabs
}

const CATS = ["DSA","GD","MOCK_INTERVIEW","PROJECT_WORK","CURRENT_AFFAIRS","JAPANESE","COMMUNICATION","READING"] as const;

export interface WeeklyStats {
  userName:        string;
  weekLabel:       string;   // "May 5 – May 11, 2026"
  totalSessions:   number;
  totalMinutes:    number;
  activeDays:      number;
  avgDailyScore:   number | null;
  vsLastWeek:      { sessions: number; minutes: number; scoreDelta: number | null };
  categories:      { cat: string; sessions: number; minutes: number; target: number | null; current: number | null }[];
  streaks:         { cat: string; current: number; best: number; status: "alive" | "broken" | "new" }[];
  gd:              { sessions: number; avgScore: number | null; initiated: number; concluded: number };
  interview:       { attempts: number; avgRating: number | null; topType: string | null };
  journal:         { entries: number; avgMood: number | null; avgEnergy: number | null };
  topDailyScore:   number | null;
  consistency:     number; // % days in week with at least 1 session
}

async function gatherWeekStats(userId: string, weekStart: Date): Promise<WeeklyStats> {
  const weekEnd     = new Date(weekStart.getTime() + 7 * 86_400_000);
  const lastWeekStart = subDays(weekStart, 7);

  const [
    user, sessions, lastWeekSessions, streaks, targets, dailyReports,
    gdSessions, attempts, journal,
  ] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
    db.studySession.findMany({
      where: { userId, startTime: { gte: weekStart, lt: weekEnd } },
      select: { category: true, durationMinutes: true, startTime: true, selfRating: true },
    }),
    db.studySession.findMany({
      where: { userId, startTime: { gte: lastWeekStart, lt: weekStart } },
      select: { category: true, durationMinutes: true },
    }),
    db.streak.findMany({ where: { userId } }),
    db.target.findMany({ where: { userId, month: weekStart.getMonth() + 1, year: weekStart.getFullYear() } }),
    db.dailyReport.findMany({
      where: { userId, date: { gte: weekStart, lt: weekEnd } },
      select: { overallScore: true },
    }),
    db.gDSession.findMany({
      where: { userId, date: { gte: weekStart, lt: weekEnd } },
      select: { score: true, initiated: true, concluded: true },
    }),
    db.questionAttempt.findMany({
      where: { userId, date: { gte: weekStart, lt: weekEnd } },
      include: { question: { select: { type: true } } },
    }),
    db.journalEntry.findMany({
      where: { userId, date: { gte: weekStart, lt: weekEnd } },
      select: { mood: true, energy: true },
    }),
  ]);

  const totalMin = sessions.reduce((s, x) => s + x.durationMinutes, 0);
  const lastMin  = lastWeekSessions.reduce((s, x) => s + x.durationMinutes, 0);
  const activeDays = new Set(sessions.map((s) => format(new Date(s.startTime), "yyyy-MM-dd"))).size;
  const avgScore   = dailyReports.length
    ? Math.round(dailyReports.reduce((s, r) => s + r.overallScore, 0) / dailyReports.length * 10) / 10
    : null;

  const categories = CATS.map((cat) => {
    const cs = sessions.filter((s) => s.category === cat);
    const t  = targets.find((x) => x.category === cat);
    return {
      cat,
      sessions: cs.length,
      minutes:  cs.reduce((sum, s) => sum + s.durationMinutes, 0),
      target:   t?.targetValue  ?? null,
      current:  t?.currentValue ?? null,
    };
  }).filter((c) => c.sessions > 0 || c.target);

  const streakData = CATS.map((cat) => {
    const s = streaks.find((x) => x.category === cat);
    if (!s) return null;
    const daysSinceActivity = s.lastActivityDate
      ? differenceInDays(new Date(), new Date(s.lastActivityDate)) : 999;
    return {
      cat,
      current: s.currentStreak,
      best:    s.bestStreak,
      status:  (daysSinceActivity === 0 ? "alive" : daysSinceActivity > 1 ? "broken" : "alive") as "alive" | "broken" | "new",
    };
  }).filter(Boolean) as WeeklyStats["streaks"];

  const gdAvgScore = gdSessions.filter((s) => s.score).length > 0
    ? Math.round(gdSessions.filter((s) => s.score).reduce((sum, s) => sum + (s.score ?? 0), 0) / gdSessions.filter((s) => s.score).length * 10) / 10
    : null;

  const attemptsByType = attempts.reduce((acc, a) => {
    acc[a.question.type] = (acc[a.question.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topType = Object.entries(attemptsByType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const avgRating = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.rating, 0) / attempts.length * 10) / 10 : null;

  const avgMood   = journal.length ? Math.round(journal.reduce((s, j) => s + j.mood, 0) / journal.length * 10) / 10 : null;
  const avgEnergy = journal.length ? Math.round(journal.reduce((s, j) => s + j.energy, 0) / journal.length * 10) / 10 : null;

  return {
    userName:      user?.name ?? "there",
    weekLabel:     `${format(weekStart, "MMM d")} – ${format(subDays(weekEnd, 1), "MMM d, yyyy")}`,
    totalSessions: sessions.length,
    totalMinutes:  totalMin,
    activeDays,
    avgDailyScore: avgScore,
    vsLastWeek: {
      sessions:   sessions.length - lastWeekSessions.length,
      minutes:    totalMin - lastMin,
      scoreDelta: null, // simplified
    },
    categories,
    streaks:     streakData,
    gd:          { sessions: gdSessions.length, avgScore: gdAvgScore, initiated: gdSessions.filter((s) => s.initiated).length, concluded: gdSessions.filter((s) => s.concluded).length },
    interview:   { attempts: attempts.length, avgRating, topType },
    journal:     { entries: journal.length, avgMood, avgEnergy },
    topDailyScore: dailyReports.length ? Math.max(...dailyReports.map((r) => r.overallScore)) : null,
    consistency:   Math.round((activeDays / 7) * 100),
  };
}

function buildPrompt(stats: WeeklyStats): string {
  const hours = Math.round(stats.totalMinutes / 60 * 10) / 10;
  const delta  = stats.vsLastWeek;

  const catLines = stats.categories.map((c) => {
    const pct = c.target ? Math.round(((c.current ?? c.sessions) / c.target) * 100) : null;
    return `  - ${c.cat.replace(/_/g," ")}: ${c.sessions} session(s), ${c.minutes} min${pct !== null ? `, ${pct}% of target` : ""}`;
  }).join("\n");

  const streakLines = stats.streaks.filter((s) => s.current > 0).map((s) =>
    `  - ${s.cat.replace(/_/g," ")}: ${s.current}d streak (best: ${s.best}d) [${s.status}]`
  ).join("\n") || "  - No active streaks";

  return `You are a world-class placement preparation coach generating a detailed weekly report for a student preparing for tech placements in India.

Student: ${stats.userName}
Week: ${stats.weekLabel}

═══════════ WEEK STATS ═══════════
Sessions: ${stats.totalSessions} total | ${hours}h studied | ${stats.activeDays}/7 active days
Consistency: ${stats.consistency}%
${stats.avgDailyScore ? `Avg AI Score: ${stats.avgDailyScore}/10 | Best day: ${stats.topDailyScore}/10` : "No AI scores generated this week"}
vs Last Week: ${delta.sessions >= 0 ? "+" : ""}${delta.sessions} sessions, ${delta.minutes >= 0 ? "+" : ""}${delta.minutes} min

═══════════ CATEGORY BREAKDOWN ═══════════
${catLines || "  No sessions logged"}

═══════════ STREAKS ═══════════
${streakLines}

═══════════ GD PERFORMANCE ═══════════
Sessions: ${stats.gd.sessions} | Avg Score: ${stats.gd.avgScore ?? "N/A"}/10
Initiated topic: ${stats.gd.initiated}/${stats.gd.sessions} | Concluded: ${stats.gd.concluded}/${stats.gd.sessions}

═══════════ INTERVIEW PREP ═══════════
Attempts this week: ${stats.interview.attempts} | Avg self-rating: ${stats.interview.avgRating ?? "N/A"}/5
Top category practiced: ${stats.interview.topType ?? "None"}

═══════════ JOURNAL / MENTAL STATE ═══════════
Journal entries: ${stats.journal.entries}/7 | Avg mood: ${stats.journal.avgMood ?? "N/A"}/5 | Avg energy: ${stats.journal.avgEnergy ?? "N/A"}/5

═══════════ INSTRUCTIONS ═══════════
Generate a deeply insightful weekly report. Be specific, honest, and highly actionable. Reference actual numbers. This is for a serious placement candidate.

Return ONLY a JSON object:
{
  "narrative": "[4-5 detailed paragraphs. Para 1: overall week assessment with specific numbers. Para 2: what went well (DSA, GD, interview) with specific details. Para 3: what needs urgent attention — be direct, no sugarcoating. Para 4: mental/consistency analysis. Para 5: looking ahead framing.]",
  "strengths": ["[specific achievement 1 with numbers]", "[specific achievement 2]", "[specific achievement 3]"],
  "gaps": ["[specific gap 1 with impact]", "[specific gap 2]"],
  "nextWeekPlan": ["[Monday: specific action]", "[Tuesday: specific action]", "[Wednesday: specific action]", "[Thursday: specific action]", "[Friday: specific action]", "[Weekend: specific action]"],
  "motivationalNote": "[One powerful, personalized sentence to close. Acknowledge struggle but end strong. Reference something specific from this week.]"
}`;
}

export async function generateWeeklyReport(userId: string, weekStart?: Date) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");

  const monday = weekStart ?? startOfWeek(new Date(), { weekStartsOn: 1 });
  monday.setHours(0, 0, 0, 0);

  // Check for existing report
  const existing = await db.weeklyReport.findUnique({
    where: { userId_weekStart: { userId, weekStart: monday } },
  });
  if (existing) return existing;

  const stats = await gatherWeekStats(userId, monday);
  const prompt = buildPrompt(stats);

  // Call Groq
  let parsed: {
    narrative: string; strengths: string[]; gaps: string[];
    nextWeekPlan: string[]; motivationalNote: string;
  };

  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });
    const raw  = res.choices[0]?.message?.content?.trim() ?? "";
    parsed = JSON.parse(cleanJson(raw));
  } catch (err) {
    throw new Error(`Groq error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const report = await db.weeklyReport.create({
    data: {
      userId,
      weekStart: monday,
      stats:     JSON.stringify(stats),
      aiSummary: parsed.narrative,
      strengths: JSON.stringify(parsed.strengths ?? []),
      gaps:      JSON.stringify(parsed.gaps ?? []),
      nextWeek:  JSON.stringify(parsed.nextWeekPlan ?? []),
      motNote:   parsed.motivationalNote ?? "",
    },
  });

  return report;
}
