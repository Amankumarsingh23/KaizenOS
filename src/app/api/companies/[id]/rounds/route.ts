import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: companyId } = await params;
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company || company.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { type, date, duration, outcome, notes } = await req.json();
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  const round = await db.companyRound.create({
    data: {
      companyId,
      type,
      date:     date ? new Date(date) : null,
      duration: duration ? Number(duration) : null,
      outcome:  outcome ?? "PENDING",
      notes:    notes?.trim() ?? null,
    },
  });

  return NextResponse.json(round, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: companyId } = await params;
  const body = await req.json();
  const { roundId, ...rest } = body;

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company || company.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const round = await db.companyRound.findUnique({ where: { id: roundId } });
  if (!round || round.companyId !== companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.companyRound.update({
    where: { id: roundId },
    data: {
      outcome:  rest.outcome  ?? round.outcome,
      date:     rest.date ? new Date(rest.date) : round.date,
      duration: rest.duration ? Number(rest.duration) : round.duration,
      notes:    rest.notes?.trim() ?? round.notes,
    },
  });

  return NextResponse.json(updated);
}
