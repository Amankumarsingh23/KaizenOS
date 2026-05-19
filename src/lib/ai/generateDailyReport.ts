import { groq } from "@/lib/ai";
import { db } from "@/lib/db";
import { format, subDays, startOfDay } from "date-fns";

const MODEL = "llama-3.3-70b-versatile";

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
  // Effective time accounts for distraction: level 1=100% effective, 5=20% effective
  const effectiveMin = Math.round(
    sessions.reduce((sum, s) => {
      const d = Number(parseMeta(s.metadata).distractionLevel) || 3;
      const focusFactor = (6 - d) / 5; // 1→1.0, 2→0.8, 3→0.6, 4→0.4, 5→0.2
      return sum + s.durationMinutes * focusFactor;
    }, 0)
  );

  // Parse metadata and extract DSA problems solved
  const parseMeta = (raw: string | null) => {
    try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  };
  const totalDsaProblems = sessions
    .filter((s) => s.category === "DSA")
    .reduce((sum, s) => sum + (Number(parseMeta(s.metadata).count) || 0), 0);

  // Format sessions
  const sessionsText = sessions.length === 0
    ? "No sessions logged today."
    : sessions.map((s) => {
        const stars = "★".repeat(s.selfRating) + "☆".repeat(5 - s.selfRating);
        const meta = parseMeta(s.metadata);
        const d = Number(meta.distractionLevel) || 3;
        const focusPct = Math.round(((6 - d) / 5) * 100);
        const effectiveMins = Math.round(s.durationMinutes * (6 - d) / 5);
        const parts: string[] = [];
        if (meta.count)      parts.push(`${meta.count} problems solved`);
        if (meta.problem)    parts.push(`problems: ${meta.problem}`);
        if (meta.difficulty) parts.push(`difficulty: ${meta.difficulty}`);
        if (meta.platform)   parts.push(`platform: ${meta.platform}`);
        if (meta.topic)      parts.push(`topic: ${meta.topic}`);
        if (meta.project)    parts.push(`project: ${meta.project}`);
        parts.push(`focus: ${focusPct}% (${effectiveMins} effective min)`);
        const metaStr = parts.join(", ");
        return `- ${s.category.replace(/_/g," ")} | ${s.durationMinutes} min | ${stars} | ${s.notes}${metaStr ? ` (${metaStr})` : ""}`;
      }).join("\n");

  // Format past scores — normalise old 0-10 scores to 0-100 for consistent context
  const normalise = (score: number) => score <= 10 ? Math.round(score * 10) : Math.round(score);
  const scoresText = pastReports.length === 0
    ? "No recent history."
    : pastReports.map((r) =>
        `- ${format(new Date(r.date), "EEE MMM d")}: ${normalise(r.overallScore)}/100`
      ).join("\n");
  const recentAvg = pastReports.length
    ? Math.round(pastReports.reduce((s, r) => s + normalise(r.overallScore), 0) / pastReports.length)
    : null;

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

  const dsaSummary = totalDsaProblems > 0
    ? `DSA: ${totalDsaProblems} problem${totalDsaProblems > 1 ? "s" : ""} solved today`
    : "DSA: no problems logged yet today";

  return `You are a sharp, honest placement coach scoring a student's study day on a 0–100 scale for ${format(today, "EEEE, MMMM d, yyyy")}.

The student is preparing for tech placements in India (DSA, GD, Mock Interviews, Projects, Current Affairs, Japanese, Communication, Reading).

═══ TODAY'S SESSIONS (${totalMin} min logged · ${effectiveMin} min EFFECTIVE · ${sessions.length} session${sessions.length !== 1 ? "s" : ""} · ${dsaSummary}) ═══
${sessionsText}

═══ LAST 7 DAYS (recent avg: ${recentAvg !== null ? `${recentAvg}/100` : "N/A"}) ═══
${scoresText}

═══ ${month.toUpperCase()} TARGETS (day ${dom}/${daysInMonth} — expected ${expectedPct}% done) ═══
${targetsText}

═══ STREAKS ═══
${streaksText}

═══ SCORING RUBRIC (0–100, be precise and granular) ═══

DSA PROBLEMS SOLVED today (${totalDsaProblems}):
  0 problems   →  -15 from DSA subscore
  1–2 problems →  base DSA subscore ~40–55
  3–5 problems →  base DSA subscore ~60–75
  6–9 problems →  base DSA subscore ~80–90
  10+ problems →  base DSA subscore 90–100
  Adjust up for Hard difficulty, down for Easy-only

CRITICAL: Score based on EFFECTIVE minutes (${effectiveMin}), NOT logged minutes (${totalMin}).
Someone who logged 5 hours while distracted (→ 1 effective hour) scores LOWER than someone who did 1 focused hour.

OVERALL SCORE formula (weighted):
  DSA problems + effective time (30%) — effective_min × quality × problem count
  Category breadth (20%)              — 1 cat = max 50%, 2 cats = 65%, 3+ cats = full marks
  Target progress (20%)               — on-track = full, behind = deduct proportionally
  Streaks maintained (15%)            — each active streak = +3 pts, each broken = -2 pts
  Focus quality (10%)                 — avg focus level across sessions (fully focused = bonus)
  Trend vs recent avg (5%)            — improving = bonus, declining = slight penalty

ROUGH BANDS (based on EFFECTIVE time):
  90–100: Exceptional — 3+ effective hours, multiple categories, targets hit
  75–89:  Strong — 2+ effective hours, good variety, mostly on track
  60–74:  Good — 60-120 effective minutes, solid focus, some breadth
  45–59:  Decent — 30-60 effective minutes, single category
  30–44:  Light — distracted most of session, minimal effective work
  0–29:   Off day — nothing meaningful logged or near-zero effective time

═══ OUTPUT — raw JSON only, no markdown fences, no explanation ═══
{
  "overallScore": [integer 0–100, calculated precisely using rubric above],
  "categoryScores": {[only categories studied today, key=category name, value=0–100]},
  "summary": "[2–3 sentences. MUST mention: total minutes, exact DSA problems solved, which categories, target status. Honest. No filler.]",
  "strengths": "[specific achievement with numbers], [another specific win]",
  "gaps": "[specific gap with impact], [another gap if relevant]",
  "recommendations": "[specific tomorrow action 1], [specific tomorrow action 2], [specific tomorrow action 3]"
}`;
}

