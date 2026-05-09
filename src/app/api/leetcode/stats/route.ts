import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { format, subDays } from "date-fns";

const LC_GQL = "https://leetcode.com/graphql";

const STATS_QUERY = `
  query userProfile($username: String!) {
    matchedUser(username: $username) {
      profile { ranking }
      submitStats: submitStatsGlobal {
        acSubmissionNum { difficulty count submissions }
        totalSubmissionNum { difficulty count submissions }
      }
    }
  }
`;

const CALENDAR_QUERY = `
  query userActivityCalendar($username: String!, $year: Int!) {
    matchedUser(username: $username) {
      userCalendar(year: $year) {
        streak
        totalActiveDays
        submissionCalendar
      }
    }
  }
`;

const RECENT_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id title titleSlug timestamp
    }
  }
`;

async function lcFetch(query: string, variables: Record<string, unknown>) {
  const res = await fetch(LC_GQL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Referer":       "https://leetcode.com",
      "User-Agent":    "Mozilla/5.0",
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`LC API ${res.status}`);
  return res.json();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.userSettings.findUnique({ where: { userId } });
  const handle   = settings?.lcHandle?.trim();
  if (!handle) return NextResponse.json({ handle: null });

  const year = new Date().getFullYear();

  try {
    const [statsJson, calJson, recentJson] = await Promise.all([
      lcFetch(STATS_QUERY,    { username: handle }),
      lcFetch(CALENDAR_QUERY, { username: handle, year }),
      lcFetch(RECENT_QUERY,   { username: handle, limit: 10 }),
    ]);

    const user = statsJson.data?.matchedUser;
    if (!user) return NextResponse.json({ error: `LeetCode user "${handle}" not found`, handle }, { status: 404 });

    const acNums: { difficulty: string; count: number; submissions: number }[] =
      user.submitStats?.acSubmissionNum ?? [];
    const totNums: { difficulty: string; count: number; submissions: number }[] =
      user.submitStats?.totalSubmissionNum ?? [];

    const byDiff = (arr: typeof acNums, diff: string) =>
      arr.find((x) => x.difficulty === diff);

    const easy   = byDiff(acNums, "Easy");
    const medium = byDiff(acNums, "Medium");
    const hard   = byDiff(acNums, "Hard");
    const all    = byDiff(acNums, "All");
    const totAll = byDiff(totNums, "All");

    const calendar    = calJson.data?.matchedUser?.userCalendar;
    const calendarRaw: Record<string, number> =
      JSON.parse(calendar?.submissionCalendar ?? "{}");

    // Build 30-day heatmap
    const calMap: Record<string, number> = {};
    for (const [ts, count] of Object.entries(calendarRaw)) {
      const day = format(new Date(Number(ts) * 1000), "yyyy-MM-dd");
      calMap[day] = count;
    }
    const heatmap = Array.from({ length: 30 }, (_, i) => {
      const d   = subDays(new Date(), 29 - i);
      const key = format(d, "yyyy-MM-dd");
      const dow = (d.getDay() + 6) % 7;
      return { date: key, count: calMap[key] ?? 0, dow };
    });

    const recentAC = (recentJson.data?.recentAcSubmissionList ?? []) as {
      id: string; title: string; titleSlug: string; timestamp: string;
    }[];

    return NextResponse.json({
      handle,
      ranking:        user.profile?.ranking ?? 0,
      totalSolved:    all?.count     ?? 0,
      totalSubmissions: totAll?.count ?? 0,
      acceptanceRate: totAll?.count && totAll.submissions
        ? Math.round((totAll.count / totAll.submissions) * 100) : 0,
      streak:         calendar?.streak           ?? 0,
      totalActiveDays: calendar?.totalActiveDays ?? 0,
      easy:   { solved: easy?.count   ?? 0, submissions: easy?.submissions   ?? 0 },
      medium: { solved: medium?.count ?? 0, submissions: medium?.submissions ?? 0 },
      hard:   { solved: hard?.count   ?? 0, submissions: hard?.submissions   ?? 0 },
      heatmap,
      recentAC: recentAC.slice(0, 8).map((s) => ({
        id:        s.id,
        title:     s.title,
        titleSlug: s.titleSlug,
        date:      new Date(Number(s.timestamp) * 1000).toISOString(),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
