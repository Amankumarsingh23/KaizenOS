import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

interface GHCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let repo = searchParams.get("repo") ?? "";
  // Accept full GitHub URLs: https://github.com/owner/repo or owner/repo
  repo = repo.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "").trim();
  if (!repo || !repo.includes("/")) {
    return NextResponse.json({ error: "Invalid repo — use 'owner/repo' or paste the GitHub URL" }, { status: 400 });
  }

  try {
    const [commitsRes, repoRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${repo}/commits?per_page=20`,
        { headers: { "Accept":"application/vnd.github+json","User-Agent":"KaizenOS/1.0" }, next: { revalidate: 300 } }
      ),
      fetch(
        `https://api.github.com/repos/${repo}`,
        { headers: { "Accept":"application/vnd.github+json","User-Agent":"KaizenOS/1.0" }, next: { revalidate: 600 } }
      ),
    ]);

    if (!commitsRes.ok) return NextResponse.json({ error: "Repo not found or private", repo }, { status: 404 });

    const commits: GHCommit[] = await commitsRes.json();
    const repoData = repoRes.ok ? await repoRes.json() : null;

    // Commits per day for last 30 days
    const dayMap: Record<string, number> = {};
    for (const c of commits) {
      const day = c.commit.author.date.slice(0, 10);
      dayMap[day] = (dayMap[day] ?? 0) + 1;
    }

    const now = new Date();
    const since7 = new Date(now.getTime() - 7 * 86_400_000);
    const commitsThisWeek = commits.filter((c) => new Date(c.commit.author.date) >= since7).length;

    return NextResponse.json({
      repo,
      stars:       repoData?.stargazers_count   ?? 0,
      forks:       repoData?.forks_count         ?? 0,
      language:    repoData?.language            ?? null,
      description: repoData?.description        ?? null,
      htmlUrl:     repoData?.html_url            ?? `https://github.com/${repo}`,
      commitsThisWeek,
      totalFetched: commits.length,
      lastCommitAt: commits[0]?.commit.author.date ?? null,
      recentCommits: commits.slice(0, 10).map((c) => ({
        sha:     c.sha.slice(0, 7),
        message: c.commit.message.split("\n")[0].slice(0, 80),
        date:    c.commit.author.date,
        url:     c.html_url,
      })),
      activity: Object.entries(dayMap).map(([date, count]) => ({ date, count })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to reach GitHub API" }, { status: 502 });
  }
}
