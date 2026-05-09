import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

const STATUS_ORDER = [
  "APPLIED","OA_RECEIVED","OA_SUBMITTED",
  "INTERVIEW_R1","INTERVIEW_R2","INTERVIEW_R3","HR_ROUND",
  "OFFER_RECEIVED","REJECTED","WITHDRAWN",
] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companies = await db.company.findMany({
    where: { userId },
    include: { rounds: true },
    orderBy: { appliedDate: "asc" },
  });

  // ── Funnel ─────────────────────────────────────────────────────────────────
  const funnel = [
    { stage: "Applied",    count: companies.length },
    { stage: "OA",         count: companies.filter((c) => ["OA_RECEIVED","OA_SUBMITTED","INTERVIEW_R1","INTERVIEW_R2","INTERVIEW_R3","HR_ROUND","OFFER_RECEIVED"].includes(c.status)).length },
    { stage: "Interview",  count: companies.filter((c) => ["INTERVIEW_R1","INTERVIEW_R2","INTERVIEW_R3","HR_ROUND","OFFER_RECEIVED"].includes(c.status)).length },
    { stage: "Offer",      count: companies.filter((c) => c.status === "OFFER_RECEIVED").length },
  ];

  // ── By status ──────────────────────────────────────────────────────────────
  const byStatus = STATUS_ORDER.map((s) => ({
    status: s.replace(/_/g, " "),
    count: companies.filter((c) => c.status === s).length,
  })).filter((x) => x.count > 0);

  // ── By source ──────────────────────────────────────────────────────────────
  const sourceMap: Record<string, { total: number; offers: number }> = {};
  for (const c of companies) {
    const src = c.source ?? "Unknown";
    if (!sourceMap[src]) sourceMap[src] = { total: 0, offers: 0 };
    sourceMap[src].total++;
    if (c.status === "OFFER_RECEIVED") sourceMap[src].offers++;
  }
  const bySource = Object.entries(sourceMap).map(([source, { total, offers }]) => ({
    source,
    total,
    offers,
    rate: total > 0 ? Math.round((offers / total) * 100) : 0,
  }));

  // ── Timeline (applications per week) ───────────────────────────────────────
  const weekMap: Record<string, number> = {};
  for (const c of companies) {
    const d = new Date(c.appliedDate);
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = mon.toISOString().slice(0, 10);
    weekMap[key] = (weekMap[key] ?? 0) + 1;
  }
  const timeline = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // ── Round conversion rates ──────────────────────────────────────────────────
  const allRounds = companies.flatMap((c) => c.rounds);
  const roundStats = ["OA","TECHNICAL","SYSTEM_DESIGN","HR","MANAGERIAL"].map((type) => {
    const rounds = allRounds.filter((r) => r.type === type);
    const cleared = rounds.filter((r) => r.outcome === "CLEARED").length;
    return {
      type,
      total:   rounds.length,
      cleared,
      rate:    rounds.length > 0 ? Math.round((cleared / rounds.length) * 100) : 0,
    };
  }).filter((r) => r.total > 0);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const active    = companies.filter((c) => !["OFFER_RECEIVED","REJECTED","WITHDRAWN"].includes(c.status)).length;
  const offers    = companies.filter((c) => c.status === "OFFER_RECEIVED").length;
  const rejected  = companies.filter((c) => c.status === "REJECTED").length;
  const offerRate = companies.length > 0 ? Math.round((offers / companies.length) * 100) : 0;

  return NextResponse.json({
    summary:    { total: companies.length, active, offers, rejected, offerRate },
    funnel,
    byStatus,
    bySource,
    timeline,
    roundStats,
  });
}
