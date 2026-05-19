import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { groq } from "@/lib/ai";
import { format, subDays, startOfDay } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });

  const since14 = subDays(startOfDay(new Date()), 14);
  const [logs, reports] = await Promise.all([
    db.phoneUsageLog.findMany({ where: { userId, date: { gte: since14 } }, orderBy: { date: "asc" } }),
    db.dailyReport.findMany({ where: { userId, date: { gte: since14 } }, orderBy: { date: "asc" }, select: { date: true, overallScore: true } }),
  ]);

  if (logs.length < 3) return NextResponse.json({ error: "Need at least 3 days of phone data to generate insights" }, { status: 422 });

  const parse = (s: string) => { try { return JSON.parse(s); } catch { return []; } };

  const normalise = (s: number) => s <= 10 ? s * 10 : s;
  const reportMap = new Map(reports.map((r) => [format(new Date(r.date), "yyyy-MM-dd"), normalise(r.overallScore)]));

  const daysText = logs.map((l) => {
    const score = reportMap.get(format(new Date(l.date), "yyyy-MM-dd"));
    const apps  = parse(l.topApps) as { name: string; mins: number }[];
    const topApp = apps[0]?.name ?? "unknown";
    return `${format(new Date(l.date), "EEE d MMM")}: ${Math.round(l.totalMins/60*10)/10}h screen · ${l.unlockCount} unlocks · top: ${topApp}${score != null ? ` · study score: ${score}/100` : ""}`;
  }).join("\n");

  const prompt = `You are a brutally honest digital wellness coach for a student preparing for placements in India.

Here is their phone usage data for the last ${logs.length} days:
${daysText}

Generate insights in exactly this JSON format (raw JSON, no markdown fences):
{
  "topKiller": "Name of the single biggest time-wasting app and WHY it's killing their productivity",
  "correlationInsight": "One insight about the relationship between screen time and study score — be specific with numbers",
  "unlockInsight": "What their unlock count pattern reveals about their compulsive phone checking behaviour",
  "improvingOrNot": "honest 1-sentence assessment of whether they are improving or not over this period",
  "actionPlan": ["specific blocker/habit action 1", "specific blocker/habit action 2", "specific blocker/habit action 3"],
  "motivationalTruth": "One harsh but motivating truth they need to hear about their phone addiction and placement readiness"
}`;

  try {
    const res  = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });
    const raw  = res.choices[0]?.message?.content?.trim() ?? "";
    const clean = raw.replace(/^```(?:json)?\s*/im, "").replace(/```\s*$/im, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
