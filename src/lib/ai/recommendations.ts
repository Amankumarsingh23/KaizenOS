/**
 * Recommendation engine — all pure functions, zero Claude calls.
 * Claude is only used in generateDailyReport.ts.
 */
import { startOfDay, differenceInDays } from "date-fns";
import type { Category } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleItem {
  category: Category;
  note: string;
  durationMin: number;
  gdSubtype?: "ABSTRACT" | "CURRENT_AFFAIRS" | "BUSINESS" | "TECHNICAL" | "ETHICAL";
  mockSubtype?: "HR" | "TECHNICAL" | "SYSTEM_DESIGN";
}

export interface PlanItem {
  priority:    number;
  category:    Category;
  action:      string;
  durationMin: number;
  reason:      string;
  badge:       "streak_risk" | "behind_target" | "scheduled" | "on_track";
}

export interface MorningPlan {
  items:        PlanItem[];
  totalMinutes: number;
  headline:     string;
}

export interface Nudge {
  type:    "time_reminder" | "progress_motivating" | "break_reminder" | "streak_risk" | "positive";
  message: string;
  urgency: "low" | "medium" | "high";
  category?: Category;
}

export interface GapItem {
  category:     Category;
  currentValue: number;
  targetValue:  number;
  expectedValue: number;
  gapUnits:     number;
  unit:         string;
  suggestion:   string;
  urgency:      "high" | "medium" | "low";
}

export interface GapAnalysis {
  topGaps:         GapItem[];
  streakAlerts:    { category: Category; currentStreak: number; message: string }[];
  overallStatus:   "on_track" | "slightly_behind" | "significantly_behind";
  encouragement:   string;
}

// ─── Input shapes (minimal — avoids importing full Prisma types here) ─────────

interface TargetInput {
  category: string;
  targetValue: number;
  currentValue: number;
  unit: string;
}

interface StreakInput {
  category: string;
  currentStreak: number;
  bestStreak: number;
  lastActivityDate: Date | string;
}

interface SessionInput {
  category: string;
  durationMinutes: number;
  startTime: Date | string;
  endTime?: Date | string | null;
}

interface GDTopicInput {
  topic: string;
  category: string;
  practiced: boolean;
  lastPracticedAt?: Date | string | null;
}

// ─── Weekly schedule ──────────────────────────────────────────────────────────
// Designed for May 2026 targets: 20 GD, 10 STAR, 30 DSA, 12 Mock

const WEEKLY_SCHEDULE: Record<number, ScheduleItem[]> = {
  0: [ // Sunday — light recovery + review
    { category: "READING",  durationMin: 30, note: "Read an article or book chapter" },
    { category: "JAPANESE", durationMin: 20, note: "Review this week's vocabulary" },
    { category: "DSA",      durationMin: 45, note: "1–2 easy revision problems" },
  ],
  1: [ // Monday — GD (Abstract) + DSA
    { category: "GD",  durationMin: 30, note: "Abstract GD topic practice", gdSubtype: "ABSTRACT" },
    { category: "DSA", durationMin: 60, note: "2–3 problems (try medium difficulty)" },
    { category: "CURRENT_AFFAIRS", durationMin: 20, note: "Skim today's headlines" },
  ],
  2: [ // Tuesday — HR Mock + DSA
    { category: "MOCK_INTERVIEW", durationMin: 45, note: "HR mock — prepare 2 STAR stories", mockSubtype: "HR" },
    { category: "DSA",           durationMin: 60, note: "2–3 problems" },
  ],
  3: [ // Wednesday — DSA focus + Current Affairs GD
    { category: "DSA", durationMin: 90, note: "DSA focus day — 3–4 problems" },
    { category: "GD",  durationMin: 30, note: "Current Affairs GD topic", gdSubtype: "CURRENT_AFFAIRS" },
  ],
  4: [ // Thursday — Communication + DSA + Business/Ethical GD
    { category: "COMMUNICATION", durationMin: 30, note: "Practice 2 STAR stories" },
    { category: "DSA",           durationMin: 60, note: "2–3 problems" },
    { category: "GD",            durationMin: 25, note: "Business or Ethical GD topic", gdSubtype: "BUSINESS" },
  ],
  5: [ // Friday — Technical Mock + DSA
    { category: "MOCK_INTERVIEW", durationMin: 60, note: "Technical mock or System Design", mockSubtype: "TECHNICAL" },
    { category: "DSA",            durationMin: 45, note: "1–2 harder problems" },
  ],
  6: [ // Saturday — Heavy DSA + Project Work
    { category: "DSA",          durationMin: 90, note: "Heavy DSA session — 4–5 problems" },
    { category: "PROJECT_WORK", durationMin: 60, note: "Build/code for your project" },
  ],
};

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSinceActivity(last: Date | string, today: Date): number {
  return differenceInDays(startOfDay(today), startOfDay(new Date(last)));
}

