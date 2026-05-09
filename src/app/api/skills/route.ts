import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export const DSA_TOPICS = [
  "Arrays", "Strings", "Linked List", "Stack", "Queue",
  "Binary Search", "Two Pointers", "Sliding Window",
  "Recursion", "Backtracking",
  "Trees", "Binary Search Tree", "Trie",
  "Graphs", "BFS / DFS", "Union Find",
  "Dynamic Programming", "Greedy", "Divide & Conquer",
  "Heap / Priority Queue", "Hash Map",
  "Sorting", "Bit Manipulation", "Math",
  "Matrix", "Intervals", "Segment Tree", "Monotonic Stack",
] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const skills = await db.dSASkill.findMany({ where: { userId } });

  // Return all 28 topics, filling in level 0 for unrated ones
  const grid = DSA_TOPICS.map((topic) => {
    const existing = skills.find((s) => s.topic === topic);
    return {
      topic,
      level:         existing?.level ?? 0,
      practiceCount: existing?.practiceCount ?? 0,
      lastPracticed: existing?.lastPracticed ?? null,
    };
  });

  const summary = {
    mastered:    grid.filter((s) => s.level === 4).length,
    strong:      grid.filter((s) => s.level === 3).length,
    comfortable: grid.filter((s) => s.level === 2).length,
    practicing:  grid.filter((s) => s.level === 1).length,
    unexplored:  grid.filter((s) => s.level === 0).length,
    overallPct:  Math.round((grid.reduce((sum, s) => sum + s.level, 0) / (DSA_TOPICS.length * 4)) * 100),
  };

  return NextResponse.json({ grid, summary });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic, level } = await req.json();
  if (!topic || level === undefined || level < 0 || level > 4) {
    return NextResponse.json({ error: "topic and level (0-4) required" }, { status: 400 });
  }

  const skill = await db.dSASkill.upsert({
    where:  { userId_topic: { userId, topic } },
    update: { level: Number(level), practiceCount: { increment: level > 0 ? 1 : 0 }, lastPracticed: level > 0 ? new Date() : undefined },
    create: { userId, topic, level: Number(level), practiceCount: level > 0 ? 1 : 0, lastPracticed: level > 0 ? new Date() : null },
  });

  return NextResponse.json(skill);
}
