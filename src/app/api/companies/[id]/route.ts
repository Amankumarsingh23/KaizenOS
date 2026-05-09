import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });
  if (!company || company.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await db.company.update({
    where: { id },
    data: {
      name:        body.name?.trim()        ?? company.name,
      role:        body.role?.trim()        ?? company.role,
      source:      body.source?.trim()      ?? company.source,
      appliedDate: body.appliedDate ? new Date(body.appliedDate) : company.appliedDate,
      status:      body.status              ?? company.status,
      ctc:         body.ctc?.trim()         ?? company.ctc,
      resumeLabel: body.resumeLabel !== undefined ? (body.resumeLabel?.trim() ?? null) : company.resumeLabel,
      notes:       body.notes?.trim()       ?? company.notes,
    },
    include: { rounds: { orderBy: { createdAt: "asc" } } },
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
  const company = await db.company.findUnique({ where: { id } });
  if (!company || company.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.company.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
