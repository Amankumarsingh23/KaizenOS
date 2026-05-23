import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { format, subDays } from "date-fns";

// ── CF tag → our DSA Skill Map topic ─────────────────────────────────────────
export const TAG_MAP: Record<string, string> = {
  "dp":                     "Dynamic Programming",
  "graphs":                 "Graphs",
  "trees":                  "Trees",
  "binary search":          "Binary Search",
  "greedy":                 "Greedy",
  "two pointers":           "Two Pointers",
  "sorting":                "Sorting",
  "math":                   "Math",
  "strings":                "Strings",
  "data structures":        "Stack",
  "bitmasks":               "Bit Manipulation",
  "number theory":          "Math",
  "dfs and similar":        "BFS / DFS",
  "shortest paths":         "Graphs",
  "divide and conquer":     "Divide & Conquer",
  "sliding window":         "Sliding Window",
  "hashing":                "Hash Map",
  "recursion":              "Recursion",
  "backtracking":           "Backtracking",
  "brute force":            "Recursion",
  "segment tree":           "Segment Tree",
  "disjoint sets":          "Union Find",
  "heaps":                  "Heap / Priority Queue",
  "matrices":               "Matrix",
  "implementation":         "Arrays",
};

// Solved count thresholds → skill level
function solvedToLevel(count: number): number {
  if (count === 0)   return 0;
  if (count <= 5)    return 1;
  if (count <= 20)   return 2;
  if (count <= 50)   return 3;
  return 4;
}

// Difficulty bucket label
function diffBucket(rating: number): string {
  if (rating <  1000) return "< 1000";
  if (rating <  1200) return "1000";
  if (rating <  1400) return "1200";
  if (rating <  1600) return "1400";
  if (rating <  1800) return "1600";
  if (rating <  2000) return "1800";
  if (rating <  2200) return "2000";
  if (rating <  2400) return "2200";
  return "2400+";
}

const DIFF_ORDER = ["< 1000","1000","1200","1400","1600","1800","2000","2200","2400+"];

interface Submission {
  id: number;
  verdict: string;
  creationTimeSeconds: number;
  problem: {
    rating?: number;
    tags: string[];
    name: string;
    contestId?: number;
  };
}

export async function GET() {
  try {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let settings;
  try {
    settings = await db.userSettings.findUnique({ where: { userId } });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const handle = settings?.cfHandle?.trim();
  if (!handle) return NextResponse.json({ handle: null });

  // Fetch last 10,000 submissions (enough for any active CP student)
  let submissions: Submission[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timeout);
    const json = await res.json();
    if (json.status !== "OK") return NextResponse.json({ error: "CF handle not found", handle }, { status: 404 });
    submissions = json.result as Submission[];
  } catch (err) {
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Codeforces API timed out"
      : "Failed to reach Codeforces API";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const accepted = submissions.filter((s) => s.verdict === "OK");

  // De-duplicate: only count each problem once (use problem name as key)
  const solvedProblems = new Map<string, Submission>();
  for (const s of accepted) {
    const key = `${s.problem.contestId ?? "x"}-${s.problem.name}`;
    if (!solvedProblems.has(key)) solvedProblems.set(key, s);
  }
  const uniqueSolved = Array.from(solvedProblems.values());

  // ── Difficulty breakdown ────────────────────────────────────────────────────
  const diffMap: Record<string, number> = {};
  for (const s of uniqueSolved) {
    if (!s.problem.rating) continue;
    const b = diffBucket(s.problem.rating);
    diffMap[b] = (diffMap[b] ?? 0) + 1;
  }
  const difficultyBreakdown = DIFF_ORDER.map((label) => ({
    label,
    count: diffMap[label] ?? 0,
  }));

  // ── Tag performance ─────────────────────────────────────────────────────────
  const tagMap: Record<string, number> = {};
  for (const s of uniqueSolved) {
    for (const tag of s.problem.tags) {
      tagMap[tag] = (tagMap[tag] ?? 0) + 1;
    }
  }
  const tagPerformance = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => ({ tag, count, mapped: TAG_MAP[tag] ?? null }));

  // ── Skill map suggestions (tags mapped to our DSA topics) ──────────────────
  const skillSuggestions: Record<string, { count: number; level: number }> = {};
  for (const [tag, count] of Object.entries(tagMap)) {
    const topic = TAG_MAP[tag];
    if (!topic) continue;
    if (!skillSuggestions[topic] || skillSuggestions[topic].count < count) {
      skillSuggestions[topic] = { count, level: solvedToLevel(count) };
    }
  }

  // ── Submission calendar (last 365 days) ────────────────────────────────────
  const since365 = subDays(new Date(), 365).getTime() / 1000;
  const calMap: Record<string, number> = {};
  for (const s of submissions) {
    if (s.creationTimeSeconds < since365) continue;
    const day = format(new Date(s.creationTimeSeconds * 1000), "yyyy-MM-dd");
    calMap[day] = (calMap[day] ?? 0) + 1;
  }

  // Build last 365 days array (for heatmap)
  const calendar = Array.from({ length: 365 }, (_, i) => {
    const d   = subDays(new Date(), 364 - i);
    const key = format(d, "yyyy-MM-dd");
    const dow = (d.getDay() + 6) % 7; // 0=Mon
    return { date: key, count: calMap[key] ?? 0, dow };
  });

  // ── Streak (current consecutive days with at least 1 submission) ──────────
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d   = format(subDays(new Date(), i), "yyyy-MM-dd");
    if ((calMap[d] ?? 0) > 0) streak++;
    else break;
  }

  return NextResponse.json({
    handle,
    totalSubmissions: submissions.length,
    totalSolved:      uniqueSolved.length,
    acceptanceRate:   submissions.length > 0
      ? Math.round((uniqueSolved.length / submissions.length) * 100) : 0,
    currentStreak:    streak,
    difficultyBreakdown,
    tagPerformance,
    skillSuggestions,
    calendar,
  });
  } catch (err) {
    console.error("[/api/contests/problems]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