function expectedProgress(dom: number, daysInMonth: number): number {
  return dom / daysInMonth;
}

function urgencyLevel(gap: number): "high" | "medium" | "low" {
  if (gap > 0.25) return "high";
  if (gap > 0.10) return "medium";
  return "low";
}

function bestGDTopic(gdTopics: GDTopicInput[], preferCategory?: string): string | null {
  const candidates = gdTopics
    .filter((t) => !t.practiced && (preferCategory ? t.category === preferCategory : true))
    .sort((a, b) => {
      // Prefer topics never practiced (null lastPracticedAt), then oldest
      if (!a.lastPracticedAt && b.lastPracticedAt) return -1;
      if (a.lastPracticedAt && !b.lastPracticedAt) return  1;
      if (!a.lastPracticedAt && !b.lastPracticedAt) return 0;
      return new Date(a.lastPracticedAt!).getTime() - new Date(b.lastPracticedAt!).getTime();
    });

  // Fall back to any category if preferred has none
  if (!candidates.length && preferCategory) {
    return bestGDTopic(gdTopics, undefined);
  }
  return candidates[0]?.topic ?? null;
}

// ─── 1. Morning Plan ──────────────────────────────────────────────────────────

export function getMorningPlan(
  today: Date,
  targets: TargetInput[],
  streaks: StreakInput[],
  todaySessions: SessionInput[],
  gdTopics: GDTopicInput[] = []
): MorningPlan {
  const dow = today.getDay();
  const baseSchedule = WEEKLY_SCHEDULE[dow] ?? [];

  // Categorise what's already done today
  const doneCats = new Set(todaySessions.map((s) => s.category));

  // Build streak-risk set (alive but not done today)
  const atRiskStreaks = streaks.filter((s) => {
    const diff = daysSinceActivity(s.lastActivityDate, today);
    return s.currentStreak > 0 && diff === 1; // alive but not logged today
  });
  const riskCats = new Set(atRiskStreaks.map((s) => s.category));

  // Build behind-target map
  const dom = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const expected = expectedProgress(dom, daysInMonth);

  const behindMap = new Map<string, number>(); // category → gap (0–1)
  for (const t of targets) {
    if (t.targetValue <= 0) continue;
    const actual = t.currentValue / t.targetValue;
    const gap    = expected - actual;
    if (gap > 0.05) behindMap.set(t.category, gap);
  }

  // Score each scheduled item
  const scored: (ScheduleItem & { score: number; badge: PlanItem["badge"] })[] = baseSchedule.map((item) => {
    let score = 10;
    let badge: PlanItem["badge"] = "scheduled";

    if (riskCats.has(item.category)) {
      score += 30;
      badge = "streak_risk";
    }
    const gap = behindMap.get(item.category) ?? 0;
    if (gap > 0.25) { score += 20; if (badge === "scheduled") badge = "behind_target"; }
    else if (gap > 0.10) { score += 10; if (badge === "scheduled") badge = "behind_target"; }

    // Bump sessions not done yet today
    if (!doneCats.has(item.category)) score += 5;

    return { ...item, score, badge };
  });

  // Add high-priority targets NOT in today's schedule
  for (const t of targets) {
    const gap = behindMap.get(t.category) ?? 0;
    if (gap <= 0.25) continue;
    const alreadyScheduled = baseSchedule.some((s) => s.category === t.category);
    if (alreadyScheduled) continue;

    scored.push({
      category: t.category as Category,
      note: `Catch up on ${t.category.replace(/_/g," ")} (${t.unit})`,
      durationMin: 30,
      score: 25,
      badge: "behind_target",
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 4);

  const items: PlanItem[] = top.map((item, i) => {
    let action = item.note;
    let reason = "Scheduled for today";

    if (item.badge === "streak_risk") {
      const s = atRiskStreaks.find((x) => x.category === item.category);
      reason  = `Keep your ${s?.currentStreak ?? 0}-day streak alive`;
    } else if (item.badge === "behind_target") {
      const gap = behindMap.get(item.category) ?? 0;
      reason = `${Math.round(gap * 100)}% behind expected pace`;
    }

    // Personalise GD action with a real topic
    if (item.category === "GD") {
      const topic = bestGDTopic(gdTopics, item.gdSubtype);
      if (topic) action = `GD practice: "${topic}"`;
    }

    return { priority: i + 1, category: item.category as Category, action, durationMin: item.durationMin, reason, badge: item.badge };
  });

  const totalMinutes = items.reduce((s, x) => s + x.durationMin, 0);
  const dayName      = DAY_NAMES[dow];
  const riskCount    = items.filter((i) => i.badge === "streak_risk").length;
  const behindCount  = items.filter((i) => i.badge === "behind_target").length;

  let headline =
    riskCount > 0   ? `${riskCount} streak${riskCount > 1 ? "s" : ""} at risk — prioritise accordingly` :
    behindCount > 0 ? `Catch-up day — you're behind on ${behindCount} target${behindCount > 1 ? "s" : ""}` :
    doneCats.size > 0 ? "Good start — keep the momentum" :
    `${dayName}'s plan ready`;

  return { items, totalMinutes, headline };
}

// ─── 2. Real-time Nudges ──────────────────────────────────────────────────────

export function getRealTimeNudge(
  todaySessions: SessionInput[],
  targets: TargetInput[],
  streaks: StreakInput[],
  today: Date,
  currentHour: number
): Nudge | null {
  const totalMinToday = todaySessions.reduce((s, r) => s + r.durationMinutes, 0);
  const sessionCount  = todaySessions.length;
  const dom = today.getDate();
  const daysInMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const expected      = expectedProgress(dom, daysInMonth);

  // 1. Break reminder (last session ended < 5 min ago, working > 50 min)
  if (todaySessions.length > 0) {
    const lastEnd = todaySessions
      .map((s) => s.endTime ? new Date(s.endTime) : null)
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];

    const lastSession = todaySessions[todaySessions.length - 1];
    if (lastSession.durationMinutes >= 50 && !lastEnd) {
      // Timer still running
      return {
        type: "break_reminder",
        message: `You've been studying for ${lastSession.durationMinutes} minutes — consider a 5-minute break to stay sharp.`,
        urgency: "low",
        category: lastSession.category as Category,
      };
    }
  }

  // 2. Streak risk (afternoon, streak not maintained today)
  if (currentHour >= 15) {
    const atRisk = streaks
      .filter((s) => {
        const diff = daysSinceActivity(s.lastActivityDate, today);
        return s.currentStreak >= 3 && diff === 1;
      })
      .sort((a, b) => b.currentStreak - a.currentStreak);

    if (atRisk.length > 0) {
      const top = atRisk[0];
      const hour = currentHour >= 21 ? "tonight" : "this afternoon";
      return {
        type: "streak_risk",
        urgency: currentHour >= 21 ? "high" : "medium",
        category: top.category as Category,
        message: `Log a ${top.category.replace(/_/g," ")} session ${hour} to protect your ${top.currentStreak}-day streak.`,
      };
    }
  }

  // 3. Time reminder — no sessions yet and past a threshold
  if (sessionCount === 0) {
    if (currentHour >= 21) {
      return {
        type: "time_reminder",
        urgency: "high",
        message: `It's past 9 PM and no sessions logged — even 30 minutes of DSA will keep you on track.`,
      };
    }
    if (currentHour >= 16) {
      return {
        type: "time_reminder",
        urgency: "medium",
        message: `Afternoon check-in: no sessions yet today. A 45-minute session now will keep your streak alive.`,
      };
    }
    if (currentHour >= 11) {
      return {
        type: "time_reminder",
        urgency: "low",
        message: `Good morning energy fading — now is a great time for your first session.`,
      };
    }
  }

  // 4. Progress motivating (close to a sub-goal)
  for (const t of targets) {
    if (t.targetValue <= 0) continue;
    const todayCatSessions = todaySessions.filter((s) => s.category === t.category);
    if (!todayCatSessions.length) continue;

    const dailyExpected = Math.ceil((expected * t.targetValue) / dom); // rough daily pace
    const todayDone     = todayCatSessions.length;
    const remaining     = dailyExpected - todayDone;

    if (remaining === 1) {
      return {
        type: "progress_motivating",
        urgency: "low",
        category: t.category as Category,
        message: `You're ${todayDone}/${dailyExpected} on ${t.category.replace(/_/g," ")} today — just 1 more ${t.unit} to hit today's pace!`,
      };
    }
  }

  // 5. Positive — good day already
  if (totalMinToday >= 90 && sessionCount >= 2) {
    return {
      type: "positive",
      urgency: "low",
      message: `${totalMinToday} minutes logged across ${sessionCount} sessions — solid day! One more session would make it exceptional.`,
    };
  }

  return null;
}

// ─── 3. Gap Analysis ──────────────────────────────────────────────────────────

export function getGapAnalysis(
  targets: TargetInput[],
  streaks: StreakInput[],
  gdTopics: GDTopicInput[],
  today: Date
): GapAnalysis {
  const dom = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const expected    = expectedProgress(dom, daysInMonth);

  // Compute gap per target
  const gaps: GapItem[] = targets
    .filter((t) => t.targetValue > 0)
    .map((t) => {
      const actual        = t.currentValue / t.targetValue;
      const gap           = expected - actual;
      const expectedValue = Math.round(expected * t.targetValue * 10) / 10;
      const gapUnits      = Math.max(0, Math.ceil(expectedValue - t.currentValue));
      const urgency       = urgencyLevel(gap);

      // Build a specific suggestion
      let suggestion = `Dedicate 30 min to ${t.category.replace(/_/g, " ")}`;
      if (t.category === "GD") {
        const topic = bestGDTopic(gdTopics);
        suggestion  = topic ? `Practice GD: "${topic}"` : "Pick any GD topic and practice for 25 min";
      } else if (t.category === "DSA") {
        suggestion = `Solve ${Math.min(gapUnits, 4)} more problem${gapUnits > 1 ? "s" : ""} on LeetCode (focus on medium difficulty)`;
      } else if (t.category === "MOCK_INTERVIEW") {
        suggestion = `Run a 45-min mock interview — ${gapUnits > 6 ? "HR" : "Technical"} format`;
      } else if (t.category === "COMMUNICATION") {
        suggestion = `Write out ${Math.min(gapUnits, 3)} new STAR stories in your notes`;
      } else if (t.category === "CURRENT_AFFAIRS") {
        suggestion = `Read 2 editorials and summarise them in 3 sentences each`;
      }

      return {
        category: t.category as Category,
        currentValue: t.currentValue,
        targetValue:  t.targetValue,
        expectedValue,
        gapUnits,
        unit: t.unit,
        suggestion,
        urgency,
      };
    })
    .filter((g) => g.gapUnits > 0)
    .sort((a, b) => {
      const urgOrder = { high: 0, medium: 1, low: 2 };
      return urgOrder[a.urgency] - urgOrder[b.urgency];
    });

  // Streak alerts — streaks alive but not done today
  const streakAlerts = streaks
    .filter((s) => s.currentStreak > 0 && daysSinceActivity(s.lastActivityDate, today) === 1)
    .map((s) => ({
      category:      s.category as Category,
      currentStreak: s.currentStreak,
      message:       `Log 1 ${s.category.replace(/_/g," ")} session today to protect your ${s.currentStreak}-day streak`,
    }));

  const overallStatus =
    gaps.some((g) => g.urgency === "high")   ? "significantly_behind" :
    gaps.some((g) => g.urgency === "medium") ? "slightly_behind" : "on_track";

  const encouragement =
    overallStatus === "on_track" ? "You're pacing well — keep showing up daily." :
    overallStatus === "slightly_behind" ? "A couple of focused sessions will get you back on track." :
    "Significant catch-up needed — prioritise the top gaps today.";

  return { topGaps: gaps.slice(0, 3), streakAlerts, overallStatus, encouragement };
}

// ─── 4. Combined recommendations ──────────────────────────────────────────────

export interface Recommendations {
  morningPlan:  MorningPlan;
  nudge:        Nudge | null;
  gapAnalysis:  GapAnalysis;
  generatedAt:  string;
}

export function buildRecommendations(
  today: Date,
  currentHour: number,
  targets: TargetInput[],
  streaks: StreakInput[],
  todaySessions: SessionInput[],
  gdTopics: GDTopicInput[]
): Recommendations {
  return {
    morningPlan: getMorningPlan(today, targets, streaks, todaySessions, gdTopics),
    nudge:       getRealTimeNudge(todaySessions, targets, streaks, today, currentHour),
    gapAnalysis: getGapAnalysis(targets, streaks, gdTopics, today),
    generatedAt: new Date().toISOString(),
  };
}
