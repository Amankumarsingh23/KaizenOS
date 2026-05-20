import { db } from "./db";

export interface BadgeDef {
  id:          string;
  name:        string;
  description: string;
  emoji:       string;
  category:    "streak" | "dsa" | "volume" | "consistency" | "gd" | "social" | "special" | "score";
  rarity:      "common" | "rare" | "epic" | "legendary";
}

export const ALL_BADGES: BadgeDef[] = [
  // ── Streak ─────────────────────────────────────────────────────────────
  { id:"streak_3",   name:"First Flame",       description:"Maintain any streak for 3 days",         emoji:"🔥",  category:"streak",      rarity:"common"    },
  { id:"streak_7",   name:"Week Warrior",       description:"7-day active streak",                    emoji:"🔥🔥", category:"streak",      rarity:"common"    },
  { id:"streak_14",  name:"Fortnight Fighter",  description:"14-day streak",                          emoji:"⚡",  category:"streak",      rarity:"rare"      },
  { id:"streak_30",  name:"Monthly Machine",    description:"30-day streak",                          emoji:"💎",  category:"streak",      rarity:"epic"      },
  { id:"streak_60",  name:"Unbreakable",        description:"60-day streak",                          emoji:"🛡️", category:"streak",      rarity:"epic"      },
  { id:"streak_100", name:"Legend",             description:"100-day streak",                         emoji:"👑",  category:"streak",      rarity:"legendary" },

  // ── DSA ────────────────────────────────────────────────────────────────
  { id:"dsa_10",     name:"Problem Solver",     description:"Solve 10 DSA problems",                  emoji:"🧩",  category:"dsa",         rarity:"common"    },
  { id:"dsa_50",     name:"Fifty Club",         description:"Solve 50 DSA problems",                  emoji:"🔢",  category:"dsa",         rarity:"common"    },
  { id:"dsa_100",    name:"Century Coder",      description:"Solve 100 DSA problems",                 emoji:"💯",  category:"dsa",         rarity:"rare"      },
  { id:"dsa_250",    name:"Problem Master",     description:"Solve 250 DSA problems",                 emoji:"🏆",  category:"dsa",         rarity:"epic"      },
  { id:"dsa_hard10", name:"Hard Crusher",       description:"Solve 10 Hard difficulty problems",      emoji:"🔴",  category:"dsa",         rarity:"rare"      },
  { id:"dsa_hard25", name:"Hard Core",          description:"Solve 25 Hard difficulty problems",      emoji:"💀",  category:"dsa",         rarity:"epic"      },

  // ── Volume ─────────────────────────────────────────────────────────────
  { id:"sessions_10",  name:"Getting Started",  description:"Log 10 study sessions",                  emoji:"📖",  category:"volume",      rarity:"common"    },
  { id:"sessions_50",  name:"Grinder",          description:"Log 50 study sessions",                  emoji:"⚙️", category:"volume",      rarity:"common"    },
  { id:"sessions_100", name:"Centurion",        description:"Log 100 study sessions",                 emoji:"🎯",  category:"volume",      rarity:"rare"      },
  { id:"sessions_500", name:"Unstoppable",      description:"Log 500 study sessions",                 emoji:"🚀",  category:"volume",      rarity:"epic"      },
  { id:"hours_10",     name:"10 Hours In",      description:"Log 10 total hours of study",            emoji:"⏱️", category:"volume",      rarity:"common"    },
  { id:"hours_50",     name:"50 Hours Club",    description:"Log 50 total hours of study",            emoji:"⏰",  category:"volume",      rarity:"rare"      },
  { id:"hours_100",    name:"100 Hours Legend", description:"Log 100 total hours of study",           emoji:"⌛",  category:"volume",      rarity:"epic"      },

  // ── Consistency ────────────────────────────────────────────────────────
  { id:"perfect_week",  name:"Perfect Week",    description:"Study all 7 days in a week",             emoji:"📅",  category:"consistency", rarity:"rare"      },
  { id:"perfect_month", name:"Perfect Month",   description:"Study all 28+ days in a month",          emoji:"🗓️", category:"consistency", rarity:"epic"      },
  { id:"early_bird",    name:"Early Bird",      description:"3 sessions before 7 AM",                 emoji:"🌅",  category:"consistency", rarity:"rare"      },
  { id:"night_owl",     name:"Night Owl",       description:"3 sessions after 11 PM",                 emoji:"🦉",  category:"consistency", rarity:"rare"      },

  // ── GD ─────────────────────────────────────────────────────────────────
  { id:"gd_first",     name:"First Voice",      description:"Log your first GD session",              emoji:"🎤",  category:"gd",          rarity:"common"    },
  { id:"gd_10",        name:"Debater",          description:"Log 10 GD sessions",                     emoji:"🗣️", category:"gd",          rarity:"common"    },
  { id:"gd_initiated5",name:"Topic Starter",    description:"Initiate the topic in 5 GD sessions",    emoji:"📣",  category:"gd",          rarity:"rare"      },
  { id:"gd_score8",    name:"Star Speaker",     description:"Score 8+ in a GD session",               emoji:"⭐",  category:"gd",          rarity:"common"    },

  // ── Social ─────────────────────────────────────────────────────────────
  { id:"friend_first", name:"Making Friends",   description:"Add your first friend",                  emoji:"🤝",  category:"social",      rarity:"common"    },
  { id:"gift_first",   name:"Generous",         description:"Send your first coin gift",              emoji:"🎁",  category:"social",      rarity:"common"    },
  { id:"gift_10",      name:"Patron",           description:"Send 10 coin gifts",                     emoji:"🎁🎁", category:"social",     rarity:"rare"      },

  // ── Special ────────────────────────────────────────────────────────────
  { id:"day_one",      name:"Day One",          description:"Log your very first session",            emoji:"🐣",  category:"special",     rarity:"common"    },
  { id:"comeback",     name:"Comeback Kid",     description:"Return after a 7+ day gap",              emoji:"🌊",  category:"special",     rarity:"rare"      },
  { id:"flow_state",   name:"Flow State",       description:"90+ min session with max focus, 5 stars",emoji:"🌀",  category:"special",     rarity:"epic"      },
  { id:"xp_1000",      name:"XP Milestone",     description:"Earn 1,000 total XP",                   emoji:"⚡",  category:"special",     rarity:"common"    },
  { id:"xp_10000",     name:"XP Legend",        description:"Earn 10,000 total XP",                  emoji:"💫",  category:"special",     rarity:"epic"      },
];

