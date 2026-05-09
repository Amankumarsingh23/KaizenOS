import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { format, subDays } from "date-fns";

interface GHEvent {
  type: string;
  created_at: string;
  repo: { name: string };
  payload: {
    commits?: { message: string; sha: string }[];
    size?: number;
  };
}

function ghHeaders(pat?: string | null) {
  const h: Record<string, string> = {
    "Accept":     "application/vnd.github+json",
    "User-Agent": "KaizenOS/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (pat) h["Authorization"] = `Bearer ${pat}`;
  return h;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.userSettings.findUnique({ where: { userId } });
  const handle   = settings?.githubUsername?.trim();
  if (!handle) return NextResponse.json({ handle: null });

  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(handle)}/events/public?per_page=100`,
      { headers: ghHeaders(), next: { revalidate: 600 } }
    );
    if (res.status === 404) return NextResponse.json({ error: "GitHub user not found", handle }, { status: 404 });
    if (!res.ok)            return NextResponse.json({ error: "GitHub API error" }, { status: 502 });

    const events: GHEvent[] = await res.json();

    // Only care about push events (actual commits)
    const pushes = events.filter((e) => e.type === "PushEvent");

    // Build 30-day contribution map
    const calMap: Record<string, number> = {};
    const repoMap: Record<string, number> = {};

    for (const e of pushes) {
      const day    = format(new Date(e.created_at), "yyyy-MM-dd");
      const count  = e.payload.commits?.length ?? e.payload.size ?? 1;
      calMap[day]  = (calMap[day]  ?? 0) + count;
      repoMap[e.repo.name] = (repoMap[e.repo.name] ?? 0) + count;
    }

    const since30 = subDays(new Date(), 30);
    const since7  = subDays(new Date(), 7);

    const calendar = Array.from({ length: 30 }, (_, i) => {
      const d   = subDays(new Date(), 29 - i);
      const key = format(d, "yyyy-MM-dd");
      const dow = (d.getDay() + 6) % 7;
      return { date: key, count: calMap[key] ?? 0, dow };
    });

    const totalThisWeek  = pushes
      .filter((e) => new Date(e.created_at) >= since7)
      .reduce((sum, e) => sum + (e.payload.commits?.length ?? 1), 0);
    const totalThisMonth = pushes
      .filter((e) => new Date(e.created_at) >= since30)
      .reduce((sum, e) => sum + (e.payload.commits?.length ?? 1), 0);

    // Streak: consecutive days with activity
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if ((calMap[d] ?? 0) > 0) streak++;
      else break;
    }

    // Most active repos
    const topRepos = Object.entries(repoMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([repo, commits]) => ({ repo, commits }));

    // Recent commits (last 8)
    const recentCommits = pushes.slice(0, 10).flatMap((e) =>
      (e.payload.commits ?? []).slice(0, 2).map((c) => ({
        repo:    e.repo.name.split("/")[1],
        message: c.message.split("\n")[0].slice(0, 70),
        sha:     c.sha.slice(0, 7),
        date:    e.created_at,
      }))
    ).slice(0, 8);

    return NextResponse.json({
      handle,
      totalThisWeek,
      totalThisMonth,
      streak,
      topRepos,
      recentCommits,
      calendar,
    });
  } catch {
    return NextResponse.json({ error: "Failed to reach GitHub API" }, { status: 502 });
  }
}
