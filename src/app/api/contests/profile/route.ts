import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

const CF = "https://codeforces.com/api";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.userSettings.findUnique({ where: { userId } });
  const handle   = settings?.cfHandle?.trim();

  if (!handle) return NextResponse.json({ handle: null });

  try {
    const [infoRes, ratingRes] = await Promise.all([
      fetch(`${CF}/user.info?handles=${encodeURIComponent(handle)}`, { next: { revalidate: 600 } }),
      fetch(`${CF}/user.rating?handle=${encodeURIComponent(handle)}`, { next: { revalidate: 600 } }),
    ]);

    const [infoJson, ratingJson] = await Promise.all([infoRes.json(), ratingRes.json()]);

    if (infoJson.status !== "OK") {
      return NextResponse.json({ error: `CF handle "${handle}" not found`, handle }, { status: 404 });
    }

    const info = infoJson.result[0];
    const ratingHistory: {
      contestId: number; contestName: string;
      rank: number; ratingUpdateTimeSeconds: number;
      oldRating: number; newRating: number;
    }[] = ratingJson.status === "OK" ? ratingJson.result : [];

    // Last 20 contests for the chart, most recent first
    const recentContests = [...ratingHistory]
      .sort((a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds)
      .slice(0, 20)
      .reverse(); // chronological for chart

    return NextResponse.json({
      handle,
      rating:       info.rating      ?? 0,
      maxRating:    info.maxRating   ?? 0,
      rank:         info.rank        ?? "unrated",
      maxRank:      info.maxRank     ?? "unrated",
      contribution: info.contribution ?? 0,
      totalContests: ratingHistory.length,
      recentContests: recentContests.map((c) => ({
        contestId:   c.contestId,
        contestName: c.contestName.replace(/Codeforces /i, "CF "),
        rank:        c.rank,
        oldRating:   c.oldRating,
        newRating:   c.newRating,
        delta:       c.newRating - c.oldRating,
        date:        new Date(c.ratingUpdateTimeSeconds * 1000).toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to reach Codeforces API" }, { status: 502 });
  }
}