// ─── Report generator ─────────────────────────────────────────────────────────

export async function generateDailyReport(userId: string): Promise<ReportOutput> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const ctx = await gatherContext(userId);
  // Always regenerate — score must reflect ALL sessions logged today, not just the first
  const today = startOfDay(new Date());

  const prompt = buildPrompt(ctx);

  // Call Groq (OpenAI-compatible)
  let rawText = "";
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });
    rawText = response.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    throw new Error(`Groq API error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Parse JSON (strip any markdown fences if present)
  let parsed: ReportOutput;
  try {
    const stripped = rawText.replace(/^```(?:json)?\s*/im,"").replace(/```\s*$/im,"").trim();
    // Only escape control chars inside JSON string values, not structural whitespace
    let inStr = false, esc = false, clean = "";
    for (const ch of stripped) {
      if (esc) { clean += ch; esc = false; continue; }
      if (ch === "\\" && inStr) { clean += ch; esc = true; continue; }
      if (ch === '"') { inStr = !inStr; clean += ch; continue; }
      if (inStr && ch === "\n") { clean += "\\n"; continue; }
      if (inStr && ch === "\r") { clean += "\\r"; continue; }
      if (inStr && ch === "\t") { clean += "\\t"; continue; }
      clean += ch;
    }
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Failed to parse Claude response: ${rawText.slice(0, 200)}`);
  }

  // Validate & clamp
  // AI now returns 0-100 natively
  const overallScore    = Math.max(0, Math.min(100, Math.round(Number(parsed.overallScore ?? 50))));
  const categoryScores  = parsed.categoryScores ?? {};
  const summary         = String(parsed.summary ?? "");
  const strengths       = String(parsed.strengths ?? "");
  const gaps            = String(parsed.gaps ?? "");
  const recommendations = String(parsed.recommendations ?? "");

  // Upsert so each new session re-scores the full day (not just the first session)
  await db.dailyReport.upsert({
    where:  { userId_date: { userId, date: today } },
    update: { overallScore, categoryScores: JSON.stringify(categoryScores), summary, strengths, gaps, recommendations },
    create: { userId, date: today, overallScore, categoryScores: JSON.stringify(categoryScores), summary, strengths, gaps, recommendations },
  });

  return { overallScore, categoryScores, summary, strengths, gaps, recommendations };
}
