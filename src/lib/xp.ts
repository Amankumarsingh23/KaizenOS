// ─── XP / Coins Calculation Library ──────────────────────────────────────────

export interface XpAward {
  xp:        number;
  coins:     number;
  breakdown: string;
}

const CATEGORY_WEIGHT: Record<string, number> = {
  DSA: 1.5, MOCK_INTERVIEW: 1.4, GD: 1.2, PROJECT_WORK: 1.2,
  CURRENT_AFFAIRS: 1.0, COMMUNICATION: 1.0, READING: 0.8, JAPANESE: 0.8,
};

const FOCUS_FACTOR = [0, 1.5, 1.2, 1.0, 0.6, 0.3]; // index = distractionLevel (1-5)

export function calculateSessionXP(session: {
  category:        string;
  durationMinutes: number;
  selfRating:      number;
  metadata?:       string | null;
}): XpAward {
  const dur    = Math.min(session.durationMinutes, 120); // cap at 2h to prevent farming
  const catW   = CATEGORY_WEIGHT[session.category] ?? 1.0;

  let meta: Record<string, string> = {};
  try { meta = session.metadata ? JSON.parse(session.metadata) : {}; } catch { /* ok */ }

  const distraction = Math.min(5, Math.max(1, Number(meta.distractionLevel) || 3));
  const focusF      = FOCUS_FACTOR[distraction] ?? 1.0;

  const difficulty  = (meta.difficulty ?? "").toLowerCase();
  const diffBonus   = session.category === "DSA"
    ? (difficulty === "hard" ? 2.0 : difficulty === "medium" ? 1.5 : 1.0)
    : 1.0;

  // Low self-rating penalty
  const ratingF = session.selfRating < 3 ? 0.7 : 1.0;

  const rawXp = dur * catW * focusF * diffBonus * ratingF;
  const xp    = Math.max(1, Math.round(rawXp));
  const coins = Math.max(0, Math.round(xp / 3));

  const breakdown = `${dur}min × ${catW}×cat × ${focusF}×focus × ${diffBonus}×diff`;

  return { xp, coins, breakdown };
}

// ─── Level system ─────────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = [0, 500, 1500, 4000, 9000, 18000, 35000, 65000, 120000];
const LEVEL_TITLES = [
  "", "Freshman Applicant", "Resume Builder", "Consistent Grinder",
  "DSA Warrior", "Interview Ready", "Placement Machine", "Offer Collector",
  "Legendary Preparer", "Campus Legend",
];

export function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)] ?? "Legend";
}

export function getLevelProgress(xp: number): { current: number; nextAt: number; pct: number } {
  const level   = getLevel(xp);
  const current = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextAt  = LEVEL_THRESHOLDS[level]     ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const pct     = nextAt > current ? Math.round(((xp - current) / (nextAt - current)) * 100) : 100;
  return { current: xp - current, nextAt: nextAt - current, pct };
}

// ─── Streak milestone bonuses ─────────────────────────────────────────────────

export function streakMilestoneBonus(streak: number): { xp: number; coins: number; label: string } | null {
  const milestones: [number, number, number, string][] = [
    [7,   500,  150, "7-day streak! 🔥"],
    [14,  800,  250, "2-week streak! 🔥🔥"],
    [30,  2000, 600, "Monthly machine! 💎"],
    [60,  4000, 1200, "Unbreakable! 👑"],
    [100, 8000, 2500, "Legendary! 🏆"],
  ];
  const hit = milestones.find(([days]) => days === streak);
  return hit ? { xp: hit[1], coins: hit[2], label: hit[3] } : null;
}

// ─── League tier ──────────────────────────────────────────────────────────────

export function getLeagueTier(weeklyXp: number): { name: string; color: string; emoji: string } {
  if (weeklyXp >= 10000) return { name: "Diamond",  color: "text-sky-500",    emoji: "💎" };
  if (weeklyXp >= 5000)  return { name: "Platinum", color: "text-violet-500", emoji: "🏆" };
  if (weeklyXp >= 2500)  return { name: "Gold",     color: "text-gold",       emoji: "🥇" };
  if (weeklyXp >= 1000)  return { name: "Silver",   color: "text-slate-400",  emoji: "🥈" };
  return                        { name: "Bronze",   color: "text-amber-600",  emoji: "🥉" };
}
