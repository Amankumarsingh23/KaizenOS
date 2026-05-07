import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { milestoneId } = await params;

  const ms = await db.milestone.findFirst({ where: { id: milestoneId, userId } });
  if (!ms) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.title       !== undefined) data.title       = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.phase       !== undefined) data.phase       = body.phase;
  if (body.startDate   !== undefined) data.startDate   = body.startDate ? new Date(body.startDate) : null;
  if (body.targetDate  !== undefined) data.targetDate  = new Date(body.targetDate);
  if (body.status      !== undefined) {
    data.status = body.status;
    if (body.status === "COMPLETED" && !ms.completedDate) {
      data.completedDate = new Date();
    }
    if (body.status !== "COMPLETED") {
      data.completedDate = null;
    }
  }

  const updated = await db.milestone.update({ where: { id: milestoneId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { milestoneId } = await params;

  const ms = await db.milestone.findFirst({ where: { id: milestoneId, userId } });
  if (!ms) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.milestone.delete({ where: { id: milestoneId } });
  return NextResponse.json({ ok: true });
}
