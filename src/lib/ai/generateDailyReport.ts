import { anthropic } from "@/lib/ai";
import { db } from "@/lib/db";
import { format, subDays, startOfDay } from "date-fns";

const MODEL = "claude-sonnet-4-20250514";

const CATEGORIES = [
  "DSA","GD","MOCK_INTERVIEW","PROJECT_WORK",
  "CURRENT_AFFAIRS","JAPANESE","COMMUNICATION","READING",
] as const;

interface ReportOutput {
  overallScore:    number;
  categoryScores:  Record<string, number>;
  summary:         string;
  strengths:       string;
  gaps:            string;
  recommendations: string;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function gatherContext(userId: string) {
  const today    = startOfDay(new Date());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const week7    = subDays(today, 7);

  const [sessions, pastReports, targets, streaks] = await Promise.all([
    db.studySession.findMany({
      where: { userId, startTime: { gte: today, lt: tomorrow } },
      orderBy: { startTime: "asc" },
    }),
    db.dailyReport.findMany({
      where: { userId, date: { gte: week7, lt: today } },
      orderBy: { date: "desc" },
      take: 7,
    }),
    db.target.findMany({
      where: { userId, month: today.getMonth() + 1, year: today.getFullYear() },
    }),
    db.streak.findMany({ where: { userId } }),
  ]);

  return { sessions, pastReports, targets, streaks, today };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(ctx: Awaited<ReturnType<typeof gatherContext>>): string {
  const { sessions, pastReports, targets, streaks, today } = ctx;
  const month = format(today, "MMMM yyyy");
  const totalMin = sessions.reduce((s, r) => s + r.durationMinutes, 0);

  // Format sessions
  const sessionsText = sessions.length === 0
    ? "No sessions logged today."
    : sessions.map((s) => {
        const stars = "★".repeat(s.selfRating) + "☆".repeat(5 - s.selfRating);
        const meta = s.metadata ? (() => { try { return JSON.parse(s.metadata!); } catch { return {}; } })() : {};
        const metaStr = Object.entries(meta)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        return `- ${s.category.replace(/_/g," ")} | ${s.durationMinutes} min | ${stars} | ${s.notes}${metaStr ? ` (${metaStr})` : ""}`;
      }).join("\n");

  // Format past scores
  const scoresText = pastReports.length === 0
    ? "No recent history."
    : pastReports.map((r) =>
        `- ${format(new Date(r.date), "EEE MMM d")}: ${r.overallScore}/10`
      ).join("\n");
  const recentAvg = pastReports.length
    ? (pastReports.reduce((s, r) => s + r.overallScore, 0) / pastReports.length).toFixed(1)
    : "N/A";

  // Format targets
  const dom = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const expectedPct = Math.round((dom / daysInMonth) * 100);
  const targetsText = targets.length === 0
    ? "No targets set for this month."
    : targets.map((t) => {
        const pct = t.targetValue > 0 ? Math.round((t.currentValue / t.targetValue) * 100) : 0;
        const status = pct < expectedPct - 10 ? "⚠ BEHIND" : pct >= 100 ? "✓ DONE" : "on track";
        return `- ${t.category.replace(/_/g," ")}: ${t.currentValue}/${t.targetValue} ${t.unit} (${pct}% — expected ${expectedPct}%) [${status}]`;
      }).join("\n");

  // Format streaks
  const streaksText = CATEGORIES.map((cat) => {
    const s = streaks.find((x) => x.category === cat);
    if (!s) return null;
    const last = new Date(s.lastActivityDate);
    const diff = Math.floor((today.getTime() - startOfDay(last).getTime()) / 86_400_000);
    const status = diff === 0 ? "✅ Active today" : diff === 1 ? "⏳ Not done today" : `❌ Broken (${diff}d ago)`;
    return `- ${cat.replace(/_/g," ")}: ${s.currentStreak}d streak (best: ${s.bestStreak}d) [${status}]`;
  }).filter(Boolean).join("\n") || "No streaks yet.";

  return `You are a personal learning coach analyzing a student's study data for ${format(today, "EEEE, MMMM d, yyyy")}.

The student is preparing for competitive placements in India. They practice DSA, Group Discussion, Mock Interviews, Project Work, Current Affairs, Japanese, Communication (STAR stories), and Reading.

───────────────────────────────
TODAY'S SESSIONS (${totalMin} minutes total, ${sessions.length} session${sessions.length !== 1 ? "s" : ""})
───────────────────────────────
${sessionsText}

───────────────────────────────
LAST 7 DAYS OF SCORES (recent avg: ${recentAvg}/10)
───────────────────────────────
${scoresText}

───────────────────────────────
${month.toUpperCase()} TARGETS & PROGRESS
(Today is day ${dom}/${daysInMonth} — expected ${expectedPct}% done)
───────────────────────────────
${targetsText}

───────────────────────────────
STREAKS
───────────────────────────────
${streaksText}

───────────────────────────────
SCORING GUIDE
───────────────────────────────
Overall score (0–10):
  0–2: No meaningful study
  3–5: Light effort or major imbalance
  6–7: Solid day with some gaps
  8–9: Strong, consistent, well-balanced
  10: Exceptional — targets hit, all key categories, great quality

Factors to weigh:
  1. Volume (60 min is a baseline solid day; 120+ min is excellent)
  2. Category balance (DSA + GD are the core; others are bonus)
  3. Consistency with targets (on-track = good, behind = penalize)
  4. Streak maintenance (broken streak = deduct 1 point)
  5. Quality (self-rating, specific problems solved, notes detail)
  6. Trend vs yesterday/recent avg (improvement = bonus)

───────────────────────────────
INSTRUCTIONS
───────────────────────────────
Return ONLY a JSON object with exactly these keys. No markdown, no explanation, no wrapping — raw JSON only.

{
  "overallScore": [number 0.0–10.0, one decimal allowed],
  "categoryScores": {[only categories studied today, keys as-is]: [0.0–10.0]},
  "summary": "[2–3 sentences. Be specific: mention actual numbers (e.g. '4 LeetCode problems in 90 minutes'). Reference targets and streaks. Honest overall assessment.]",
  "strengths": "[specific win 1], [specific win 2], [specific win 3 if applicable]",
  "gaps": "[specific gap 1], [specific gap 2 if applicable]",
  "recommendations": "[tomorrow's action 1 — be very specific], [tomorrow's action 2], [tomorrow's action 3]"
}`;
}

// ─── Report generator ─────────────────────────────────────────────────────────

export async function generateDailyReport(userId: string): Promise<ReportOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const ctx = await gatherContext(userId);

  // Check for existing report today
  const today    = startOfDay(new Date());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const existing = await db.dailyReport.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow } },
  });
  if (existing) {
    return {
      overallScore:    existing.overallScore,
      categoryScores:  JSON.parse(existing.categoryScores),
      summary:         existing.summary,
      strengths:       existing.strengths,
      gaps:            existing.gaps,
      recommendations: existing.recommendations,
    };
  }

  const prompt = buildPrompt(ctx);

  // Call Claude
  let rawText = "";
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });
    rawText = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  } catch (err) {
    throw new Error(`Claude API error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Parse JSON (strip any markdown fences if present)
  let parsed: ReportOutput;
  try {
    const clean = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Failed to parse Claude response: ${rawText.slice(0, 200)}`);
  }

  // Validate & clamp
  const overallScore    = Math.max(0, Math.min(10, Number(parsed.overallScore ?? 5)));
  const categoryScores  = parsed.categoryScores ?? {};
  const summary         = String(parsed.summary ?? "");
  const strengths       = String(parsed.strengths ?? "");
  const gaps            = String(parsed.gaps ?? "");
  const recommendations = String(parsed.recommendations ?? "");

  // Save to DB
  await db.dailyReport.create({
    data: {
      userId,
      date:            today,
      overallScore,
      categoryScores:  JSON.stringify(categoryScores),
      summary,
      strengths,
      gaps,
      recommendations,
    },
  });

  return { overallScore, categoryScores, summary, strengths, gaps, recommendations };
}
