import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content, mood, energy, screenTimeMins, pickupCount, weightKg, sleepHours, proteinGrams } = await req.json();

  if (!content?.trim() || !mood || !energy) {
    return NextResponse.json({ error: "content, mood, and energy required" }, { status: 400 });
  }

  const entry = await db.journalEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.journalEntry.update({
    where: { id },
    data: {
      content: content.trim(), mood: Number(mood), energy: Number(energy),
      ...(screenTimeMins != null && { screenTimeMins: Number(screenTimeMins) }),
      ...(pickupCount    != null && { pickupCount:    Number(pickupCount) }),
      ...(weightKg       != null && { weightKg:       Number(weightKg) }),
      ...(sleepHours     != null && { sleepHours:     Number(sleepHours) }),
      ...(proteinGrams   != null && { proteinGrams:   Number(proteinGrams) }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const entry = await db.journalEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.journalEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