/** Check all badge conditions and award any newly unlocked badges. Returns list of newly earned. */
export async function checkAndAwardBadges(userId: string): Promise<BadgeDef[]> {
  const [
    user, allSessions, streaks, gdSessions, friendships, sentCoins, earnedBadges,
  ] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { xp: true, createdAt: true } }),
    db.studySession.findMany({ where: { userId }, select: { category: true, durationMinutes: true, selfRating: true, startTime: true, metadata: true } }),
    db.streak.findMany({ where: { userId } }),
    db.gDSession.findMany({ where: { userId }, select: { score: true, initiated: true } }),
    db.friendship.findMany({ where: { userId } }),
    db.coinTransaction.findMany({ where: { fromUserId: userId } }),
    db.earnedBadge.findMany({ where: { userId }, select: { badgeId: true } }),
  ]);

  const earned = new Set(earnedBadges.map((b) => b.badgeId));
  const newBadges: BadgeDef[] = [];

  const tryAward = async (badgeId: string) => {
    if (earned.has(badgeId)) return;
    const def = ALL_BADGES.find((b) => b.id === badgeId);
    if (!def) return;
    await db.earnedBadge.create({ data: { userId, badgeId } }).catch(() => {});
    earned.add(badgeId);
    newBadges.push(def);
  };

  // Helpers
  const parseMeta = (raw: string | null) => { try { return raw ? JSON.parse(raw) : {}; } catch { return {}; } };
  const totalSessions = allSessions.length;
  const totalMins     = allSessions.reduce((s, x) => s + x.durationMinutes, 0);
  const dsaSessions   = allSessions.filter((s) => s.category === "DSA");
  const dsaProblems   = dsaSessions.reduce((sum, s) => sum + (Number(parseMeta(s.metadata).count) || 0), 0);
  const hardProblems  = dsaSessions.filter((s) => parseMeta(s.metadata).difficulty?.toLowerCase() === "hard")
    .reduce((sum, s) => sum + (Number(parseMeta(s.metadata).count) || 1), 0);
  const maxStreak     = Math.max(0, ...streaks.map((s) => s.bestStreak));
  const currentMaxStreak = Math.max(0, ...streaks.map((s) => s.currentStreak));
  const xp            = user?.xp ?? 0;

  // Day one
  if (totalSessions >= 1) await tryAward("day_one");

  // Streaks
  if (currentMaxStreak >= 3   || maxStreak >= 3)   await tryAward("streak_3");
  if (currentMaxStreak >= 7   || maxStreak >= 7)   await tryAward("streak_7");
  if (currentMaxStreak >= 14  || maxStreak >= 14)  await tryAward("streak_14");
  if (currentMaxStreak >= 30  || maxStreak >= 30)  await tryAward("streak_30");
  if (currentMaxStreak >= 60  || maxStreak >= 60)  await tryAward("streak_60");
  if (currentMaxStreak >= 100 || maxStreak >= 100) await tryAward("streak_100");

  // DSA problems
  if (dsaProblems >= 10)  await tryAward("dsa_10");
  if (dsaProblems >= 50)  await tryAward("dsa_50");
  if (dsaProblems >= 100) await tryAward("dsa_100");
  if (dsaProblems >= 250) await tryAward("dsa_250");
  if (hardProblems >= 10) await tryAward("dsa_hard10");
  if (hardProblems >= 25) await tryAward("dsa_hard25");

  // Volume
  if (totalSessions >= 10)  await tryAward("sessions_10");
  if (totalSessions >= 50)  await tryAward("sessions_50");
  if (totalSessions >= 100) await tryAward("sessions_100");
  if (totalSessions >= 500) await tryAward("sessions_500");
  if (totalMins >= 600)     await tryAward("hours_10");
  if (totalMins >= 3000)    await tryAward("hours_50");
  if (totalMins >= 6000)    await tryAward("hours_100");

  // GD badges
  if (gdSessions.length >= 1) await tryAward("gd_first");
  if (gdSessions.length >= 10) await tryAward("gd_10");
  if (gdSessions.filter((s) => s.initiated).length >= 5) await tryAward("gd_initiated5");
  if (gdSessions.some((s) => (s.score ?? 0) >= 8)) await tryAward("gd_score8");

  // Social
  if (friendships.length >= 1) await tryAward("friend_first");
  if (sentCoins.length >= 1)  await tryAward("gift_first");
  if (sentCoins.length >= 10) await tryAward("gift_10");

  // XP milestones
  if (xp >= 1000)  await tryAward("xp_1000");
  if (xp >= 10000) await tryAward("xp_legend");

  // Time-based special
  const earlyBirds = allSessions.filter((s) => new Date(s.startTime).getHours() < 7).length;
  const nightOwls  = allSessions.filter((s) => new Date(s.startTime).getHours() >= 23).length;
  if (earlyBirds >= 3) await tryAward("early_bird");
  if (nightOwls  >= 3) await tryAward("night_owl");

  // Flow state: 90+ min, distraction=1, 5 stars
  const flowSession = allSessions.find((s) =>
    s.durationMinutes >= 90 && s.selfRating === 5 &&
    Number(parseMeta(s.metadata).distractionLevel) === 1
  );
  if (flowSession) await tryAward("flow_state");

  // Perfect week: check last 7 days
  const now     = new Date();
  const days7   = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - i); return d.toDateString();
  });
  const activeDays = new Set(allSessions.map((s) => new Date(s.startTime).toDateString()));
  if (days7.every((d) => activeDays.has(d))) await tryAward("perfect_week");

  return newBadges;
}
