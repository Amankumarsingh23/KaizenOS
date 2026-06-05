import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json(null);
    const userId = await getUserId(session);
    if (!userId) return NextResponse.json(null);

    const active = await db.activeSession.findUnique({ where: { userId } });
    return NextResponse.json(active);
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { category, startedAt, lastResumedAt, baseElapsed, isPaused } = await req.json();

    const active = await db.activeSession.upsert({
      where: { userId },
      create: {
        userId,
        category,
        startedAt:     new Date(startedAt),
        lastResumedAt: new Date(lastResumedAt),
        baseElapsed:   baseElapsed ?? 0,
        isPaused:      isPaused    ?? false,
      },
      update: {
        category,
        startedAt:     new Date(startedAt),
        lastResumedAt: new Date(lastResumedAt),
        baseElapsed:   baseElapsed ?? 0,
        isPaused:      isPaused    ?? false,
      },
    });
    return NextResponse.json(active);
  } catch (err) {
    console.error("[/api/sessions/active PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ ok: true });
    const userId = await getUserId(session);
    if (!userId) return NextResponse.json({ ok: true });

    await db.activeSession.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // best-effort
  }
}
